import { RAGService } from '../services/rag.service';
import { logger } from '../utils/logger';

async function seedVectorData() {
  try {
    logger.info('🌱 Seeding vector database with product data...');
    
    const ragService = new RAGService();
    await ragService.seedProductData();
    
    logger.info('✅ Vector database seeded successfully!');
    process.exit(0);
  } catch (error) {
    logger.error('❌ Error seeding vector database:', error);
    process.exit(1);
  }
}

seedVectorData();

