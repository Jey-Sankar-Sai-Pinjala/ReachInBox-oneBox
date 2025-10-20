import { Router } from 'express';
import AccountController from '../controllers/account.controller';

const router = Router();
const accountController = new AccountController();

// Account management
router.get('/', accountController.getAccounts);
router.get('/:id', accountController.getAccountStatus);
router.post('/:id/reconnect', accountController.reconnectAccount);

// Connection management
router.post('/connect-all', accountController.connectAll);
router.post('/disconnect-all', accountController.disconnectAll);

export default router;

