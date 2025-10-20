import { createEmailIndex } from '../config/elasticsearch';
import { createCollection } from '../config/qdrant';
import { logger } from '../utils/logger';

async function setupIndices() {
  try {
    logger.info('🔧 Setting up Elasticsearch index...');
    await createEmailIndex();
    
    logger.info('🔧 Setting up Qdrant collection...');
    await createCollection();
    
    logger.info('✅ All indices created successfully!');
    process.exit(0);
  } catch (error) {
    logger.error('❌ Error setting up indices:', error);
    process.exit(1);
  }
}

setupIndices();

