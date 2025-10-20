import { EmailDocument, EmailCategory } from '../models/email.interface';
export declare class AICategorizerService {
    private genAI;
    private model;
    private maxRetries;
    private baseDelay;
    private availableModels;
    constructor();
    categorizeEmail(email: EmailDocument): Promise<EmailCategory>;
    private ruleBasedCategorization;
    private buildCategorizationPrompt;
    categorizeBatch(emails: EmailDocument[]): Promise<Map<string, EmailCategory>>;
    private withExponentialBackoff;
    getCategorizationStats(): Promise<{
        total: number;
        byCategory: Record<EmailCategory, number>;
    }>;
    recategorizeEmail(emailId: string, newCategory: EmailCategory): Promise<void>;
    getCategoryInsights(): Promise<{
        mostCommonCategory: EmailCategory;
        averageResponseTime: number;
        conversionRate: number;
    }>;
}
export default AICategorizerService;
//# sourceMappingURL=ai-categorizer.service.d.ts.map