"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateEmailCategory = exports.searchEmails = exports.indexEmail = exports.createEmailIndex = exports.elasticsearchClient = void 0;
const elasticsearch_1 = require("@elastic/elasticsearch");
const env_1 = require("./env");
exports.elasticsearchClient = new elasticsearch_1.Client({
    node: env_1.config.elasticsearch.url,
    requestTimeout: 30000,
    maxRetries: 3,
    resurrectStrategy: 'ping'
});
const createEmailIndex = async () => {
    try {
        const indexExists = await exports.elasticsearchClient.indices.exists({
            index: env_1.config.elasticsearch.index
        });
        if (!indexExists) {
            await exports.elasticsearchClient.indices.create({
                index: env_1.config.elasticsearch.index,
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
            });
            console.log(`✅ Elasticsearch index '${env_1.config.elasticsearch.index}' created successfully`);
        }
        else {
            console.log(`ℹ️  Elasticsearch index '${env_1.config.elasticsearch.index}' already exists`);
        }
    }
    catch (error) {
        console.error('❌ Error creating Elasticsearch index:', error);
        throw error;
    }
};
exports.createEmailIndex = createEmailIndex;
const indexEmail = async (emailData) => {
    try {
        await exports.elasticsearchClient.index({
            index: env_1.config.elasticsearch.index,
            id: emailData.id,
            document: emailData
        });
        console.log(`📧 Email indexed: ${emailData.subject}`);
    }
    catch (error) {
        console.error('❌ Error indexing email:', error);
        throw error;
    }
};
exports.indexEmail = indexEmail;
const searchEmails = async (query) => {
    try {
        const response = await exports.elasticsearchClient.search({
            index: env_1.config.elasticsearch.index,
            ...query
        });
        return response;
    }
    catch (error) {
        console.error('❌ Error searching emails:', error);
        throw error;
    }
};
exports.searchEmails = searchEmails;
const updateEmailCategory = async (emailId, category) => {
    try {
        await exports.elasticsearchClient.update({
            index: env_1.config.elasticsearch.index,
            id: emailId,
            doc: {
                aiCategory: category,
                updatedAt: new Date().toISOString()
            }
        });
        console.log(`🏷️  Email category updated: ${emailId} -> ${category}`);
    }
    catch (error) {
        console.error('❌ Error updating email category:', error);
        throw error;
    }
};
exports.updateEmailCategory = updateEmailCategory;
exports.default = exports.elasticsearchClient;
//# sourceMappingURL=elasticsearch.js.map