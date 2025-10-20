import { elasticsearchClient } from '../config/elasticsearch';
import { logger } from '../utils/logger';

async function recreateEmailIndex() {
  try {
    logger.info('🔄 Recreating email index with improved mapping...');
    
    // Delete existing index if it exists
    const indexExists = await elasticsearchClient.indices.exists({
      index: 'emails'
    });

    if (indexExists) {
      await elasticsearchClient.indices.delete({
        index: 'emails'
      });
      logger.info('🗑️  Deleted existing emails index');
    }

    // Create new index with improved mapping
    await elasticsearchClient.indices.create({
      index: 'emails',
      body: {
        mappings: {
          properties: {
            id: { type: 'keyword' },
            accountId: { type: 'keyword' },
            folder: { type: 'keyword' },
            subject: { 
              type: 'text', 
              analyzer: 'email_analyzer',
              fields: {
                keyword: { type: 'keyword' },
                raw: { type: 'text', analyzer: 'standard' }
              }
            },
            body: { 
              type: 'text', 
              analyzer: 'email_analyzer',
              fields: {
                raw: { type: 'text', analyzer: 'standard' }
              }
            },
            from: { 
              type: 'keyword',
              fields: {
                text: { type: 'text', analyzer: 'standard' }
              }
            },
            to: { 
              type: 'keyword',
              fields: {
                text: { type: 'text', analyzer: 'standard' }
              }
            },
            date: { type: 'date' },
            aiCategory: { type: 'keyword' },
            indexedAt: { type: 'date' },
            messageId: { type: 'keyword' },
            threadId: { type: 'keyword' },
            hasAttachments: { type: 'boolean' },
            attachmentCount: { type: 'integer' },
            updatedAt: { type: 'date' }
          }
        },
        settings: {
          number_of_shards: 1,
          number_of_replicas: 0,
          analysis: {
            analyzer: {
              email_analyzer: {
                type: 'custom',
                tokenizer: 'standard',
                filter: ['lowercase', 'stop', 'snowball', 'asciifolding']
              }
            }
          }
        }
      }
    });

    logger.info('✅ Email index recreated with improved mapping');
    logger.info('📊 Index features:');
    logger.info('  - Full-text search on subject and body with custom analyzer');
    logger.info('  - Keyword indexing for accountId, folder, and categories');
    logger.info('  - Multi-field support for flexible searching');
    logger.info('  - HTML stripping and text cleaning for better search quality');
    
    process.exit(0);
  } catch (error) {
    logger.error('❌ Error recreating email index:', error);
    process.exit(1);
  }
}

recreateEmailIndex();
