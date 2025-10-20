"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AccountController = void 0;
const imap_service_1 = require("../services/imap.service");
const errorHandler_1 = require("../utils/errorHandler");
class AccountController {
    constructor() {
        this.getAccounts = (0, errorHandler_1.asyncHandler)(async (req, res) => {
            const statuses = this.imapService.getAccountStatuses();
            res.json({
                success: true,
                data: statuses
            });
        });
        this.getAccountStatus = (0, errorHandler_1.asyncHandler)(async (req, res) => {
            const { id } = req.params;
            const status = this.imapService.getAccountStatus(id);
            if (!status) {
                return res.status(404).json({
                    success: false,
                    error: 'Account not found'
                });
            }
            return res.json({
                success: true,
                data: status
            });
        });
        this.reconnectAccount = (0, errorHandler_1.asyncHandler)(async (req, res) => {
            const { id } = req.params;
            await this.imapService.reconnectAccount(id);
            res.json({
                success: true,
                message: `Account ${id} reconnected successfully`
            });
        });
        this.disconnectAll = (0, errorHandler_1.asyncHandler)(async (req, res) => {
            await this.imapService.disconnectAll();
            res.json({
                success: true,
                message: 'All accounts disconnected successfully'
            });
        });
        this.connectAll = (0, errorHandler_1.asyncHandler)(async (req, res) => {
            await this.imapService.connectAll();
            res.json({
                success: true,
                message: 'All accounts connected successfully'
            });
        });
        this.imapService = new imap_service_1.IMAPService();
    }
}
exports.AccountController = AccountController;
exports.default = AccountController;
//# sourceMappingURL=account.controller.js.map