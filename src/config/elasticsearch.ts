import { Client } from '@elastic/elasticsearch';
import { config } from './env';

export const elasticsearchClient = new Client({
  node: config.elasticsearch.url,
  requestTimeout: 30000,
  maxRetries: 3,
  resurrectStrategy: 'ping'
});

export const createEmailIndex = async (): Promise<void> => {
  try {
    const indexExists = await elasticsearchClient.indices.exists({
      index: config.elasticsearch.index
    });

    if (!indexExists) {
      await elasticsearchClient.indices.create({
        index: config.elasticsearch.index,
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
      console.log(`✅ Elasticsearch index '${config.elasticsearch.index}' created successfully`);
    } else {
      console.log(`ℹ️  Elasticsearch index '${config.elasticsearch.index}' already exists`);
    }
  } catch (error) {
    console.error('❌ Error creating Elasticsearch index:', error);
    throw error;
  }
};

export const indexEmail = async (emailData: any): Promise<void> => {
  try {
    await elasticsearchClient.index({
      index: config.elasticsearch.index,
      id: emailData.id,
      document: emailData
    });
    console.log(`📧 Email indexed: ${emailData.subject}`);
  } catch (error) {
    console.error('❌ Error indexing email:', error);
    throw error;
  }
};

export const searchEmails = async (query: any): Promise<any> => {
  try {
    const response = await elasticsearchClient.search({
      index: config.elasticsearch.index,
      ...query
    });
    return response;
  } catch (error) {
    console.error('❌ Error searching emails:', error);
    throw error;
  }
};

export const updateEmailCategory = async (emailId: string, category: string): Promise<void> => {
  try {
    await elasticsearchClient.update({
      index: config.elasticsearch.index,
      id: emailId,
      doc: {
        aiCategory: category,
        updatedAt: new Date().toISOString()
      }
    });
    console.log(`🏷️  Email category updated: ${emailId} -> ${category}`);
  } catch (error) {
    console.error('❌ Error updating email category:', error);
    throw error;
  }
};

export default elasticsearchClient;

