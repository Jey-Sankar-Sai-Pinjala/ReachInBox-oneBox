import { QdrantClient } from '@qdrant/js-client-rest';
export declare const qdrantClient: QdrantClient;
export declare const createCollection: () => Promise<void>;
export declare const upsertVector: (id: string, vector: number[], payload: any) => Promise<void>;
export declare const searchSimilar: (queryVector: number[], limit?: number) => Promise<any[]>;
export default qdrantClient;
//# sourceMappingURL=qdrant.d.ts.map