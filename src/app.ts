import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config/env';
import { logger } from './utils/logger';
import { createEmailIndex } from './config/elasticsearch';
import { createCollection } from './config/qdrant';
import { IMAPService } from './services/imap.service';
import { AICategorizerService } from './services/ai-categorizer.service';
import { WebhookService } from './services/webhook.service';
import { RAGService } from './services/rag.service';
import { EmailIndexService } from './services/email-index.service';
import routes from './routes';
import { globalErrorHandler, notFoundHandler } from './middlewares/error.middleware';
import { requestLogger } from './middlewares/requestLogger.middleware';

class Application {
  private app: express.Application;
  private imapService!: IMAPService;
  private aiCategorizer!: AICategorizerService;
  private webhookService!: WebhookService;
  private ragService!: RAGService;
  private emailIndexService!: EmailIndexService;

  constructor() {
    this.app = express();
    this.initializeServices();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  private initializeServices(): void {
    this.imapService = new IMAPService();
    this.aiCategorizer = new AICategorizerService();
    this.webhookService = new WebhookService();
    this.ragService = new RAGService();
    this.emailIndexService = new EmailIndexService();
  }

  private setupMiddleware(): void {
    // Security middleware
    this.app.use(helmet());
    
    // CORS middleware
    this.app.use(cors({
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      credentials: true
    }));

    // Body parsing middleware
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Request logging
    this.app.use(requestLogger);
  }

  private setupRoutes(): void {
    // API routes
    this.app.use('/api', routes);

    // Root endpoint
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

  private setupErrorHandling(): void {
    // 404 handler
    this.app.use(notFoundHandler);
    
    // Global error handler
    this.app.use(globalErrorHandler);
  }

  private async setupEmailProcessing(): Promise<void> {
    // Set up email processing pipeline
    this.imapService.on('emailReceived', async (email) => {
      try {
        logger.info(`📧 Processing new email: ${email.subject}`);
        
        // 1. Index email in Elasticsearch
        await this.emailIndexService.indexEmail(email);
        
        // 2. Categorize email using AI
        const category = await this.aiCategorizer.categorizeEmail(email);
        
        // 3. Update email category in Elasticsearch
        await this.emailIndexService.updateEmailCategory(email.id, category);
        
        // 4. Trigger webhooks if email is "Interested"
        if (category === 'Interested') {
          await this.webhookService.triggerInterestedEmailWebhooks({
            ...email,
            aiCategory: category
          });
        }
        
        logger.info(`✅ Email processing completed: ${email.subject} -> ${category}`);
      } catch (error) {
        logger.error(`❌ Error processing email ${email.id}:`, error);
      }
    });

    // Set up account status monitoring
    this.imapService.on('accountStatusChanged', (status) => {
      logger.info(`📊 Account status changed: ${status.accountId} - Connected: ${status.isConnected}`);
    });
  }

  public async initialize(): Promise<void> {
    try {
      logger.info('🚀 Initializing ReachInbox Onebox...');

      // 1. Initialize Elasticsearch
      logger.info('📊 Setting up Elasticsearch...');
      await createEmailIndex();

      // 2. Initialize Qdrant Vector Database
      logger.info('🧠 Setting up Qdrant Vector Database...');
      await createCollection();

      // 3. Seed product data for RAG
      logger.info('🌱 Seeding product data for RAG...');
      await this.ragService.seedProductData();

      // 4. Set up email processing pipeline
      logger.info('⚙️  Setting up email processing pipeline...');
      await this.setupEmailProcessing();

      // 5. Connect to IMAP accounts
      logger.info('📧 Connecting to IMAP accounts...');
      await this.imapService.connectAll();

      logger.info('✅ ReachInbox Onebox initialized successfully!');
    } catch (error) {
      logger.error('❌ Failed to initialize application:', error);
      throw error;
    }
  }

  public async start(): Promise<void> {
    try {
      await this.initialize();
      
      this.app.listen(config.port, () => {
        logger.info(`🌐 Server running on port ${config.port}`);
        logger.info(`📡 API available at http://localhost:${config.port}/api`);
        logger.info(`🔍 Health check: http://localhost:${config.port}/api/health`);
      });
    } catch (error) {
      logger.error('❌ Failed to start application:', error);
      process.exit(1);
    }
  }

  public async gracefulShutdown(): Promise<void> {
    logger.info('🛑 Gracefully shutting down...');
    
    try {
      // Disconnect IMAP connections
      await this.imapService.disconnectAll();
      
      logger.info('✅ Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      logger.error('❌ Error during graceful shutdown:', error);
      process.exit(1);
    }
  }
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received');
  await app.gracefulShutdown();
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received');
  await app.gracefulShutdown();
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

const app = new Application();
app.start();

export default app;

