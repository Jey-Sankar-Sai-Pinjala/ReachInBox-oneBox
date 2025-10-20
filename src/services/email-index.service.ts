import { logger } from '../utils/logger';
import { EmailDocument, EmailSearchQuery, EmailSearchResult } from '../models/email.interface';
import { elasticsearchClient, indexEmail, searchEmails, updateEmailCategory } from '../config/elasticsearch';

export class EmailIndexService {
  public async indexEmail(email: EmailDocument): Promise<void> {
    try {
      await indexEmail(email);
      logger.info(`📧 Email indexed successfully: ${email.subject}`);
    } catch (error) {
      logger.error(`❌ Error indexing email ${email.id}:`, error);
      throw error;
    }
  }

  public async searchEmails(query: EmailSearchQuery): Promise<EmailSearchResult> {
    try {
      const {
        query: searchQuery = '',
        accountId,
        folder,
        category,
        from,
        to,
        dateFrom,
        dateTo,
        page = 1,
        size = 20,
        sortBy = 'date',
        sortOrder = 'desc',
        hasAttachments
      } = query;

      const fromIndex = (page - 1) * size;
      
      const esQuery: any = {
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

      // Add text search if query is provided
      if (searchQuery) {
        // Check if it's a query_string (contains operators like AND, OR, quotes, etc.)
        const isQueryString = /["'()]|AND|OR|NOT|\+|\-|\*|\?|~/.test(searchQuery);
        
        if (isQueryString) {
          // Use query_string for advanced queries with operators
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
        } else {
          // Use multi_match for simple text search
          esQuery.query.bool.must.push({
            multi_match: {
              query: searchQuery,
              fields: [
                'subject^3',           // Subject has highest weight
                'subject.raw^2',       // Exact subject matches
                'body^1',              // Body content
                'body.raw^0.5',        // Raw body for exact matches
                'from.text^1.5',       // From field text search
                'to.text^1'            // To field text search
              ],
              type: 'best_fields',
              fuzziness: 'AUTO',
              minimum_should_match: '75%'
            }
          });
        }
      }

      // Add filters (using filter clause for exact matches - doesn't affect search score)
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
        // Support both exact match and wildcard search for from field
        if (from.includes('*') || from.includes('?')) {
          esQuery.query.bool.filter.push({
            wildcard: { from: from }
          });
        } else {
          esQuery.query.bool.filter.push({
            term: { from: from }
          });
        }
      }

      if (to) {
        // Support both exact match and wildcard search for to field
        if (to.includes('*') || to.includes('?')) {
          esQuery.query.bool.filter.push({
            wildcard: { to: to }
          });
        } else {
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
        const dateRange: any = {};
        if (dateFrom) dateRange.gte = dateFrom.toISOString();
        if (dateTo) dateRange.lte = dateTo.toISOString();
        
        esQuery.query.bool.filter.push({
          range: { date: dateRange }
        });
      }

      // If no search query and no filters, return all emails
      if (!searchQuery && esQuery.query.bool.filter.length === 0) {
        esQuery.query = { match_all: {} };
      }

      const response = await searchEmails(esQuery);
      
      const hits = response.hits.hits.map((hit: any) => ({
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
    } catch (error) {
      logger.error('❌ Error searching emails:', error);
      throw error;
    }
  }

  public async getEmailById(emailId: string): Promise<EmailDocument | null> {
    try {
      const response = await elasticsearchClient.get({
        index: 'emails',
        id: emailId
      });

      return {
        ...(response._source as any),
        id: response._id
      };
    } catch (error) {
      if ((error as any).statusCode === 404) {
        return null;
      }
      logger.error(`❌ Error getting email ${emailId}:`, error);
      throw error;
    }
  }

  public async updateEmailCategory(emailId: string, category: string): Promise<void> {
    try {
      await updateEmailCategory(emailId, category);
      logger.info(`🏷️  Email category updated: ${emailId} -> ${category}`);
    } catch (error) {
      logger.error(`❌ Error updating email category ${emailId}:`, error);
      throw error;
    }
  }

  public async getEmailStats(): Promise<{
    totalEmails: number;
    byCategory: Record<string, number>;
    byAccount: Record<string, number>;
    byFolder: Record<string, number>;
    recentActivity: {
      last24Hours: number;
      last7Days: number;
      last30Days: number;
    };
  }> {
    try {
      // Get total count
      const totalResponse = await elasticsearchClient.count({
        index: 'emails'
      });

      // Get category aggregation
      const categoryResponse = await elasticsearchClient.search({
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

      // Get account aggregation
      const accountResponse = await elasticsearchClient.search({
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

      // Get folder aggregation
      const folderResponse = await elasticsearchClient.search({
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

      // Get recent activity
      const now = new Date();
      const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const [last24Response, last7Response, last30Response] = await Promise.all([
        elasticsearchClient.count({
          index: 'emails',
          body: {
            query: {
              range: {
                indexedAt: { gte: last24Hours.toISOString() }
              }
            }
          }
        }),
        elasticsearchClient.count({
          index: 'emails',
          body: {
            query: {
              range: {
                indexedAt: { gte: last7Days.toISOString() }
              }
            }
          }
        }),
        elasticsearchClient.count({
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
        byCategory: this.formatAggregation((categoryResponse.aggregations as any)?.by_category?.buckets || []),
        byAccount: this.formatAggregation((accountResponse.aggregations as any)?.by_account?.buckets || []),
        byFolder: this.formatAggregation((folderResponse.aggregations as any)?.by_folder?.buckets || []),
        recentActivity: {
          last24Hours: last24Response.count,
          last7Days: last7Response.count,
          last30Days: last30Response.count
        }
      };
    } catch (error) {
      logger.error('❌ Error getting email stats:', error);
      throw error;
    }
  }

  private formatAggregation(buckets: any[]): Record<string, number> {
    const result: Record<string, number> = {};
    buckets.forEach(bucket => {
      result[bucket.key] = bucket.doc_count;
    });
    return result;
  }

  public async deleteEmail(emailId: string): Promise<void> {
    try {
      await elasticsearchClient.delete({
        index: 'emails',
        id: emailId
      });
      logger.info(`🗑️  Email deleted: ${emailId}`);
    } catch (error) {
      logger.error(`❌ Error deleting email ${emailId}:`, error);
      throw error;
    }
  }

  public async bulkIndexEmails(emails: EmailDocument[]): Promise<void> {
    try {
      const body = emails.flatMap(email => [
        { index: { _index: 'emails', _id: email.id } },
        email
      ]);

      await elasticsearchClient.bulk({ body });
      logger.info(`📦 Bulk indexed ${emails.length} emails`);
    } catch (error) {
      logger.error('❌ Error bulk indexing emails:', error);
      throw error;
    }
  }

  public async reindexAll(): Promise<void> {
    try {
      logger.info('🔄 Starting full reindex...');
      
      // Delete existing index
      await elasticsearchClient.indices.delete({
        index: 'emails'
      });

      // Recreate index with improved mapping
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

      logger.info('✅ Full reindex completed');
    } catch (error) {
      logger.error('❌ Error during full reindex:', error);
      throw error;
    }
  }
}

export default EmailIndexService;

