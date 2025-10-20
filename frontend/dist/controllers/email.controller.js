"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailController = void 0;
const logger_1 = require("../utils/logger");
const email_index_service_1 = require("../services/email-index.service");
const webhook_service_1 = require("../services/webhook.service");
const rag_service_1 = require("../services/rag.service");
const errorHandler_1 = require("../utils/errorHandler");
class EmailController {
    constructor() {
        this.searchEmails = (0, errorHandler_1.asyncHandler)(async (req, res) => {
            const { q: query, account, folder, category, from, dateFrom, dateTo, page = 1, size = 20, sortBy = 'date', sortOrder = 'desc', hasAttachments, to } = req.query;
            const pageNum = Math.max(1, parseInt(page) || 1);
            const pageSize = Math.min(100, Math.max(1, parseInt(size) || 20));
            const validSortFields = ['date', 'subject', 'from', 'indexedAt'];
            const sortField = validSortFields.includes(sortBy) ? sortBy : 'date';
            const sortDirection = sortOrder === 'asc' ? 'asc' : 'desc';
            const searchQuery = {
                query: query,
                accountId: account,
                folder: folder,
                category: category,
                from: from,
                to: to,
                dateFrom: dateFrom ? new Date(dateFrom) : undefined,
                dateTo: dateTo ? new Date(dateTo) : undefined,
                page: pageNum,
                size: pageSize,
                sortBy: sortField,
                sortOrder: sortDirection,
                hasAttachments: hasAttachments ? hasAttachments === 'true' : undefined
            };
            const results = await this.emailIndexService.searchEmails(searchQuery);
            res.json({
                success: true,
                data: results,
                meta: {
                    query: {
                        search: query || '',
                        filters: {
                            account: account || null,
                            folder: folder || null,
                            category: category || null,
                            from: from || null,
                            to: to || null,
                            dateFrom: dateFrom || null,
                            dateTo: dateTo || null,
                            hasAttachments: hasAttachments || null
                        },
                        pagination: {
                            page: pageNum,
                            size: pageSize,
                            totalPages: results.totalPages,
                            totalResults: results.total
                        },
                        sort: {
                            field: sortField,
                            order: sortDirection
                        }
                    }
                }
            });
        });
        this.getEmailById = (0, errorHandler_1.asyncHandler)(async (req, res) => {
            const { id } = req.params;
            const email = await this.emailIndexService.getEmailById(id);
            if (!email) {
                return res.status(404).json({
                    success: false,
                    error: 'Email not found'
                });
            }
            return res.json({
                success: true,
                data: email
            });
        });
        this.updateEmailCategory = (0, errorHandler_1.asyncHandler)(async (req, res) => {
            const { id } = req.params;
            const { category } = req.body;
            if (!category) {
                return res.status(400).json({
                    success: false,
                    error: 'Category is required'
                });
            }
            await this.emailIndexService.updateEmailCategory(id, category);
            if (category === 'Interested') {
                const email = await this.emailIndexService.getEmailById(id);
                if (email) {
                    await this.webhookService.triggerInterestedEmailWebhooks({
                        ...email,
                        aiCategory: 'Interested'
                    });
                }
                else {
                    logger_1.logger.warn(`Email ${id} not found after category update; skipping webhook trigger.`);
                }
            }
            return res.json({
                success: true,
                message: 'Email category updated successfully'
            });
        });
        this.suggestReply = (0, errorHandler_1.asyncHandler)(async (req, res) => {
            const { id } = req.params;
            const email = await this.emailIndexService.getEmailById(id);
            if (!email) {
                return res.status(404).json({
                    success: false,
                    error: 'Email not found'
                });
            }
            const suggestedReply = await this.ragService.suggestReply(email);
            return res.json({
                success: true,
                data: {
                    emailId: id,
                    suggestedReply,
                    generatedAt: new Date().toISOString()
                }
            });
        });
        this.getEmailStats = (0, errorHandler_1.asyncHandler)(async (req, res) => {
            const stats = await this.emailIndexService.getEmailStats();
            res.json({
                success: true,
                data: stats
            });
        });
        this.deleteEmail = (0, errorHandler_1.asyncHandler)(async (req, res) => {
            const { id } = req.params;
            await this.emailIndexService.deleteEmail(id);
            res.json({
                success: true,
                message: 'Email deleted successfully'
            });
        });
        this.bulkIndexEmails = (0, errorHandler_1.asyncHandler)(async (req, res) => {
            const { emails } = req.body;
            if (!Array.isArray(emails)) {
                return res.status(400).json({
                    success: false,
                    error: 'Emails must be an array'
                });
            }
            await this.emailIndexService.bulkIndexEmails(emails);
            return res.json({
                success: true,
                message: `Bulk indexed ${emails.length} emails successfully`
            });
        });
        this.reindexAll = (0, errorHandler_1.asyncHandler)(async (req, res) => {
            await this.emailIndexService.reindexAll();
            res.json({
                success: true,
                message: 'Full reindex completed successfully'
            });
        });
        this.advancedSearch = (0, errorHandler_1.asyncHandler)(async (req, res) => {
            const { query, filters = {}, pagination = {}, sort = {} } = req.body;
            const searchQuery = {
                query: query || '',
                accountId: filters.accountId,
                folder: filters.folder,
                category: filters.category,
                from: filters.from,
                to: filters.to,
                dateFrom: filters.dateFrom ? new Date(filters.dateFrom) : undefined,
                dateTo: filters.dateTo ? new Date(filters.dateTo) : undefined,
                hasAttachments: filters.hasAttachments,
                page: Math.max(1, pagination.page || 1),
                size: Math.min(100, Math.max(1, pagination.size || 20)),
                sortBy: sort.field || 'date',
                sortOrder: sort.order || 'desc'
            };
            const results = await this.emailIndexService.searchEmails(searchQuery);
            res.json({
                success: true,
                data: results,
                meta: {
                    query: {
                        search: query || '',
                        filters,
                        pagination: {
                            page: searchQuery.page,
                            size: searchQuery.size,
                            totalPages: results.totalPages,
                            totalResults: results.total
                        },
                        sort: {
                            field: searchQuery.sortBy,
                            order: searchQuery.sortOrder
                        }
                    }
                }
            });
        });
        this.emailIndexService = new email_index_service_1.EmailIndexService();
        this.ragService = new rag_service_1.RAGService();
        this.webhookService = new webhook_service_1.WebhookService();
    }
}
exports.EmailController = EmailController;
exports.default = EmailController;
//# sourceMappingURL=email.controller.js.map