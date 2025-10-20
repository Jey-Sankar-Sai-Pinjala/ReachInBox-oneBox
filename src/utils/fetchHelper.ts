import axios, { AxiosResponse, AxiosError } from 'axios';
import { logger } from './logger';

export interface FetchOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  data?: any;
  timeout?: number;
  retries?: number;
}

export class FetchError extends Error {
  public statusCode: number;
  public response?: any;

  constructor(message: string, statusCode: number, response?: any) {
    super(message);
    this.statusCode = statusCode;
    this.response = response;
  }
}

export const fetchWithRetry = async (
  url: string,
  options: FetchOptions = {}
): Promise<AxiosResponse> => {
  const {
    method = 'GET',
    headers = {},
    data,
    timeout = 30000,
    retries = 3
  } = options;

  let lastError: AxiosError | null = null;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await axios({
        method,
        url,
        headers,
        data,
        timeout,
        validateStatus: (status) => status < 500 // Don't throw for 4xx errors
      });

      return response;
    } catch (error) {
      lastError = error as AxiosError;
      
      if (attempt === retries) {
        break;
      }

      const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
      logger.warn(`Request failed (attempt ${attempt}/${retries}), retrying in ${delay}ms:`, {
        url,
        error: lastError.message
      });
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  const statusCode = lastError?.response?.status || 500;
  const message = lastError?.message || 'Request failed';
  
  throw new FetchError(message, statusCode, lastError?.response?.data);
};

export const fetchSlack = async (webhookUrl: string, payload: any): Promise<void> => {
  try {
    await fetchWithRetry(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      data: payload
    });
    logger.info('Slack notification sent successfully');
  } catch (error) {
    logger.error('Failed to send Slack notification:', error);
    throw error;
  }
};

export const fetchWebhook = async (webhookUrl: string, payload: any): Promise<void> => {
  try {
    await fetchWithRetry(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      data: payload
    });
    logger.info('Webhook triggered successfully');
  } catch (error) {
    logger.error('Failed to trigger webhook:', error);
    throw error;
  }
};

export const fetchGemini = async (apiKey: string, endpoint: string, data: any): Promise<any> => {
  try {
    const response = await fetchWithRetry(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey
      },
      data
    });
    return response.data;
  } catch (error) {
    logger.error('Failed to call Gemini API:', error);
    throw error;
  }
};

export default {
  fetchWithRetry,
  fetchSlack,
  fetchWebhook,
  fetchGemini
};

