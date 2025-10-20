"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const elasticsearch_1 = require("../config/elasticsearch");
const logger_1 = require("../utils/logger");
async function recreateEmailIndex() {
    try {
        logger_1.logger.info('🔄 Recreating email index with improved mapping...');
        const indexExists = await elasticsearch_1.elasticsearchClient.indices.exists({
            index: 'emails'
        });
        if (indexExists) {
            await elasticsearch_1.elasticsearchClient.indices.delete({
                index: 'emails'
            });
            logger_1.logger.info('🗑️  Deleted existing emails index');
        }
        await elasticsearch_1.elasticsearchClient.indices.create({
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
        logger_1.logger.info('✅ Email index recreated with improved mapping');
        logger_1.logger.info('📊 Index features:');
        logger_1.logger.info('  - Full-text search on subject and body with custom analyzer');
        logger_1.logger.info('  - Keyword indexing for accountId, folder, and categories');
        logger_1.logger.info('  - Multi-field support for flexible searching');
        logger_1.logger.info('  - HTML stripping and text cleaning for better search quality');
        process.exit(0);
    }
    catch (error) {
        logger_1.logger.error('❌ Error recreating email index:', error);
        process.exit(1);
    }
}
recreateEmailIndex();
//# sourceMappingURL=recreateIndex.js.map