import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    RefreshControl,
    ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFeedback } from '../../context/FeedbackContext';
import { useTheme } from '../../theme/ThemeContext';

const STATUSES = [
    { value: 'OPEN', label: 'Open' },
    { value: 'IN_PROGRESS', label: 'In Progress' },
    { value: 'RESOLVED', label: 'Resolved' }
];

export const MyFeedbackScreen = ({ navigation }: any) => {
    const { myPosts, loading, loadMyPosts } = useFeedback();
    const { colors } = useTheme();
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        loadMyPosts();
    }, []);

    const handleRefresh = async () => {
        setRefreshing(true);
        await loadMyPosts();
        setRefreshing(false);
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'OPEN': return '#FF9800';
            case 'IN_PROGRESS': return '#2196F3';
            case 'RESOLVED': return '#4CAF50';
            default: return '#666';
        }
    };

    const renderPost = ({ item }: any) => (
        <TouchableOpacity
            style={[styles.postCard, { backgroundColor: colors.surface }]}
            onPress={() => navigation.navigate('FeedbackDetail', { postId: item.id })}
        >
            <View style={styles.postHeader}>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
                    <Text style={styles.statusText}>
                        {STATUSES.find(s => s.value === item.status)?.label || item.status}
                    </Text>
                </View>
                <Text style={[styles.dateText, { color: colors.textTertiary }]}>
                    {new Date(item.createdAt).toLocaleDateString()}
                </Text>
            </View>

            <Text style={[styles.postTitle, { color: colors.text }]}>{item.title}</Text>
            <Text style={[styles.postContent, { color: colors.textSecondary }]} numberOfLines={2}>
                {item.content}
            </Text>

            <View style={styles.postFooter}>
                <View style={styles.statItem}>
                    <Ionicons name="arrow-up" size={16} color={colors.textSecondary} />
                    <Text style={[styles.statText, { color: colors.textSecondary }]}>{item.upvotes} upvotes</Text>
                </View>
                <View style={styles.statItem}>
                    <Ionicons name="chatbubble-outline" size={16} color={colors.textSecondary} />
                    <Text style={[styles.statText, { color: colors.textSecondary }]}>{item.commentCount} comments</Text>
                </View>
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={24} color={colors.primary} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>My Feedback</Text>
                <View style={{ width: 24 }} />
            </View>

            {loading && myPosts.length === 0 ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : (
                <FlatList
                    data={myPosts}
                    keyExtractor={(item) => item.id}
                    renderItem={renderPost}
                    contentContainerStyle={styles.listContent}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="document-text-outline" size={64} color={colors.textTertiary} />
                            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>You haven't submitted any feedback yet</Text>
                            <TouchableOpacity
                                style={[styles.createButton, { backgroundColor: colors.primary + '15' }]}
                                onPress={() => navigation.navigate('CreateFeedback')}
                            >
                                <Ionicons name="add-circle" size={20} color={colors.primary} />
                                <Text style={[styles.createButtonText, { color: colors.primary }]}>Create Feedback</Text>
                            </TouchableOpacity>
                        </View>
                    }
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0'
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1F3A5F'
    },
    listContent: {
        padding: 16
    },
    postCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3
    },
    postHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12
    },
    statusText: {
        fontSize: 12,
        color: '#fff',
        fontWeight: '600'
    },
    dateText: {
        fontSize: 12,
        color: '#999'
    },
    postTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 8
    },
    postContent: {
        fontSize: 14,
        color: '#666',
        lineHeight: 20,
        marginBottom: 12
    },
    postFooter: {
        flexDirection: 'row',
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0'
    },
    statItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 16
    },
    statText: {
        marginLeft: 4,
        fontSize: 13,
        color: '#666'
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center'
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 60
    },
    emptyText: {
        marginTop: 16,
        marginBottom: 24,
        fontSize: 16,
        color: '#999',
        textAlign: 'center'
    },
    createButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 12,
        backgroundColor: '#E8F0FE',
        borderRadius: 24
    },
    createButtonText: {
        marginLeft: 8,
        fontSize: 16,
        fontWeight: '600',
        color: '#1F3A5F'
    }
});
