"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailIndexService = void 0;
const logger_1 = require("../utils/logger");
const elasticsearch_1 = require("../config/elasticsearch");
class EmailIndexService {
    async indexEmail(email) {
        try {
            await (0, elasticsearch_1.indexEmail)(email);
            logger_1.logger.info(`📧 Email indexed successfully: ${email.subject}`);
        }
        catch (error) {
            logger_1.logger.error(`❌ Error indexing email ${email.id}:`, error);
            throw error;
        }
    }
    async searchEmails(query) {
        try {
            const { query: searchQuery = '', accountId, folder, category, from, to, dateFrom, dateTo, page = 1, size = 20, sortBy = 'date', sortOrder = 'desc', hasAttachments } = query;
            const fromIndex = (page - 1) * size;
            const esQuery = {
                query: {
                    bool: {
                        must: [],
                        filter: []
                    }
                },
                from: fromIndex,
                size: size,
                sort: [
                    { [sortBy]: { order: sortOrder } }
                ]
            };
            if (searchQuery) {
                const isQueryString = /["'()]|AND|OR|NOT|\+|\-|\*|\?|~/.test(searchQuery);
                if (isQueryString) {
                    esQuery.query.bool.must.push({
                        query_string: {
                            query: searchQuery,
                            fields: [
                                'subject^3',
                                'subject.raw^2',
                                'body^1',
                                'body.raw^0.5',
                                'from.text^1.5',
                                'to.text^1'
                            ],
                            default_operator: 'AND',
                            analyze_wildcard: true,
                            lenient: true
                        }
                    });
                }
                else {
                    esQuery.query.bool.must.push({
                        multi_match: {
                            query: searchQuery,
                            fields: [
                                'subject^3',
                                'subject.raw^2',
                                'body^1',
                                'body.raw^0.5',
                                'from.text^1.5',
                                'to.text^1'
                            ],
                            type: 'best_fields',
                            fuzziness: 'AUTO',
                            minimum_should_match: '75%'
                        }
                    });
                }
            }
            if (accountId) {
                esQuery.query.bool.filter.push({
                    term: { accountId }
                });
            }
            if (folder) {
                esQuery.query.bool.filter.push({
                    term: { folder }
                });
            }
            if (category) {
                esQuery.query.bool.filter.push({
                    term: { aiCategory: category }
                });
            }
            if (from) {
                if (from.includes('*') || from.includes('?')) {
                    esQuery.query.bool.filter.push({
                        wildcard: { from: from }
                    });
                }
                else {
                    esQuery.query.bool.filter.push({
                        term: { from: from }
                    });
                }
            }
            if (to) {
                if (to.includes('*') || to.includes('?')) {
                    esQuery.query.bool.filter.push({
                        wildcard: { to: to }
                    });
                }
                else {
                    esQuery.query.bool.filter.push({
                        term: { to: to }
                    });
                }
            }
            if (hasAttachments !== undefined) {
                esQuery.query.bool.filter.push({
                    term: { hasAttachments: hasAttachments }
                });
            }
            if (dateFrom || dateTo) {
                const dateRange = {};
                if (dateFrom)
                    dateRange.gte = dateFrom.toISOString();
                if (dateTo)
                    dateRange.lte = dateTo.toISOString();
                esQuery.query.bool.filter.push({
                    range: { date: dateRange }
                });
            }
            if (!searchQuery && esQuery.query.bool.filter.length === 0) {
                esQuery.query = { match_all: {} };
            }
            const response = await (0, elasticsearch_1.searchEmails)(esQuery);
            const hits = response.hits.hits.map((hit) => ({
                ...hit._source,
                id: hit._id
            }));
            const total = response.hits.total.value || response.hits.total;
            const totalPages = Math.ceil(total / size);
            return {
                hits,
                total,
                page,
                size,
                totalPages
            };
        }
        catch (error) {
            logger_1.logger.error('❌ Error searching emails:', error);
            throw error;
        }
    }
    async getEmailById(emailId) {
        try {
            const response = await elasticsearch_1.elasticsearchClient.get({
                index: 'emails',
                id: emailId
            });
            return {
                ...response._source,
                id: response._id
            };
        }
        catch (error) {
            if (error.statusCode === 404) {
                return null;
            }
            logger_1.logger.error(`❌ Error getting email ${emailId}:`, error);
            throw error;
        }
    }
    async updateEmailCategory(emailId, category) {
        try {
            await (0, elasticsearch_1.updateEmailCategory)(emailId, category);
            logger_1.logger.info(`🏷️  Email category updated: ${emailId} -> ${category}`);
        }
        catch (error) {
            logger_1.logger.error(`❌ Error updating email category ${emailId}:`, error);
            throw error;
        }
    }
    async getEmailStats() {
        try {
            const totalResponse = await elasticsearch_1.elasticsearchClient.count({
                index: 'emails'
            });
            const categoryResponse = await elasticsearch_1.elasticsearchClient.search({
                index: 'emails',
                body: {
                    size: 0,
                    aggs: {
                        by_category: {
                            terms: { field: 'aiCategory' }
                        }
                    }
                }
            });
            const accountResponse = await elasticsearch_1.elasticsearchClient.search({
                index: 'emails',
                body: {
                    size: 0,
                    aggs: {
                        by_account: {
                            terms: { field: 'accountId' }
                        }
                    }
                }
            });
            const folderResponse = await elasticsearch_1.elasticsearchClient.search({
                index: 'emails',
                body: {
                    size: 0,
                    aggs: {
                        by_folder: {
                            terms: { field: 'folder' }
                        }
                    }
                }
            });
            const now = new Date();
            const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            const [last24Response, last7Response, last30Response] = await Promise.all([
                elasticsearch_1.elasticsearchClient.count({
                    index: 'emails',
                    body: {
                        query: {
                            range: {
                                indexedAt: { gte: last24Hours.toISOString() }
                            }
                        }
                    }
                }),
                elasticsearch_1.elasticsearchClient.count({
                    index: 'emails',
                    body: {
                        query: {
                            range: {
                                indexedAt: { gte: last7Days.toISOString() }
                            }
                        }
                    }
                }),
                elasticsearch_1.elasticsearchClient.count({
                    index: 'emails',
                    body: {
                        query: {
                            range: {
                                indexedAt: { gte: last30Days.toISOString() }
                            }
                        }
                    }
                })
            ]);
            return {
                totalEmails: totalResponse.count,
                byCategory: this.formatAggregation(categoryResponse.aggregations?.by_category?.buckets || []),
                byAccount: this.formatAggregation(accountResponse.aggregations?.by_account?.buckets || []),
                byFolder: this.formatAggregation(folderResponse.aggregations?.by_folder?.buckets || []),
                recentActivity: {
                    last24Hours: last24Response.count,
                    last7Days: last7Response.count,
                    last30Days: last30Response.count
                }
            };
        }
        catch (error) {
            logger_1.logger.error('❌ Error getting email stats:', error);
            throw error;
        }
    }
    formatAggregation(buckets) {
        const result = {};
        buckets.forEach(bucket => {
            result[bucket.key] = bucket.doc_count;
        });
        return result;
    }
    async deleteEmail(emailId) {
        try {
            await elasticsearch_1.elasticsearchClient.delete({
                index: 'emails',
                id: emailId
            });
            logger_1.logger.info(`🗑️  Email deleted: ${emailId}`);
        }
        catch (error) {
            logger_1.logger.error(`❌ Error deleting email ${emailId}:`, error);
            throw error;
        }
    }
    async bulkIndexEmails(emails) {
        try {
            const body = emails.flatMap(email => [
                { index: { _index: 'emails', _id: email.id } },
                email
            ]);
            await elasticsearch_1.elasticsearchClient.bulk({ body });
            logger_1.logger.info(`📦 Bulk indexed ${emails.length} emails`);
        }
        catch (error) {
            logger_1.logger.error('❌ Error bulk indexing emails:', error);
            throw error;
        }
    }
    async reindexAll() {
        try {
            logger_1.logger.info('🔄 Starting full reindex...');
            await elasticsearch_1.elasticsearchClient.indices.delete({
                index: 'emails'
            });
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
            logger_1.logger.info('✅ Full reindex completed');
        }
        catch (error) {
            logger_1.logger.error('❌ Error during full reindex:', error);
            throw error;
        }
    }
}
exports.EmailIndexService = EmailIndexService;
exports.default = EmailIndexService;
//# sourceMappingURL=email-index.service.js.map