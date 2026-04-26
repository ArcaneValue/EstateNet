import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    Alert,
    RefreshControl
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFeedback } from '../../context/FeedbackContext';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../theme/ThemeContext';

const CATEGORIES = [
    { value: 'FEATURE_REQUEST', label: 'Feature Request' },
    { value: 'BUG_REPORT', label: 'Bug Report' },
    { value: 'GENERAL', label: 'General Feedback' }
];

const STATUSES = [
    { value: 'OPEN', label: 'Open' },
    { value: 'IN_PROGRESS', label: 'In Progress' },
    { value: 'RESOLVED', label: 'Resolved' }
];

export const FeedbackPostDetailScreen = ({ route, navigation }: any) => {
    const { postId } = route.params;
    const { getPostById, upvotePost, addComment } = useFeedback();
    const { user } = useAuth();
    const { colors, spacing } = useTheme();
    const insets = useSafeAreaInsets();
    const [post, setPost] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [comment, setComment] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const loadPost = async () => {
        try {
            const data = await getPostById(postId);
            setPost(data);
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

    const handleUpvote = async () => {
        try {
            await upvotePost(postId);
            await loadPost();
        } catch (error) {
            console.error('Upvote error:', error);
        }
    };

    const handleSubmitComment = async () => {
        if (!comment.trim()) {
            Alert.alert('Error', 'Please enter a comment');
            return;
        }

        setSubmitting(true);
        try {
            await addComment(postId, comment.trim());
            setComment('');
            await loadPost();
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to add comment');
        } finally {
            setSubmitting(false);
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
        <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
            <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={24} color={colors.primary} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Feedback Details</Text>
                <View style={{ width: 24 }} />
            </View>

            <KeyboardAwareScrollView
                style={styles.content}
                enableOnAndroid={true}
                extraScrollHeight={20}
                keyboardShouldPersistTaps="handled"
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
                }
            >
                <View style={[styles.postCard, { backgroundColor: colors.surface }]}>
                    <View style={styles.postHeader}>
                        <View style={[styles.categoryBadge, { backgroundColor: colors.primary + '15' }]}>
                            <Text style={[styles.categoryText, { color: colors.primary }]}>
                                {CATEGORIES.find(c => c.value === post.category)?.label || post.category}
                            </Text>
                        </View>
                        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(post.status) }]}>
                            <Text style={styles.statusText}>
                                {STATUSES.find(s => s.value === post.status)?.label || post.status}
                            </Text>
                        </View>
                    </View>

                    <Text style={[styles.postTitle, { color: colors.text }]}>{post.title}</Text>
                    <Text style={[styles.postContent, { color: colors.textSecondary }]}>{post.content}</Text>

                    <View style={styles.postFooter}>
                        <View style={styles.authorInfo}>
                            <Ionicons name="person-circle-outline" size={20} color={colors.textTertiary} />
                            <Text style={[styles.authorName, { color: colors.textSecondary }]}>{post.author.name}</Text>
                            <Text style={[styles.postDate, { color: colors.textTertiary }]}>
                                {new Date(post.createdAt).toLocaleDateString()}
                            </Text>
                        </View>

                        <TouchableOpacity style={styles.upvoteButton} onPress={handleUpvote}>
                            <Ionicons
                                name={post.hasUpvoted ? 'arrow-up' : 'arrow-up-outline'}
                                size={24}
                                color={post.hasUpvoted ? colors.primary : colors.textSecondary}
                            />
                            <Text style={[styles.upvoteText, { color: colors.textSecondary }, post.hasUpvoted && { color: colors.primary, fontWeight: '600' }]}>
                                {post.upvotes}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.commentsSection}>
                    <Text style={[styles.commentsTitle, { color: colors.text }]}>
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
                                    <View style={[styles.adminBadge, { backgroundColor: colors.primary + '15' }]}>
                                        <Ionicons name="shield-checkmark" size={12} color={colors.primary} />
                                        <Text style={[styles.adminBadgeText, { color: colors.primary }]}>ADMIN</Text>
                                    </View>
                                )}
                                <View style={styles.commentHeader}>
                                    <Text style={[styles.commentAuthor, { color: colors.text }]}>{comment.author.name}</Text>
                                    <Text style={[styles.commentDate, { color: colors.textTertiary }]}>
                                        {new Date(comment.createdAt).toLocaleDateString()}
                                    </Text>
                                </View>
                                <Text style={[styles.commentContent, { color: colors.textSecondary }]}>{comment.content}</Text>
                            </View>
                        ))
                    ) : (
                        <View style={styles.emptyComments}>
                            <Ionicons name="chatbubbles-outline" size={48} color={colors.textTertiary} />
                            <Text style={[styles.emptyCommentsText, { color: colors.textSecondary }]}>No comments yet</Text>
                        </View>
                    )}
                </View>

                {/* Comment Input - Inside ScrollView for keyboard awareness */}
                <View style={[styles.commentInputContainer, { backgroundColor: colors.surface, borderTopColor: colors.border, marginBottom: insets.bottom }]}>
                    <TextInput
                        style={[styles.commentInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                        placeholder="Add a comment..."
                        placeholderTextColor={colors.textTertiary}
                        value={comment}
                        onChangeText={setComment}
                        multiline
                        maxLength={500}
                    />
                    <TouchableOpacity
                        style={[styles.sendButton, submitting && styles.sendButtonDisabled]}
                        onPress={handleSubmitComment}
                        disabled={submitting}
                    >
                        {submitting ? (
                            <ActivityIndicator size="small" color={colors.primary} />
                        ) : (
                            <Ionicons name="send" size={24} color={colors.primary} />
                        )}
                    </TouchableOpacity>
                </View>
            </KeyboardAwareScrollView>
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
        color: '#1F3A5F'
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
    postHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16
    },
    categoryBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: '#E8F0FE',
        borderRadius: 12
    },
    categoryText: {
        fontSize: 12,
        color: '#1F3A5F',
        fontWeight: '600'
    },
    statusBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12
    },
    statusText: {
        fontSize: 12,
        color: '#fff',
        fontWeight: '600'
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
        marginBottom: 16
    },
    postFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0'
    },
    authorInfo: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    authorName: {
        marginLeft: 8,
        fontSize: 14,
        fontWeight: '600',
        color: '#333'
    },
    postDate: {
        marginLeft: 8,
        fontSize: 12,
        color: '#999'
    },
    upvoteButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: '#f0f0f0',
        borderRadius: 20
    },
    upvoteText: {
        marginLeft: 6,
        fontSize: 16,
        fontWeight: '600',
        color: '#666'
    },
    upvotedText: {
        color: '#1F3A5F'
    },
    commentsSection: {
        backgroundColor: '#fff',
        padding: 16
    },
    commentsTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
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
    adminBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 4,
        backgroundColor: '#FF6B35',
        borderRadius: 12,
        marginBottom: 8
    },
    adminBadgeText: {
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
        paddingVertical: 40
    },
    emptyCommentsText: {
        marginTop: 12,
        fontSize: 14,
        color: '#999'
    },
    commentInputContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        padding: 12,
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#e0e0e0'
    },
    commentInput: {
        flex: 1,
        backgroundColor: '#f5f5f5',
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 10,
        marginRight: 8,
        maxHeight: 100,
        fontSize: 14
    },
    sendButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#E8F0FE',
        justifyContent: 'center',
        alignItems: 'center'
    },
    sendButtonDisabled: {
        opacity: 0.5
    }
});
