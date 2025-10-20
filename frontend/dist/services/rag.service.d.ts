import { EmailDocument } from '../models/email.interface';
export declare class RAGService {
    private genAI;
    private model;
    private embeddingModel;
    constructor();
    seedProductData(): Promise<void>;
    suggestReply(email: EmailDocument): Promise<string>;
    private generateEmbedding;
    private generateRAGReply;
    private generateGenericReply;
    private generateContextualReply;
    addCustomContext(content: string, type: string): Promise<void>;
    searchContext(query: string, limit?: number): Promise<any[]>;
    getContextStats(): Promise<{
        totalContexts: number;
        byType: Record<string, number>;
    }>;
    updateContext(id: string, content: string): Promise<void>;
    deleteContext(id: string): Promise<void>;
}
export default RAGService;
//# sourceMappingURL=rag.service.d.ts.map