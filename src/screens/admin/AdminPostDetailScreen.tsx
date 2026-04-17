import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    Alert,
    RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { API_URL } from '../../config/api';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../theme/ThemeContext';

const STATUSES = [
    { value: 'OPEN', label: 'Open', color: '#FF9800' },
    { value: 'IN_PROGRESS', label: 'In Progress', color: '#2196F3' },
    { value: 'RESOLVED', label: 'Resolved', color: '#4CAF50' }
];

export const AdminPostDetailScreen = ({ route, navigation }: any) => {
    const { postId } = route.params;
    const { token } = useAuth();
    const { colors } = useTheme();
    const [post, setPost] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [response, setResponse] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const loadPost = async () => {
        try {
            const res = await fetch(`${API_URL}/feedback/posts/${postId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            const data = await res.json();
            if (data.success) {
                setPost(data.data);
            }
        } catch (error) {
            console.error('Load post error:', error);
            Alert.alert('Error', 'Failed to load post');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadPost();
    }, [postId]);

    const handleRefresh = async () => {
        setRefreshing(true);
        await loadPost();
        setRefreshing(false);
    };

    const handleStatusChange = async (newStatus: string) => {
        try {
            const res = await fetch(`${API_URL}/admin/feedback/posts/${postId}/status`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ status: newStatus })
            });

            const data = await res.json();
            if (data.success) {
                Alert.alert('Success', 'Status updated successfully');
                await loadPost();
            } else {
                Alert.alert('Error', data.message || 'Failed to update status');
            }
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to update status');
        }
    };

    const handleSubmitResponse = async () => {
        if (!response.trim()) {
            Alert.alert('Error', 'Please enter a response');
            return;
        }

        setSubmitting(true);
        try {
            const res = await fetch(`${API_URL}/admin/feedback/posts/${postId}/respond`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ content: response.trim() })
            });

            const data = await res.json();
            if (data.success) {
                setResponse('');
                Alert.alert('Success', 'Response sent successfully');
                await loadPost();
            } else {
                Alert.alert('Error', data.message || 'Failed to send response');
            }
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to send response');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    if (!post) {
        return (
            <View style={[styles.errorContainer, { backgroundColor: colors.background }]}>
                <Ionicons name="alert-circle-outline" size={64} color={colors.textTertiary} />
                <Text style={[styles.errorText, { color: colors.textSecondary }]}>Post not found</Text>
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={24} color={colors.primary} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Admin Review</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView
                style={styles.content}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
                }
            >
                <View style={[styles.postCard, { backgroundColor: colors.surface }]}>
                    <View style={[styles.adminBadge, { backgroundColor: colors.primary + '15' }]}>
                        <Ionicons name="shield-checkmark" size={16} color={colors.primary} />
                        <Text style={[styles.adminBadgeText, { color: colors.primary }]}>ADMIN VIEW</Text>
                    </View>

                    <Text style={[styles.postTitle, { color: colors.text }]}>{post.title}</Text>
                    <Text style={[styles.postContent, { color: colors.textSecondary }]}>{post.content}</Text>

                    <View style={styles.metaInfo}>
                        <View style={styles.metaRow}>
                            <Text style={[styles.metaLabel, { color: colors.textSecondary }]}>Author:</Text>
                            <Text style={[styles.metaValue, { color: colors.text }]}>
                                {post.author.name} ({post.author.role})
                            </Text>
                        </View>
                        <View style={styles.metaRow}>
                            <Text style={[styles.metaLabel, { color: colors.textSecondary }]}>Email:</Text>
                            <Text style={[styles.metaValue, { color: colors.text }]}>{post.author.email}</Text>
                        </View>
                        <View style={styles.metaRow}>
                            <Text style={[styles.metaLabel, { color: colors.textSecondary }]}>Category:</Text>
                            <Text style={[styles.metaValue, { color: colors.text }]}>{post.category}</Text>
                        </View>
                        <View style={styles.metaRow}>
                            <Text style={[styles.metaLabel, { color: colors.textSecondary }]}>Created:</Text>
                            <Text style={[styles.metaValue, { color: colors.text }]}>
                                {new Date(post.createdAt).toLocaleString()}
                            </Text>
                        </View>
                        <View style={styles.metaRow}>
                            <Text style={[styles.metaLabel, { color: colors.textSecondary }]}>Upvotes:</Text>
                            <Text style={[styles.metaValue, { color: colors.text }]}>{post.upvotes}</Text>
                        </View>
                    </View>
                </View>

                <View style={[styles.statusSection, { backgroundColor: colors.surface }]}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Update Status</Text>
                    <View style={styles.statusButtons}>
                        {STATUSES.map((status) => (
                            <TouchableOpacity
                                key={status.value}
                                style={[
                                    styles.statusButton,
                                    { borderColor: status.color },
                                    post.status === status.value && {
                                        backgroundColor: status.color
                                    }
                                ]}
                                onPress={() => handleStatusChange(status.value)}
                            >
                                <Text
                                    style={[
                                        styles.statusButtonText,
                                        { color: status.color },
                                        post.status === status.value && { color: '#fff' }
                                    ]}
                                >
                                    {status.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                <View style={[styles.responseSection, { backgroundColor: colors.surface }]}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Admin Response</Text>
                    <TextInput
                        style={[styles.responseInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                        placeholder="Type your response to the user..."
                        placeholderTextColor={colors.textTertiary}
                        value={response}
                        onChangeText={setResponse}
                        multiline
                        numberOfLines={6}
                        textAlignVertical="top"
                        maxLength={1000}
                    />
                    <TouchableOpacity
                        style={[styles.sendButton, { backgroundColor: colors.primary }, submitting && styles.sendButtonDisabled]}
                        onPress={handleSubmitResponse}
                        disabled={submitting}
                    >
                        {submitting ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <>
                                <Ionicons name="send" size={20} color="#fff" />
                                <Text style={styles.sendButtonText}>Send Response</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>

                <View style={styles.commentsSection}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>
                        Comments ({post.comments?.length || 0})
                    </Text>

                    {post.comments && post.comments.length > 0 ? (
                        post.comments.map((comment: any) => (
                            <View
                                key={comment.id}
                                style={[
                                    styles.commentCard,
                                    { backgroundColor: colors.surface, borderColor: colors.border },
                                    comment.isAdminResponse && { borderColor: colors.primary }
                                ]}
                            >
                                {comment.isAdminResponse && (
                                    <View style={[styles.commentAdminBadge, { backgroundColor: colors.primary + '15' }]}>
                                        <Ionicons name="shield-checkmark" size={12} color={colors.primary} />
                                        <Text style={[styles.commentAdminBadgeText, { color: colors.primary }]}>ADMIN</Text>
                                    </View>
                                )}
                                <View style={styles.commentHeader}>
                                    <Text style={styles.commentAuthor}>
                                        {comment.author.name}
                                    </Text>
                                    <Text style={styles.commentDate}>
                                        {new Date(comment.createdAt).toLocaleDateString()}
                                    </Text>
                                </View>
                                <Text style={styles.commentContent}>{comment.content}</Text>
                            </View>
                        ))
                    ) : (
                        <View style={styles.emptyComments}>
                            <Text style={styles.emptyCommentsText}>No comments yet</Text>
                        </View>
                    )}
                </View>
            </ScrollView>
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
        fontSize: 20,
        fontWeight: 'bold',
        color: '#FF6B35'
    },
    content: {
        flex: 1
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center'
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center'
    },
    errorText: {
        marginTop: 16,
        fontSize: 16,
        color: '#999'
    },
    postCard: {
        backgroundColor: '#fff',
        padding: 16,
        marginBottom: 8
    },
    adminBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: '#FFF5F0',
        borderRadius: 16,
        marginBottom: 16
    },
    adminBadgeText: {
        marginLeft: 6,
        fontSize: 12,
        fontWeight: 'bold',
        color: '#FF6B35'
    },
    postTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 12
    },
    postContent: {
        fontSize: 16,
        color: '#666',
        lineHeight: 24,
        marginBottom: 20
    },
    metaInfo: {
        backgroundColor: '#f9f9f9',
        borderRadius: 8,
        padding: 12
    },
    metaRow: {
        flexDirection: 'row',
        marginBottom: 8
    },
    metaLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#666',
        width: 80
    },
    metaValue: {
        flex: 1,
        fontSize: 14,
        color: '#333'
    },
    statusSection: {
        backgroundColor: '#fff',
        padding: 16,
        marginBottom: 8
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 12
    },
    statusButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between'
    },
    statusButton: {
        flex: 1,
        paddingVertical: 12,
        marginHorizontal: 4,
        borderRadius: 8,
        borderWidth: 2,
        alignItems: 'center'
    },
    statusButtonText: {
        fontSize: 14,
        fontWeight: '600'
    },
    responseSection: {
        backgroundColor: '#fff',
        padding: 16,
        marginBottom: 8
    },
    responseInput: {
        backgroundColor: '#f9f9f9',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        minHeight: 120,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#e0e0e0'
    },
    sendButton: {
        flexDirection: 'row',
        backgroundColor: '#FF6B35',
        borderRadius: 8,
        padding: 14,
        alignItems: 'center',
        justifyContent: 'center'
    },
    sendButtonDisabled: {
        opacity: 0.6
    },
    sendButtonText: {
        marginLeft: 8,
        fontSize: 16,
        fontWeight: '600',
        color: '#fff'
    },
    commentsSection: {
        backgroundColor: '#fff',
        padding: 16,
        marginBottom: 16
    },
    commentCard: {
        backgroundColor: '#f9f9f9',
        borderRadius: 8,
        padding: 12,
        marginBottom: 12
    },
    adminCommentCard: {
        backgroundColor: '#FFF5F0',
        borderLeftWidth: 4,
        borderLeftColor: '#FF6B35'
    },
    commentAdminBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 4,
        backgroundColor: '#FF6B35',
        borderRadius: 12,
        marginBottom: 8
    },
    commentAdminBadgeText: {
        marginLeft: 4,
        fontSize: 10,
        fontWeight: 'bold',
        color: '#fff'
    },
    commentHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8
    },
    commentAuthor: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333'
    },
    commentDate: {
        fontSize: 12,
        color: '#999'
    },
    commentContent: {
        fontSize: 14,
        color: '#666',
        lineHeight: 20
    },
    emptyComments: {
        alignItems: 'center',
        paddingVertical: 20
    },
    emptyCommentsText: {
        fontSize: 14,
        color: '#999'
    }
});
