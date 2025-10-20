import { AxiosResponse } from 'axios';
export interface FetchOptions {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    headers?: Record<string, string>;
    data?: any;
    timeout?: number;
    retries?: number;
}
export declare class FetchError extends Error {
    statusCode: number;
    response?: any;
    constructor(message: string, statusCode: number, response?: any);
}
export declare const fetchWithRetry: (url: string, options?: FetchOptions) => Promise<AxiosResponse>;
export declare const fetchSlack: (webhookUrl: string, payload: any) => Promise<void>;
export declare const fetchWebhook: (webhookUrl: string, payload: any) => Promise<void>;
export declare const fetchGemini: (apiKey: string, endpoint: string, data: any) => Promise<any>;
declare const _default: {
    fetchWithRetry: (url: string, options?: FetchOptions) => Promise<AxiosResponse>;
    fetchSlack: (webhookUrl: string, payload: any) => Promise<void>;
    fetchWebhook: (webhookUrl: string, payload: any) => Promise<void>;
    fetchGemini: (apiKey: string, endpoint: string, data: any) => Promise<any>;
};
export default _default;
//# sourceMappingURL=fetchHelper.d.ts.map