"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const env_1 = require("./config/env");
const logger_1 = require("./utils/logger");
const elasticsearch_1 = require("./config/elasticsearch");
const qdrant_1 = require("./config/qdrant");
const imap_service_1 = require("./services/imap.service");
const ai_categorizer_service_1 = require("./services/ai-categorizer.service");
const webhook_service_1 = require("./services/webhook.service");
const rag_service_1 = require("./services/rag.service");
const email_index_service_1 = require("./services/email-index.service");
const routes_1 = __importDefault(require("./routes"));
const error_middleware_1 = require("./middlewares/error.middleware");
const requestLogger_middleware_1 = require("./middlewares/requestLogger.middleware");
class Application {
    constructor() {
        this.app = (0, express_1.default)();
        this.initializeServices();
        this.setupMiddleware();
        this.setupRoutes();
        this.setupErrorHandling();
    }
    initializeServices() {
        this.imapService = new imap_service_1.IMAPService();
        this.aiCategorizer = new ai_categorizer_service_1.AICategorizerService();
        this.webhookService = new webhook_service_1.WebhookService();
        this.ragService = new rag_service_1.RAGService();
        this.emailIndexService = new email_index_service_1.EmailIndexService();
    }
    setupMiddleware() {
        this.app.use((0, helmet_1.default)());
        this.app.use((0, cors_1.default)({
            origin: process.env.FRONTEND_URL || 'http://localhost:3000',
            credentials: true
        }));
        this.app.use(express_1.default.json({ limit: '10mb' }));
        this.app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
        this.app.use(requestLogger_middleware_1.requestLogger);
    }
    setupRoutes() {
        this.app.use('/api', routes_1.default);
        this.app.get('/', (req, res) => {
            res.json({
                success: true,
                message: 'ReachInbox Onebox API',
                version: '1.0.0',
                endpoints: {
                    health: '/api/health',
                    emails: '/api/emails',
                    accounts: '/api/accounts'
                }
            });
        });
    }
    setupErrorHandling() {
        this.app.use(error_middleware_1.notFoundHandler);
        this.app.use(error_middleware_1.globalErrorHandler);
    }
    async setupEmailProcessing() {
        this.imapService.on('emailReceived', async (email) => {
            try {
                logger_1.logger.info(`📧 Processing new email: ${email.subject}`);
                await this.emailIndexService.indexEmail(email);
                const category = await this.aiCategorizer.categorizeEmail(email);
                await this.emailIndexService.updateEmailCategory(email.id, category);
                if (category === 'Interested') {
                    await this.webhookService.triggerInterestedEmailWebhooks({
                        ...email,
                        aiCategory: category
                    });
                }
                logger_1.logger.info(`✅ Email processing completed: ${email.subject} -> ${category}`);
            }
            catch (error) {
                logger_1.logger.error(`❌ Error processing email ${email.id}:`, error);
            }
        });
        this.imapService.on('accountStatusChanged', (status) => {
            logger_1.logger.info(`📊 Account status changed: ${status.accountId} - Connected: ${status.isConnected}`);
        });
    }
    async initialize() {
        try {
            logger_1.logger.info('🚀 Initializing ReachInbox Onebox...');
            logger_1.logger.info('📊 Setting up Elasticsearch...');
            await (0, elasticsearch_1.createEmailIndex)();
            logger_1.logger.info('🧠 Setting up Qdrant Vector Database...');
            await (0, qdrant_1.createCollection)();
            logger_1.logger.info('🌱 Seeding product data for RAG...');
            await this.ragService.seedProductData();
            logger_1.logger.info('⚙️  Setting up email processing pipeline...');
            await this.setupEmailProcessing();
            logger_1.logger.info('📧 Connecting to IMAP accounts...');
            await this.imapService.connectAll();
            logger_1.logger.info('✅ ReachInbox Onebox initialized successfully!');
        }
        catch (error) {
            logger_1.logger.error('❌ Failed to initialize application:', error);
            throw error;
        }
    }
    async start() {
        try {
            await this.initialize();
            this.app.listen(env_1.config.port, () => {
                logger_1.logger.info(`🌐 Server running on port ${env_1.config.port}`);
                logger_1.logger.info(`📡 API available at http://localhost:${env_1.config.port}/api`);
                logger_1.logger.info(`🔍 Health check: http://localhost:${env_1.config.port}/api/health`);
            });
        }
        catch (error) {
            logger_1.logger.error('❌ Failed to start application:', error);
            process.exit(1);
        }
    }
    async gracefulShutdown() {
        logger_1.logger.info('🛑 Gracefully shutting down...');
        try {
            await this.imapService.disconnectAll();
            logger_1.logger.info('✅ Graceful shutdown completed');
            process.exit(0);
        }
        catch (error) {
            logger_1.logger.error('❌ Error during graceful shutdown:', error);
            process.exit(1);
        }
    }
}
process.on('SIGTERM', async () => {
    logger_1.logger.info('SIGTERM received');
    await app.gracefulShutdown();
});
process.on('SIGINT', async () => {
    logger_1.logger.info('SIGINT received');
    await app.gracefulShutdown();
});
process.on('uncaughtException', (error) => {
    logger_1.logger.error('Uncaught Exception:', error);
    process.exit(1);
});
process.on('unhandledRejection', (reason, promise) => {
    logger_1.logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});
const app = new Application();
app.start();
exports.default = app;
//# sourceMappingURL=app.js.map