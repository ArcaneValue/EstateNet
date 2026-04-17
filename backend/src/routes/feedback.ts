import express from 'express';
import { authenticateToken } from '../middlewares/auth';
import feedbackController from '../controllers/feedbackController';

const router = express.Router();

router.get('/posts', authenticateToken, feedbackController.getPosts.bind(feedbackController));
router.post('/posts', authenticateToken, feedbackController.createPost.bind(feedbackController));
router.get('/posts/my', authenticateToken, feedbackController.getMyPosts.bind(feedbackController));
router.get('/posts/:id', authenticateToken, feedbackController.getPostById.bind(feedbackController));
router.put('/posts/:id/upvote', authenticateToken, feedbackController.upvotePost.bind(feedbackController));
router.post('/posts/:id/comments', authenticateToken, feedbackController.addComment.bind(feedbackController));

export default router;
