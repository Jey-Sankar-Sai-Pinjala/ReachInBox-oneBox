"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const account_controller_1 = __importDefault(require("../controllers/account.controller"));
const router = (0, express_1.Router)();
const accountController = new account_controller_1.default();
router.get('/', accountController.getAccounts);
router.get('/:id', accountController.getAccountStatus);
router.post('/:id/reconnect', accountController.reconnectAccount);
router.post('/connect-all', accountController.connectAll);
router.post('/disconnect-all', accountController.disconnectAll);
exports.default = router;
//# sourceMappingURL=account.routes.js.map