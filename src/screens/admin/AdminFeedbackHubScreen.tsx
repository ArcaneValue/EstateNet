import React, { useEffect, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    RefreshControl,
    ActivityIndicator,
    Modal,
    Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { API_URL } from '../../config/api';
import { useAuth } from '../../context/AuthContext';
import { useAdminSession } from '../../context/AdminSessionContext';
import { useTheme } from '../../theme/ThemeContext';
import { apiDelete } from '../../utils/apiClient';
import { SecurityCodeModal } from './SecurityCodeModal';
import { CreateAdminModal } from './CreateAdminModal';

export const AdminFeedbackHubScreen = ({ navigation }: any) => {
    const { token, user } = useAuth();
    const { clearAdminSession, adminPermissions, validateAdminSession, isAdminAuthenticated } = useAdminSession();
    const { colors } = useTheme();
    const [analytics, setAnalytics] = useState<any>(null);
    const [posts, setPosts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedFilter, setSelectedFilter] = useState('ALL');
    const [showSettingsMenu, setShowSettingsMenu] = useState(false);
    const [showSecurityCode, setShowSecurityCode] = useState(false);
    const [showCreateAdmin, setShowCreateAdmin] = useState(false);
    const [deleteConfirmModal, setDeleteConfirmModal] = useState<{ visible: boolean; post: any; type: 'post' | 'comment' }>({ visible: false, post: null, type: 'post' });

    const loadData = async () => {
        // Validate admin session before making API calls
        if (!isAdminAuthenticated || !validateAdminSession(user?.role || '')) {
            console.warn('Admin session invalid for current role, redirecting to login');
            clearAdminSession();
            navigation.navigate('FeedbackCommunity');
            return;
        }

        try {
            const [analyticsRes, postsRes] = await Promise.all([
                fetch(`${API_URL}/admin/feedback/analytics`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }),
                fetch(`${API_URL}/admin/feedback/posts`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                })
            ]);

            const analyticsData = await analyticsRes.json();
            const postsData = await postsRes.json();

            if (analyticsData.success) {
                setAnalytics(analyticsData.data);
            }
            if (postsData.success) {
                setPosts(postsData.data.posts);
            }
        } catch (error) {
            console.error('Load admin data error:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    // Auto-refresh when screen comes into focus
    useFocusEffect(
        React.useCallback(() => {
            loadData();
        }, [])
    );

    const handleRefresh = async () => {
        setRefreshing(true);
        await loadData();
        setRefreshing(false);
    };

    const handleDeletePost = async (postId: string) => {
        try {
            const { status, json } = await apiDelete(`/admin/feedback/posts/${postId}`);
            if (status === 200 && json?.success) {
                // Remove post from local state
                setPosts(prev => prev.filter(post => post.id !== postId));
                // Reload analytics
                loadData();
                return true;
            }
            return false;
        } catch (error) {
            console.error('Delete post error:', error);
            return false;
        }
    };

    const handleDeleteComment = async (postId: string, commentId: string) => {
        try {
            const { status, json } = await apiDelete(`/admin/feedback/posts/${postId}/comments/${commentId}`);
            if (status === 200 && json?.success) {
                // Reload data to reflect changes
                loadData();
                return true;
            }
            return false;
        } catch (error) {
            console.error('Delete comment error:', error);
            return false;
        }
    };

    const confirmDelete = (post: any, type: 'post' | 'comment') => {
        setDeleteConfirmModal({ visible: true, post, type });
    };

    const executeDelete = async () => {
        const { post, type } = deleteConfirmModal;
        let success = false;

        if (type === 'post') {
            success = await handleDeletePost(post.id);
        } else if (type === 'comment') {
            // For comments, we need both post and comment IDs
            success = await handleDeleteComment(post.postId, post.id);
        }

        if (success) {
            Alert.alert(
                'Success',
                `${type === 'post' ? 'Post' : 'Comment'} deleted successfully`,
                [{ text: 'OK' }]
            );
        } else {
            Alert.alert(
                'Error',
                `Failed to delete ${type === 'post' ? 'post' : 'comment'}`,
                [{ text: 'OK' }]
            );
        }

        setDeleteConfirmModal({ visible: false, post: null, type: 'post' });
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'OPEN': return '#FF9800';
            case 'IN_PROGRESS': return '#2196F3';
            case 'RESOLVED': return '#4CAF50';
            default: return '#666';
        }
    };

    const filteredPosts = selectedFilter === 'ALL'
        ? posts
        : posts.filter(post => post.status === selectedFilter);

    const handleLogout = async () => {
        await clearAdminSession();
        setShowSettingsMenu(false);
        navigation.goBack();
    };

    const handleCreateAdmin = () => {
        setShowSettingsMenu(false);
        setShowSecurityCode(true);
    };

    const renderPost = ({ item }: any) => (
        <TouchableOpacity
            style={[styles.postCard, { backgroundColor: colors.surface }]}
            onPress={() => navigation.navigate('AdminPostDetail', { postId: item.id })}
        >
            <View style={styles.postHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
                        <Text style={styles.statusText}>{item.status}</Text>
                    </View>
                    <Text style={[styles.categoryText, { color: colors.textSecondary }]}>{item.category}</Text>
                </View>
                <TouchableOpacity
                    onPress={() => confirmDelete(item, 'post')}
                    style={{ padding: 4 }}
                >
                    <Ionicons name="trash-outline" size={18} color={colors.error} />
                </TouchableOpacity>
            </View>

            <Text style={[styles.postTitle, { color: colors.text }]}>{item.title}</Text>
            <Text style={[styles.postAuthor, { color: colors.textSecondary }]}>by {item.author.name}</Text>

            <View style={styles.postStats}>
                <View style={styles.statItem}>
                    <Ionicons name="arrow-up" size={16} color={colors.textSecondary} />
                    <Text style={[styles.statText, { color: colors.textSecondary }]}>{item.upvotes}</Text>
                </View>
                <View style={styles.statItem}>
                    <Ionicons name="chatbubble-outline" size={16} color={colors.textSecondary} />
                    <Text style={[styles.statText, { color: colors.textSecondary }]}>{item.commentCount}</Text>
                </View>
                <Text style={[styles.dateText, { color: colors.textTertiary }]}>
                    {new Date(item.createdAt).toLocaleDateString()}
                </Text>
            </View>
        </TouchableOpacity>
    );

    if (loading) {
        return (
            <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={24} color={colors.primary} />
                </TouchableOpacity>
                <View style={styles.headerTitleContainer}>
                    <Ionicons name="shield-checkmark" size={24} color={colors.primary} />
                    <Text style={[styles.headerTitle, { color: colors.primary }]}>Admin Hub</Text>
                </View>
                <TouchableOpacity onPress={() => setShowSettingsMenu(true)}>
                    <Ionicons name="settings-outline" size={24} color={colors.primary} />
                </TouchableOpacity>
            </View>

            {analytics && (
                <View style={[styles.analyticsContainer, { backgroundColor: colors.surface }]}>
                    <Text style={[styles.analyticsTitle, { color: colors.text }]}>Overview</Text>
                    <View style={styles.statsGrid}>
                        <View style={[styles.statCard, { backgroundColor: colors.background }]}>
                            <Text style={[styles.statNumber, { color: colors.primary }]}>{analytics.total}</Text>
                            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total Posts</Text>
                        </View>
                        <View style={[styles.statCard, { backgroundColor: '#FFF3E0' }]}>
                            <Text style={[styles.statNumber, { color: '#FF9800' }]}>
                                {analytics.byStatus.open}
                            </Text>
                            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Open</Text>
                        </View>
                        <View style={[styles.statCard, { backgroundColor: '#E3F2FD' }]}>
                            <Text style={[styles.statNumber, { color: '#2196F3' }]}>
                                {analytics.byStatus.inProgress}
                            </Text>
                            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>In Progress</Text>
                        </View>
                        <View style={[styles.statCard, { backgroundColor: '#E8F5E9' }]}>
                            <Text style={[styles.statNumber, { color: '#4CAF50' }]}>
                                {analytics.byStatus.resolved}
                            </Text>
                            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Resolved</Text>
                        </View>
                    </View>
                </View>
            )}

            <View style={[styles.filterContainer, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
                {['ALL', 'OPEN', 'IN_PROGRESS', 'RESOLVED'].map((filter) => (
                    <TouchableOpacity
                        key={filter}
                        style={[
                            styles.filterChip,
                            { backgroundColor: colors.background },
                            selectedFilter === filter && { backgroundColor: colors.primary }
                        ]}
                        onPress={() => setSelectedFilter(filter)}
                    >
                        <Text
                            style={[
                                styles.filterChipText,
                                { color: colors.textSecondary },
                                selectedFilter === filter && { color: '#fff', fontWeight: '600' }
                            ]}
                        >
                            {filter.replace('_', ' ')}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            <FlatList
                data={filteredPosts}
                keyExtractor={(item) => item.id}
                renderItem={renderPost}
                contentContainerStyle={styles.listContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
                }
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Ionicons name="folder-open-outline" size={64} color={colors.textTertiary} />
                        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No posts found</Text>
                    </View>
                }
            />

            {/* Settings Menu Modal */}
            <Modal
                visible={showSettingsMenu}
                transparent
                animationType="fade"
                onRequestClose={() => setShowSettingsMenu(false)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setShowSettingsMenu(false)}
                >
                    <View style={[styles.settingsMenu, { backgroundColor: colors.surface }]}>
                        {adminPermissions?.isSuperAdmin && (
                            <TouchableOpacity
                                style={[styles.menuItem, { borderBottomColor: colors.border }]}
                                onPress={handleCreateAdmin}
                            >
                                <Ionicons name="person-add" size={20} color={colors.primary} />
                                <Text style={[styles.menuItemText, { color: colors.text }]}>Create New Admin</Text>
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity
                            style={[styles.menuItem, { borderBottomColor: colors.border }]}
                            onPress={handleLogout}
                        >
                            <Ionicons name="log-out-outline" size={20} color="#d32f2f" />
                            <Text style={[styles.menuItemText, { color: '#d32f2f' }]}>Logout</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* Security Code Modal */}
            <SecurityCodeModal
                visible={showSecurityCode}
                onClose={() => setShowSecurityCode(false)}
                onSuccess={() => {
                    setShowSecurityCode(false);
                    setShowCreateAdmin(true);
                }}
            />

            {/* Create Admin Modal */}
            <CreateAdminModal
                visible={showCreateAdmin}
                onClose={() => setShowCreateAdmin(false)}
                onSuccess={() => {
                    setShowCreateAdmin(false);
                    Alert.alert('Success', 'New admin account created successfully');
                }}
            />

            {/* Delete Confirmation Modal */}
            <Modal
                visible={deleteConfirmModal.visible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setDeleteConfirmModal({ visible: false, post: null, type: 'post' })}
            >
                <View style={{
                    flex: 1,
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    justifyContent: 'center',
                    alignItems: 'center',
                    padding: 20
                }}>
                    <View style={{
                        backgroundColor: colors.surface,
                        borderRadius: 12,
                        padding: 20,
                        width: '100%',
                        maxWidth: 400
                    }}>
                        <Text style={{
                            fontSize: 18,
                            fontWeight: 'bold',
                            color: colors.text,
                            marginBottom: 12
                        }}>
                            Delete {deleteConfirmModal.type === 'post' ? 'Post' : 'Comment'}?
                        </Text>

                        <Text style={{
                            fontSize: 14,
                            color: colors.textSecondary,
                            marginBottom: 16,
                            lineHeight: 20
                        }}>
                            {deleteConfirmModal.type === 'post'
                                ? `Are you sure you want to delete this post? This action cannot be undone.\n\nTitle: ${deleteConfirmModal.post?.title || 'Untitled'}\nAuthor: ${deleteConfirmModal.post?.author?.name || 'Unknown'}`
                                : `Are you sure you want to delete this comment? This action cannot be undone.\n\nComment: ${deleteConfirmModal.post?.content || 'No content'}`
                            }
                        </Text>

                        <View style={{
                            flexDirection: 'row',
                            justifyContent: 'flex-end',
                            gap: 12
                        }}>
                            <TouchableOpacity
                                style={{
                                    paddingHorizontal: 16,
                                    paddingVertical: 10,
                                    borderRadius: 8,
                                    borderWidth: 1,
                                    borderColor: colors.border
                                }}
                                onPress={() => setDeleteConfirmModal({ visible: false, post: null, type: 'post' })}
                            >
                                <Text style={{ color: colors.textSecondary }}>Cancel</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={{
                                    paddingHorizontal: 16,
                                    paddingVertical: 10,
                                    borderRadius: 8,
                                    backgroundColor: colors.error
                                }}
                                onPress={executeDelete}
                            >
                                <Text style={{ color: '#fff', fontWeight: '600' }}>Delete</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
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
        borderBottomWidth: 1
    },
    headerTitleContainer: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    headerTitle: {
        marginLeft: 8,
        fontSize: 20,
        fontWeight: 'bold'
    },
    analyticsContainer: {
        padding: 16,
        marginBottom: 8
    },
    analyticsTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 12
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginHorizontal: -6
    },
    statCard: {
        width: '48%',
        borderRadius: 12,
        padding: 16,
        margin: '1%',
        alignItems: 'center'
    },
    statNumber: {
        fontSize: 28,
        fontWeight: 'bold'
    },
    statLabel: {
        fontSize: 12,
        marginTop: 4
    },
    filterContainer: {
        flexDirection: 'row',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderBottomWidth: 1
    },
    filterChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        marginRight: 8,
        borderRadius: 20
    },
    filterChipText: {
        fontSize: 12
    },
    listContent: {
        padding: 16
    },
    postCard: {
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
    categoryText: {
        fontSize: 12
    },
    postTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 4
    },
    postAuthor: {
        fontSize: 13,
        marginBottom: 12
    },
    postStats: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    statItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 16
    },
    statText: {
        marginLeft: 4,
        fontSize: 13
    },
    dateText: {
        marginLeft: 'auto',
        fontSize: 12
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center'
    },
    emptyContainer: {
        alignItems: 'center',
        paddingVertical: 60
    },
    emptyText: {
        marginTop: 16,
        fontSize: 16
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-start',
        alignItems: 'flex-end',
        paddingTop: 60,
        paddingRight: 16
    },
    settingsMenu: {
        borderRadius: 8,
        minWidth: 200,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1
    },
    menuItemText: {
        marginLeft: 12,
        fontSize: 16
    }
});
