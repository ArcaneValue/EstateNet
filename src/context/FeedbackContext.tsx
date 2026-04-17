import React, { createContext, useContext, useState, ReactNode } from 'react';
import { API_URL } from '../config/api';
import { useAuth } from './AuthContext';

interface ForumPost {
    id: string;
    title: string;
    content: string;
    authorId: string;
    category: string;
    status: string;
    upvotes: number;
    createdAt: string;
    updatedAt: string;
    author: {
        id: string;
        name: string;
        email: string;
        role: string;
    };
    commentCount: number;
    hasUpvoted: boolean;
    comments?: ForumComment[];
}

interface ForumComment {
    id: string;
    postId: string;
    authorId: string;
    content: string;
    isAdminResponse: boolean;
    createdAt: string;
    author: {
        id: string;
        name: string;
        email: string;
        role: string;
    };
}

interface Pagination {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

interface FeedbackContextType {
    posts: ForumPost[];
    myPosts: ForumPost[];
    loading: boolean;
    error: string | null;
    pagination: Pagination | null;
    loadPosts: (filters?: { category?: string; status?: string; page?: number }) => Promise<void>;
    createPost: (data: { title: string; content: string; category: string }) => Promise<ForumPost>;
    upvotePost: (postId: string) => Promise<void>;
    addComment: (postId: string, content: string) => Promise<ForumComment>;
    loadMyPosts: () => Promise<void>;
    getPostById: (postId: string) => Promise<ForumPost>;
    refreshPost: (postId: string) => Promise<ForumPost>;
}

const FeedbackContext = createContext<FeedbackContextType | undefined>(undefined);

export const FeedbackProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { token } = useAuth();
    const [posts, setPosts] = useState<ForumPost[]>([]);
    const [myPosts, setMyPosts] = useState<ForumPost[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [pagination, setPagination] = useState<Pagination | null>(null);

    const loadPosts = async (filters?: { category?: string; status?: string; page?: number }) => {
        setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams();
            if (filters?.category && filters.category !== 'ALL') {
                params.append('category', filters.category);
            }
            if (filters?.status && filters.status !== 'ALL') {
                params.append('status', filters.status);
            }
            if (filters?.page) {
                params.append('page', filters.page.toString());
            }

            const response = await fetch(`${API_URL}/feedback/posts?${params.toString()}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();

            if (data.success) {
                setPosts(data.data.posts);
                setPagination(data.data.pagination);
            } else {
                setError(data.message || 'Failed to load posts');
            }
        } catch (err: any) {
            setError(err.message || 'Failed to load posts');
        } finally {
            setLoading(false);
        }
    };

    const createPost = async (data: { title: string; content: string; category: string }): Promise<ForumPost> => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(`${API_URL}/feedback/posts`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (result.success) {
                return result.data;
            } else {
                throw new Error(result.message || 'Failed to create post');
            }
        } catch (err: any) {
            setError(err.message || 'Failed to create post');
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const upvotePost = async (postId: string) => {
        try {
            const response = await fetch(`${API_URL}/feedback/posts/${postId}/upvote`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            const result = await response.json();

            if (result.success) {
                setPosts(prevPosts =>
                    prevPosts.map(post =>
                        post.id === postId
                            ? {
                                ...post,
                                upvotes: result.data.upvoted ? post.upvotes + 1 : post.upvotes - 1,
                                hasUpvoted: result.data.upvoted
                            }
                            : post
                    )
                );
            } else {
                throw new Error(result.message || 'Failed to upvote post');
            }
        } catch (err: any) {
            setError(err.message || 'Failed to upvote post');
            throw err;
        }
    };

    const addComment = async (postId: string, content: string): Promise<ForumComment> => {
        try {
            const response = await fetch(`${API_URL}/feedback/posts/${postId}/comments`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ content })
            });

            const result = await response.json();

            if (result.success) {
                return result.data;
            } else {
                throw new Error(result.message || 'Failed to add comment');
            }
        } catch (err: any) {
            setError(err.message || 'Failed to add comment');
            throw err;
        }
    };

    const loadMyPosts = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(`${API_URL}/feedback/posts/my`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();

            if (data.success) {
                setMyPosts(data.data);
            } else {
                setError(data.message || 'Failed to load posts');
            }
        } catch (err: any) {
            setError(err.message || 'Failed to load posts');
        } finally {
            setLoading(false);
        }
    };

    const getPostById = async (postId: string): Promise<ForumPost> => {
        try {
            const response = await fetch(`${API_URL}/feedback/posts/${postId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            const result = await response.json();

            if (result.success) {
                return result.data;
            } else {
                throw new Error(result.message || 'Failed to load post');
            }
        } catch (err: any) {
            setError(err.message || 'Failed to load post');
            throw err;
        }
    };

    const refreshPost = async (postId: string): Promise<ForumPost> => {
        return getPostById(postId);
    };

    return (
        <FeedbackContext.Provider
            value={{
                posts,
                myPosts,
                loading,
                error,
                pagination,
                loadPosts,
                createPost,
                upvotePost,
                addComment,
                loadMyPosts,
                getPostById,
                refreshPost
            }}
        >
            {children}
        </FeedbackContext.Provider>
    );
};

export const useFeedback = () => {
    const context = useContext(FeedbackContext);
    if (!context) {
        throw new Error('useFeedback must be used within a FeedbackProvider');
    }
    return context;
};
