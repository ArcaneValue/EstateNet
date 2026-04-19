import { prisma } from '../utils/database';

export class FeedbackService {
    async getPosts(filters?: {
        category?: string;
        status?: string;
        page?: number;
        limit?: number;
    }, userId?: string) {
        const page = filters?.page || 1;
        const limit = filters?.limit || 20;
        const skip = (page - 1) * limit;

        const where: any = {};
        if (filters?.category && filters.category !== 'ALL') {
            where.category = filters.category;
        }
        if (filters?.status && filters.status !== 'ALL') {
            where.status = filters.status;
        }

        const [posts, total] = await Promise.all([
            (prisma as any).forumPost.findMany({
                where,
                include: {
                    author: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            role: true
                        }
                    },
                    comments: {
                        select: {
                            id: true
                        }
                    },
                    upvotedBy: userId ? {
                        where: {
                            userId
                        },
                        select: {
                            id: true
                        }
                    } : false
                },
                orderBy: {
                    createdAt: 'desc'
                },
                skip,
                take: limit
            }),
            (prisma as any).forumPost.count({ where })
        ]);

        return {
            posts: posts.map((post: any) => ({
                ...post,
                commentCount: post.comments.length,
                hasUpvoted: userId ? post.upvotedBy.length > 0 : false,
                comments: undefined,
                upvotedBy: undefined
            })),
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        };
    }

    async createPost(authorId: string, data: {
        title: string;
        content: string;
        category: string;
    }) {
        const post = await (prisma as any).forumPost.create({
            data: {
                title: data.title,
                content: data.content,
                category: data.category,
                authorId
            },
            include: {
                author: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        role: true
                    }
                }
            }
        });

        return post;
    }

    async getPostById(id: string, userId?: string) {
        const post = await (prisma as any).forumPost.findUnique({
            where: { id },
            include: {
                author: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        role: true
                    }
                },
                comments: {
                    include: {
                        author: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                                role: true
                            }
                        }
                    },
                    orderBy: {
                        createdAt: 'asc'
                    }
                },
                upvotedBy: userId ? {
                    where: {
                        userId
                    },
                    select: {
                        id: true
                    }
                } : false
            }
        });

        if (!post) {
            throw new Error('Post not found');
        }

        return {
            ...post,
            commentCount: post.comments.length,
            hasUpvoted: userId ? post.upvotedBy.length > 0 : false,
            upvotedBy: undefined
        };
    }

    async upvotePost(postId: string, userId: string) {
        const existingUpvote = await (prisma as any).forumPostUpvote.findUnique({
            where: {
                postId_userId: {
                    postId,
                    userId
                }
            }
        });

        if (existingUpvote) {
            await (prisma as any).forumPostUpvote.delete({
                where: {
                    id: existingUpvote.id
                }
            });

            await (prisma as any).forumPost.update({
                where: { id: postId },
                data: {
                    upvotes: {
                        decrement: 1
                    }
                }
            });

            return { upvoted: false };
        } else {
            await (prisma as any).forumPostUpvote.create({
                data: {
                    postId,
                    userId
                }
            });

            await (prisma as any).forumPost.update({
                where: { id: postId },
                data: {
                    upvotes: {
                        increment: 1
                    }
                }
            });

            return { upvoted: true };
        }
    }

    async addComment(postId: string, authorId: string, content: string, isAdminResponse: boolean = false) {
        const comment = await (prisma as any).forumComment.create({
            data: {
                postId,
                authorId,
                content,
                isAdminResponse
            },
            include: {
                author: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        role: true
                    }
                }
            }
        });

        return comment;
    }

    async getMyPosts(authorId: string) {
        const posts = await (prisma as any).forumPost.findMany({
            where: {
                authorId
            },
            include: {
                author: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        role: true
                    }
                },
                comments: {
                    select: {
                        id: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        return posts.map((post: any) => ({
            ...post,
            commentCount: post.comments.length,
            comments: undefined
        }));
    }

    async updatePostStatus(postId: string, status: string) {
        const post = await (prisma as any).forumPost.update({
            where: { id: postId },
            data: { status },
            include: {
                author: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                }
            }
        });

        return post;
    }

    async getAnalytics() {
        const [
            totalPosts,
            openPosts,
            inProgressPosts,
            resolvedPosts,
            featureRequests,
            bugReports,
            generalPosts
        ] = await Promise.all([
            (prisma as any).forumPost.count(),
            (prisma as any).forumPost.count({ where: { status: 'OPEN' } }),
            (prisma as any).forumPost.count({ where: { status: 'IN_PROGRESS' } }),
            (prisma as any).forumPost.count({ where: { status: 'RESOLVED' } }),
            (prisma as any).forumPost.count({ where: { category: 'FEATURE_REQUEST' } }),
            (prisma as any).forumPost.count({ where: { category: 'BUG_REPORT' } }),
            (prisma as any).forumPost.count({ where: { category: 'GENERAL' } })
        ]);

        const trendingPosts = await (prisma as any).forumPost.findMany({
            where: {
                status: {
                    not: 'RESOLVED'
                }
            },
            orderBy: {
                upvotes: 'desc'
            },
            take: 5,
            include: {
                author: {
                    select: {
                        id: true,
                        name: true,
                        role: true
                    }
                }
            }
        });

        return {
            total: totalPosts,
            byStatus: {
                open: openPosts,
                inProgress: inProgressPosts,
                resolved: resolvedPosts
            },
            byCategory: {
                featureRequest: featureRequests,
                bugReport: bugReports,
                general: generalPosts
            },
            trending: trendingPosts
        };
    }

    async deletePost(postId: string) {
        // Delete all related data first (comments, upvotes)
        await (prisma as any).forumComment.deleteMany({
            where: { postId }
        });

        await (prisma as any).forumPostUpvote.deleteMany({
            where: { postId }
        });

        // Delete the post
        const post = await (prisma as any).forumPost.delete({
            where: { id: postId }
        });

        return post;
    }

    async deleteComment(postId: string, commentId: string) {
        // Verify the comment belongs to the post
        const comment = await (prisma as any).forumComment.findFirst({
            where: {
                id: commentId,
                postId: postId
            }
        });

        if (!comment) {
            throw new Error('Comment not found or does not belong to this post');
        }

        // Delete the comment
        await (prisma as any).forumComment.delete({
            where: { id: commentId }
        });

        return comment;
    }
}

export default new FeedbackService();
