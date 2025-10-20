import { EmailDocument, EmailSearchQuery, EmailSearchResult } from '../models/email.interface';
export declare class EmailIndexService {
    indexEmail(email: EmailDocument): Promise<void>;
    searchEmails(query: EmailSearchQuery): Promise<EmailSearchResult>;
    getEmailById(emailId: string): Promise<EmailDocument | null>;
    updateEmailCategory(emailId: string, category: string): Promise<void>;
    getEmailStats(): Promise<{
        totalEmails: number;
        byCategory: Record<string, number>;
        byAccount: Record<string, number>;
        byFolder: Record<string, number>;
        recentActivity: {
            last24Hours: number;
            last7Days: number;
            last30Days: number;
        };
    }>;
    private formatAggregation;
    deleteEmail(emailId: string): Promise<void>;
    bulkIndexEmails(emails: EmailDocument[]): Promise<void>;
    reindexAll(): Promise<void>;
}
export default EmailIndexService;
//# sourceMappingURL=email-index.service.d.ts.map