import { Client } from '@elastic/elasticsearch';
export declare const elasticsearchClient: Client;
export declare const createEmailIndex: () => Promise<void>;
export declare const indexEmail: (emailData: any) => Promise<void>;
export declare const searchEmails: (query: any) => Promise<any>;
export declare const updateEmailCategory: (emailId: string, category: string) => Promise<void>;
export default elasticsearchClient;
//# sourceMappingURL=elasticsearch.d.ts.map