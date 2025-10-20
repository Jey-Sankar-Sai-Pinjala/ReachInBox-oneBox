"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const rag_service_1 = require("../services/rag.service");
const logger_1 = require("../utils/logger");
async function seedVectorData() {
    try {
        logger_1.logger.info('🌱 Seeding vector database with product data...');
        const ragService = new rag_service_1.RAGService();
        await ragService.seedProductData();
        logger_1.logger.info('✅ Vector database seeded successfully!');
        process.exit(0);
    }
    catch (error) {
        logger_1.logger.error('❌ Error seeding vector database:', error);
        process.exit(1);
    }
}
seedVectorData();
//# sourceMappingURL=seedVectors.js.map