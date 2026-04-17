// 🚀 Automatic OTA deployment test - April 18, 2026
// This comment will be automatically pushed to users via OTA update

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
import { useFocusEffect } from '@react-navigation/native';
import { useFeedback } from '../../context/FeedbackContext';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../theme/ThemeContext';
import { useAdminSession } from '../../context/AdminSessionContext';
import { AdminLoginModal } from './AdminLoginModal';

const CATEGORIES = [
    { value: 'ALL', label: 'All' },
    { value: 'FEATURE_REQUEST', label: 'Features' },
    { value: 'BUG_REPORT', label: 'Bugs' },
    { value: 'GENERAL', label: 'General' }
];

const STATUSES = [
    { value: 'ALL', label: 'All' },
    { value: 'OPEN', label: 'Open' },
    { value: 'IN_PROGRESS', label: 'In Progress' },
    { value: 'RESOLVED', label: 'Resolved' }
];

export const FeedbackCommunityScreen = ({ navigation }: any) => {
    const { posts, loading, loadPosts, upvotePost } = useFeedback();
    const { user } = useAuth();
    const { colors } = useTheme();
    const { isAdminAuthenticated, setAdminSession, validateAdminSession } = useAdminSession();
    const [selectedCategory, setSelectedCategory] = useState('ALL');
    const [selectedStatus, setSelectedStatus] = useState('ALL');
    const [refreshing, setRefreshing] = useState(false);
    const [showAdminLogin, setShowAdminLogin] = useState(false);

    const handleAdminAccess = () => {
        if (isAdminAuthenticated && validateAdminSession(user?.role || '')) {
            // Admin session is valid for current role, go directly to admin hub
            navigation.navigate('AdminFeedbackHub');
        } else {
            // Either not authenticated or session invalid for current role, show login modal
            setShowAdminLogin(true);
        }
    };

    // Refresh posts when screen comes into focus (e.g., after creating a new post)
    useFocusEffect(
        React.useCallback(() => {
            loadPosts({ category: selectedCategory, status: selectedStatus });
        }, [selectedCategory, selectedStatus])
    );

    useEffect(() => {
        loadPosts({ category: selectedCategory, status: selectedStatus });
    }, [selectedCategory, selectedStatus]);

    const handleRefresh = async () => {
        setRefreshing(true);
        await loadPosts({ category: selectedCategory, status: selectedStatus });
        setRefreshing(false);
    };

    const handleUpvote = async (postId: string) => {
        try {
            await upvotePost(postId);
        } catch (error) {
            console.error('Upvote error:', error);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'OPEN': return '#FF9800';
            case 'IN_PROGRESS': return '#2196F3';
            case 'RESOLVED': return '#4CAF50';
            default: return '#666';
        }
    };

    const getCategoryIcon = (category: string) => {
        switch (category) {
            case 'FEATURE_REQUEST': return 'bulb-outline';
            case 'BUG_REPORT': return 'bug-outline';
            case 'GENERAL': return 'chatbubble-outline';
            default: return 'document-outline';
        }
    };

    const renderPost = ({ item }: any) => (
        <TouchableOpacity
            style={[styles.postCard, { backgroundColor: colors.surface }]}
            onPress={() => navigation.navigate('FeedbackDetail', { postId: item.id })}
        >
            <View style={styles.postHeader}>
                <View style={styles.categoryBadge}>
                    <Ionicons name={getCategoryIcon(item.category)} size={14} color={colors.primary} />
                    <Text style={[styles.categoryText, { color: colors.primary }]}>
                        {CATEGORIES.find(c => c.value === item.category)?.label || item.category}
                    </Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
                    <Text style={styles.statusText}>
                        {STATUSES.find(s => s.value === item.status)?.label || item.status}
                    </Text>
                </View>
            </View>

            <Text style={[styles.postTitle, { color: colors.text }]}>{item.title}</Text>
            <Text style={[styles.postContent, { color: colors.textSecondary }]} numberOfLines={2}>
                {item.content}
            </Text>

            <View style={styles.postFooter}>
                <View style={styles.authorInfo}>
                    <Ionicons name="person-circle-outline" size={16} color={colors.textTertiary} />
                    <Text style={[styles.authorText, { color: colors.textTertiary }]}>by {item.author.name}</Text>
                </View>

                <View style={styles.postStats}>
                    <TouchableOpacity
                        style={styles.statButton}
                        onPress={() => handleUpvote(item.id)}
                    >
                        <Ionicons
                            name={item.hasUpvoted ? 'arrow-up' : 'arrow-up-outline'}
                            size={18}
                            color={item.hasUpvoted ? colors.primary : colors.textSecondary}
                        />
                        <Text style={[styles.statText, { color: colors.textSecondary }, item.hasUpvoted && { color: colors.primary, fontWeight: '600' }]}>
                            {item.upvotes}
                        </Text>
                    </TouchableOpacity>

                    <View style={styles.statButton}>
                        <Ionicons name="chatbubble-outline" size={16} color={colors.textSecondary} />
                        <Text style={[styles.statText, { color: colors.textSecondary }]}>{item.commentCount}</Text>
                    </View>
                </View>
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={colors.primary} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Feedback Community</Text>
                <TouchableOpacity
                    style={styles.adminButton}
                    onPress={handleAdminAccess}
                >
                    <Text style={[styles.adminButtonText, { color: colors.primary }]}>AD</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.filterContainer}>
                <FlatList
                    horizontal
                    data={CATEGORIES}
                    keyExtractor={(item) => item.value}
                    showsHorizontalScrollIndicator={false}
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            style={[
                                styles.filterChip,
                                { backgroundColor: colors.background },
                                selectedCategory === item.value && { backgroundColor: colors.primary }
                            ]}
                            onPress={() => setSelectedCategory(item.value)}
                        >
                            <Text
                                style={[
                                    styles.filterChipText,
                                    { color: colors.textSecondary },
                                    selectedCategory === item.value && { color: '#fff', fontWeight: '600' }
                                ]}
                            >
                                {item.label}
                            </Text>
                        </TouchableOpacity>
                    )}
                />
            </View>

            <View style={[styles.filterContainer, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
                <FlatList
                    horizontal
                    data={STATUSES}
                    keyExtractor={(item) => item.value}
                    showsHorizontalScrollIndicator={false}
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            style={[
                                styles.filterChip,
                                { backgroundColor: colors.background },
                                selectedStatus === item.value && { backgroundColor: colors.primary }
                            ]}
                            onPress={() => setSelectedStatus(item.value)}
                        >
                            <Text
                                style={[
                                    styles.filterChipText,
                                    { color: colors.textSecondary },
                                    selectedStatus === item.value && { color: '#fff', fontWeight: '600' }
                                ]}
                            >
                                {item.label}
                            </Text>
                        </TouchableOpacity>
                    )}
                />
            </View>

            {loading && posts.length === 0 ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : (
                <FlatList
                    data={posts}
                    keyExtractor={(item) => item.id}
                    renderItem={renderPost}
                    contentContainerStyle={styles.listContent}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="chatbubbles-outline" size={64} color={colors.textTertiary} />
                            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No feedback posts yet</Text>
                        </View>
                    }
                />
            )}

            <TouchableOpacity
                style={[styles.fab, { backgroundColor: colors.primary }]}
                onPress={() => navigation.navigate('CreateFeedback')}
            >
                <Ionicons name="add" size={28} color="#fff" />
            </TouchableOpacity>

            <AdminLoginModal
                visible={showAdminLogin}
                onClose={() => setShowAdminLogin(false)}
                onSuccess={() => {
                    setShowAdminLogin(false);
                    navigation.navigate('AdminFeedbackHub');
                }}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5'
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
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1F3A5F',
        flex: 1,
        textAlign: 'center'
    },
    backButton: {
        padding: 8
    },
    adminButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: '#FFF5F0',
        borderRadius: 20
    },
    adminButtonText: {
        marginLeft: 4,
        fontSize: 14,
        fontWeight: '600',
        color: '#FF6B35'
    },
    filterContainer: {
        backgroundColor: '#fff',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0'
    },
    filterChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        marginRight: 8,
        backgroundColor: '#f0f0f0',
        borderRadius: 20
    },
    filterChipActive: {
        backgroundColor: '#1F3A5F'
    },
    filterChipText: {
        fontSize: 14,
        color: '#666'
    },
    filterChipTextActive: {
        color: '#fff',
        fontWeight: '600'
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
    categoryBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 4,
        backgroundColor: '#E8F0FE',
        borderRadius: 12
    },
    categoryText: {
        marginLeft: 4,
        fontSize: 12,
        color: '#1F3A5F',
        fontWeight: '600'
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
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0'
    },
    authorInfo: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    authorName: {
        marginLeft: 6,
        fontSize: 13,
        color: '#666'
    },
    authorText: {
        marginLeft: 6,
        fontSize: 13,
        color: '#666'
    },
    postStats: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    statButton: {
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: 16
    },
    statText: {
        marginLeft: 4,
        fontSize: 14,
        color: '#666'
    },
    upvotedText: {
        color: '#1F3A5F',
        fontWeight: '600'
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
        fontSize: 16,
        color: '#999'
    },
    fab: {
        position: 'absolute',
        right: 20,
        bottom: 90,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#FF6B35',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 10,
        zIndex: 999
    }
});
