"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const email_controller_1 = __importDefault(require("../controllers/email.controller"));
const router = (0, express_1.Router)();
const emailController = new email_controller_1.default();
router.get('/', emailController.searchEmails);
router.get('/search', emailController.searchEmails);
router.post('/search/advanced', emailController.advancedSearch);
router.get('/stats', emailController.getEmailStats);
router.get('/:id', emailController.getEmailById);
router.put('/:id/category', emailController.updateEmailCategory);
router.delete('/:id', emailController.deleteEmail);
router.post('/:id/suggest-reply', emailController.suggestReply);
router.post('/bulk-index', emailController.bulkIndexEmails);
router.post('/reindex', emailController.reindexAll);
exports.default = router;
//# sourceMappingURL=email.routes.js.map