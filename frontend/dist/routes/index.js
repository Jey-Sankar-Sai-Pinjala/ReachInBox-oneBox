"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const email_routes_1 = __importDefault(require("./email.routes"));
const account_routes_1 = __importDefault(require("./account.routes"));
const router = (0, express_1.Router)();
router.use('/emails', email_routes_1.default);
router.use('/accounts', account_routes_1.default);
router.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'ReachInbox Onebox API is running',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});
exports.default = router;
//# sourceMappingURL=index.js.map