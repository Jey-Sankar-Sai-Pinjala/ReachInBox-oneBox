import { QdrantClient } from '@qdrant/js-client-rest';
import { config } from './env';

export const qdrantClient = new QdrantClient({
  url: config.qdrant.url
});

export const createCollection = async (): Promise<void> => {
  try {
    const collections = await qdrantClient.getCollections();
    const collectionExists = collections.collections.some(
      (col: any) => col.name === config.qdrant.collection
    );

    if (!collectionExists) {
      await qdrantClient.createCollection(config.qdrant.collection, {
        vectors: {
          size: 768, // Gemini embedding dimension
          distance: 'Cosine'
        }
      });
      console.log(`✅ Qdrant collection '${config.qdrant.collection}' created successfully`);
    } else {
      console.log(`ℹ️  Qdrant collection '${config.qdrant.collection}' already exists`);
    }
  } catch (error) {
    console.error('❌ Error creating Qdrant collection:', error);
    throw error;
  }
};

export const upsertVector = async (id: string, vector: number[], payload: any): Promise<void> => {
  try {
    await qdrantClient.upsert(config.qdrant.collection, {
      points: [
        {
          id: id,
          vector: vector,
          payload: payload
        }
      ]
    });
    console.log(`📊 Vector upserted: ${id}`);
  } catch (error) {
    console.error('❌ Error upserting vector:', error);
    throw error;
  }
};

export const searchSimilar = async (queryVector: number[], limit: number = 3): Promise<any[]> => {
  try {
    const response = await qdrantClient.search(config.qdrant.collection, {
      vector: queryVector,
      limit: limit,
      with_payload: true
    });
    return response;
  } catch (error) {
    console.error('❌ Error searching similar vectors:', error);
    throw error;
  }
};

export default qdrantClient;

