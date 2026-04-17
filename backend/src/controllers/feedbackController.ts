import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth';
import feedbackService from '../services/feedbackService';

export class FeedbackController {
    async getPosts(req: AuthenticatedRequest, res: Response) {
        try {
            const { category, status, page, limit } = req.query;
            const userId = req.user?.id;

            const result = await feedbackService.getPosts({
                category: category as string,
                status: status as string,
                page: page ? parseInt(page as string) : undefined,
                limit: limit ? parseInt(limit as string) : undefined
            }, userId);

            res.json({
                success: true,
                data: result
            });
        } catch (error: any) {
            console.error('Get posts error:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to fetch posts'
            });
        }
    }

    async createPost(req: AuthenticatedRequest, res: Response) {
        try {
            if (!req.user) {
                res.status(401).json({
                    success: false,
                    message: 'Authentication required'
                });
                return;
            }

            const { title, content, category } = req.body;

            if (!title || !content || !category) {
                res.status(400).json({
                    success: false,
                    message: 'Title, content, and category are required'
                });
                return;
            }

            const post = await feedbackService.createPost(req.user.id, {
                title,
                content,
                category
            });

            res.status(201).json({
                success: true,
                data: post
            });
        } catch (error: any) {
            console.error('Create post error:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to create post'
            });
        }
    }

    async getPostById(req: AuthenticatedRequest, res: Response) {
        try {
            const { id } = req.params;
            const userId = req.user?.id;

            const post = await feedbackService.getPostById(id, userId);

            res.json({
                success: true,
                data: post
            });
        } catch (error: any) {
            console.error('Get post error:', error);
            res.status(error.message === 'Post not found' ? 404 : 500).json({
                success: false,
                message: error.message || 'Failed to fetch post'
            });
        }
    }

    async upvotePost(req: AuthenticatedRequest, res: Response) {
        try {
            if (!req.user) {
                res.status(401).json({
                    success: false,
                    message: 'Authentication required'
                });
                return;
            }

            const { id } = req.params;

            const result = await feedbackService.upvotePost(id, req.user.id);

            res.json({
                success: true,
                data: result
            });
        } catch (error: any) {
            console.error('Upvote post error:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to upvote post'
            });
        }
    }

    async addComment(req: AuthenticatedRequest, res: Response) {
        try {
            if (!req.user) {
                res.status(401).json({
                    success: false,
                    message: 'Authentication required'
                });
                return;
            }

            const { id } = req.params;
            const { content } = req.body;

            if (!content) {
                res.status(400).json({
                    success: false,
                    message: 'Content is required'
                });
                return;
            }

            const comment = await feedbackService.addComment(id, req.user.id, content, false);

            res.status(201).json({
                success: true,
                data: comment
            });
        } catch (error: any) {
            console.error('Add comment error:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to add comment'
            });
        }
    }

    async getMyPosts(req: AuthenticatedRequest, res: Response) {
        try {
            if (!req.user) {
                res.status(401).json({
                    success: false,
                    message: 'Authentication required'
                });
                return;
            }

            const posts = await feedbackService.getMyPosts(req.user.id);

            res.json({
                success: true,
                data: posts
            });
        } catch (error: any) {
            console.error('Get my posts error:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to fetch posts'
            });
        }
    }
}

export default new FeedbackController();
