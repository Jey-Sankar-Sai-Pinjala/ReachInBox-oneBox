import { Router } from 'express';
import EmailController from '../controllers/email.controller';

const router = Router();
const emailController = new EmailController();

// Root emails route
router.get('/', emailController.searchEmails);

// Email search and retrieval
router.get('/search', emailController.searchEmails);
router.post('/search/advanced', emailController.advancedSearch);
router.get('/stats', emailController.getEmailStats);
router.get('/:id', emailController.getEmailById);

// Email management
router.put('/:id/category', emailController.updateEmailCategory);
router.delete('/:id', emailController.deleteEmail);

// AI-powered features
router.post('/:id/suggest-reply', emailController.suggestReply);

// Bulk operations
router.post('/bulk-index', emailController.bulkIndexEmails);
router.post('/reindex', emailController.reindexAll);

export default router;

