export interface EmailDocument {
    id: string;
    accountId: string;
    folder: string;
    subject: string;
    body: string;
    from: string;
    to: string[];
    date: Date;
    aiCategory: EmailCategory;
    indexedAt: Date;
    messageId: string;
    threadId?: string;
    hasAttachments: boolean;
    attachmentCount: number;
    updatedAt?: Date;
}
export type EmailCategory = 'Interested' | 'Meeting Booked' | 'Not Interested' | 'Spam' | 'Out of Office' | 'Uncategorized';
export interface EmailSearchQuery {
    query?: string;
    accountId?: string;
    folder?: string;
    category?: EmailCategory;
    from?: string;
    to?: string;
    dateFrom?: Date;
    dateTo?: Date;
    page?: number;
    size?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    hasAttachments?: boolean;
}
export interface EmailSearchResult {
    hits: EmailDocument[];
    total: number;
    page: number;
    size: number;
    totalPages: number;
}
export interface ParsedEmail {
    messageId: string;
    subject: string;
    from: string;
    to: string[];
    date: Date;
    body: string;
    htmlBody?: string;
    attachments: EmailAttachment[];
    threadId?: string;
}
export interface EmailAttachment {
    filename: string;
    contentType: string;
    size: number;
    content?: Buffer;
}
export interface IMAPAccount {
    id: string;
    host: string;
    port: number;
    user: string;
    password: string;
    ssl: boolean;
    connected: boolean;
    lastSync?: Date;
}
export interface EmailSyncStatus {
    accountId: string;
    isConnected: boolean;
    lastSync: Date | null;
    totalEmails: number;
    newEmails: number;
    error?: string;
}
//# sourceMappingURL=email.interface.d.ts.map