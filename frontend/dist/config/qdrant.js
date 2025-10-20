"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchSimilar = exports.upsertVector = exports.createCollection = exports.qdrantClient = void 0;
const js_client_rest_1 = require("@qdrant/js-client-rest");
const env_1 = require("./env");
exports.qdrantClient = new js_client_rest_1.QdrantClient({
    url: env_1.config.qdrant.url
});
const createCollection = async () => {
    try {
        const collections = await exports.qdrantClient.getCollections();
        const collectionExists = collections.collections.some((col) => col.name === env_1.config.qdrant.collection);
        if (!collectionExists) {
            await exports.qdrantClient.createCollection(env_1.config.qdrant.collection, {
                vectors: {
                    size: 768,
                    distance: 'Cosine'
                }
            });
            console.log(`✅ Qdrant collection '${env_1.config.qdrant.collection}' created successfully`);
        }
        else {
            console.log(`ℹ️  Qdrant collection '${env_1.config.qdrant.collection}' already exists`);
        }
    }
    catch (error) {
        console.error('❌ Error creating Qdrant collection:', error);
        throw error;
    }
};
exports.createCollection = createCollection;
const upsertVector = async (id, vector, payload) => {
    try {
        await exports.qdrantClient.upsert(env_1.config.qdrant.collection, {
            points: [
                {
                    id: id,
                    vector: vector,
                    payload: payload
                }
            ]
        });
        console.log(`📊 Vector upserted: ${id}`);
    }
    catch (error) {
        console.error('❌ Error upserting vector:', error);
        throw error;
    }
};
exports.upsertVector = upsertVector;
const searchSimilar = async (queryVector, limit = 3) => {
    try {
        const response = await exports.qdrantClient.search(env_1.config.qdrant.collection, {
            vector: queryVector,
            limit: limit,
            with_payload: true
        });
        return response;
    }
    catch (error) {
        console.error('❌ Error searching similar vectors:', error);
        throw error;
    }
};
exports.searchSimilar = searchSimilar;
exports.default = exports.qdrantClient;
//# sourceMappingURL=qdrant.js.map