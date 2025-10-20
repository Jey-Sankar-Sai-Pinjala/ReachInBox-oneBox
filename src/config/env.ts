import dotenv from 'dotenv';

dotenv.config();

export interface Config {
  port: number;
  nodeEnv: string;
  elasticsearch: {
    url: string;
    index: string;
  };
  qdrant: {
    url: string;
    collection: string;
  };
  imap: {
    accounts: Array<{
      id: string;
      host: string;
      port: number;
      user: string;
      password: string;
      ssl: boolean;
    }>;
  };
  gemini: {
    apiKey: string;
  };
  slack: {
    webhookUrl: string;
  };
  webhook: {
    siteUrl: string;
  };
  logging: {
    level: string;
  };
}

const getImapAccounts = (): Config['imap']['accounts'] => {
  const accounts = [];
  
  // Account 1
  if (process.env.IMAP_HOST_1 && process.env.IMAP_USER_1 && process.env.IMAP_PASS_1) {
    accounts.push({
      id: 'account1',
      host: process.env.IMAP_HOST_1,
      port: parseInt(process.env.IMAP_PORT_1 || '993'),
      user: process.env.IMAP_USER_1,
      password: process.env.IMAP_PASS_1,
      ssl: process.env.IMAP_SSL_1 === 'true'
    });
  }

  // Account 2
  if (process.env.IMAP_HOST_2 && process.env.IMAP_USER_2 && process.env.IMAP_PASS_2) {
    accounts.push({
      id: 'account2',
      host: process.env.IMAP_HOST_2,
      port: parseInt(process.env.IMAP_PORT_2 || '993'),
      user: process.env.IMAP_USER_2,
      password: process.env.IMAP_PASS_2,
      ssl: process.env.IMAP_SSL_2 === 'true'
    });
  }

  return accounts;
};

export const config: Config = {
  port: parseInt(process.env.PORT || '3000'),
  nodeEnv: process.env.NODE_ENV || 'development',
  elasticsearch: {
    url: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
    index: process.env.ELASTICSEARCH_INDEX || 'emails'
  },
  qdrant: {
    url: process.env.QDRANT_URL || 'http://localhost:6333',
    collection: process.env.QDRANT_COLLECTION || 'product_data'
  },
  imap: {
    accounts: getImapAccounts()
  },
  gemini: {
    apiKey: process.env.GEMINI_API_KEY || ''
  },
  slack: {
    webhookUrl: process.env.SLACK_WEBHOOK_URL || ''
  },
  webhook: {
    siteUrl: process.env.WEBHOOK_SITE_URL || ''
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info'
  }
};

export default config;

