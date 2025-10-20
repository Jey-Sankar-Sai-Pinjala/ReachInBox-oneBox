export interface Config {
    port: number;
    nodeEnv: string;
    elasticsearch: {
        url: string;
        index: string;
    };
    qdrant: {
        url: string;
        collection: string;
    };
    imap: {
        accounts: Array<{
            id: string;
            host: string;
            port: number;
            user: string;
            password: string;
            ssl: boolean;
        }>;
    };
    gemini: {
        apiKey: string;
    };
    slack: {
        webhookUrl: string;
    };
    webhook: {
        siteUrl: string;
    };
    logging: {
        level: string;
    };
}
export declare const config: Config;
export default config;
//# sourceMappingURL=env.d.ts.map