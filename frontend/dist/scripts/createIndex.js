"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const elasticsearch_1 = require("../config/elasticsearch");
const qdrant_1 = require("../config/qdrant");
const logger_1 = require("../utils/logger");
async function setupIndices() {
    try {
        logger_1.logger.info('🔧 Setting up Elasticsearch index...');
        await (0, elasticsearch_1.createEmailIndex)();
        logger_1.logger.info('🔧 Setting up Qdrant collection...');
        await (0, qdrant_1.createCollection)();
        logger_1.logger.info('✅ All indices created successfully!');
        process.exit(0);
    }
    catch (error) {
        logger_1.logger.error('❌ Error setting up indices:', error);
        process.exit(1);
    }
}
setupIndices();
//# sourceMappingURL=createIndex.js.map