import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth';
import feedbackService from '../services/feedbackService';
import adminService from '../services/adminService';
import emailService from '../services/emailService';

export class AdminFeedbackController {
    async getPosts(req: AuthenticatedRequest, res: Response) {
        try {
            const { category, status, page, limit } = req.query;

            const result = await feedbackService.getPosts({
                category: category as string,
                status: status as string,
                page: page ? parseInt(page as string) : undefined,
                limit: limit ? parseInt(limit as string) : undefined
            });

            res.json({
                success: true,
                data: result
            });
        } catch (error: any) {
            console.error('Admin get posts error:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to fetch posts'
            });
        }
    }

    async updatePostStatus(req: AuthenticatedRequest, res: Response) {
        try {
            const { id } = req.params;
            const { status } = req.body;

            if (!status) {
                res.status(400).json({
                    success: false,
                    message: 'Status is required'
                });
                return;
            }

            const post = await feedbackService.updatePostStatus(id, status);

            // Send email notification to post author
            try {
                await emailService.sendFeedbackStatusUpdateEmail(id, status);
            } catch (emailError) {
                console.error('Failed to send status update email:', emailError);
            }

            res.json({
                success: true,
                data: post
            });
        } catch (error: any) {
            console.error('Update post status error:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to update post status'
            });
        }
    }

    async respondToPost(req: AuthenticatedRequest, res: Response) {
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

            const comment = await feedbackService.addComment(id, req.user.id, content, true);

            // Send email notification to post author
            try {
                await emailService.sendAdminResponseEmail(id, comment.id);
            } catch (emailError) {
                console.error('Failed to send admin response email:', emailError);
            }

            res.status(201).json({
                success: true,
                data: comment
            });
        } catch (error: any) {
            console.error('Admin respond error:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to respond to post'
            });
        }
    }

    async getAnalytics(req: AuthenticatedRequest, res: Response) {
        try {
            const analytics = await feedbackService.getAnalytics();

            res.json({
                success: true,
                data: analytics
            });
        } catch (error: any) {
            console.error('Get analytics error:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to fetch analytics'
            });
        }
    }

    async listAdmins(req: AuthenticatedRequest, res: Response) {
        try {
            const admins = await adminService.listAdmins();

            res.json({
                success: true,
                data: admins
            });
        } catch (error: any) {
            console.error('List admins error:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to fetch admins'
            });
        }
    }

    async createAdmin(req: AuthenticatedRequest, res: Response) {
        try {
            const { email, permissions } = req.body;

            if (!email) {
                res.status(400).json({
                    success: false,
                    message: 'Email is required'
                });
                return;
            }

            const admin = await adminService.createAdminEmail(email, permissions || {});

            res.status(201).json({
                success: true,
                data: admin
            });
        } catch (error: any) {
            console.error('Create admin error:', error);
            res.status(error.message === 'Admin email already exists' ? 409 : 500).json({
                success: false,
                message: error.message || 'Failed to create admin'
            });
        }
    }

    async updateAdmin(req: AuthenticatedRequest, res: Response) {
        try {
            const { email } = req.params;
            const { permissions } = req.body;

            if (!permissions) {
                res.status(400).json({
                    success: false,
                    message: 'Permissions are required'
                });
                return;
            }

            const admin = await adminService.updateAdminPermissions(email, permissions);

            res.json({
                success: true,
                data: admin
            });
        } catch (error: any) {
            console.error('Update admin error:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to update admin'
            });
        }
    }

    async deleteAdmin(req: AuthenticatedRequest, res: Response) {
        try {
            const { email } = req.params;

            await adminService.removeAdminEmail(email);

            res.json({
                success: true,
                message: 'Admin removed successfully'
            });
        } catch (error: any) {
            console.error('Delete admin error:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to remove admin'
            });
        }
    }

    async deletePost(req: AuthenticatedRequest, res: Response) {
        try {
            const { id } = req.params;

            await feedbackService.deletePost(id);

            res.json({
                success: true,
                message: 'Post deleted successfully'
            });
        } catch (error: any) {
            console.error('Delete post error:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to delete post'
            });
        }
    }

    async deleteComment(req: AuthenticatedRequest, res: Response) {
        try {
            const { postId, commentId } = req.params;

            await feedbackService.deleteComment(postId, commentId);

            res.json({
                success: true,
                message: 'Comment deleted successfully'
            });
        } catch (error: any) {
            console.error('Delete comment error:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to delete comment'
            });
        }
    }
}

export default new AdminFeedbackController();
