import { Router } from 'express';
import emailRoutes from './email.routes';
import accountRoutes from './account.routes';

const router = Router();

// API routes
router.use('/emails', emailRoutes);
router.use('/accounts', accountRoutes);

// Health check
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'ReachInbox Onebox API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

export default router;

