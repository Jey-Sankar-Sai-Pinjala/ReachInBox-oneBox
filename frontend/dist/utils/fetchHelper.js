"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchGemini = exports.fetchWebhook = exports.fetchSlack = exports.fetchWithRetry = exports.FetchError = void 0;
const axios_1 = __importDefault(require("axios"));
const logger_1 = require("./logger");
class FetchError extends Error {
    constructor(message, statusCode, response) {
        super(message);
        this.statusCode = statusCode;
        this.response = response;
    }
}
exports.FetchError = FetchError;
const fetchWithRetry = async (url, options = {}) => {
    const { method = 'GET', headers = {}, data, timeout = 30000, retries = 3 } = options;
    let lastError = null;
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const response = await (0, axios_1.default)({
                method,
                url,
                headers,
                data,
                timeout,
                validateStatus: (status) => status < 500
            });
            return response;
        }
        catch (error) {
            lastError = error;
            if (attempt === retries) {
                break;
            }
            const delay = Math.pow(2, attempt) * 1000;
            logger_1.logger.warn(`Request failed (attempt ${attempt}/${retries}), retrying in ${delay}ms:`, {
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
exports.fetchWithRetry = fetchWithRetry;
const fetchSlack = async (webhookUrl, payload) => {
    try {
        await (0, exports.fetchWithRetry)(webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            data: payload
        });
        logger_1.logger.info('Slack notification sent successfully');
    }
    catch (error) {
        logger_1.logger.error('Failed to send Slack notification:', error);
        throw error;
    }
};
exports.fetchSlack = fetchSlack;
const fetchWebhook = async (webhookUrl, payload) => {
    try {
        await (0, exports.fetchWithRetry)(webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            data: payload
        });
        logger_1.logger.info('Webhook triggered successfully');
    }
    catch (error) {
        logger_1.logger.error('Failed to trigger webhook:', error);
        throw error;
    }
};
exports.fetchWebhook = fetchWebhook;
const fetchGemini = async (apiKey, endpoint, data) => {
    try {
        const response = await (0, exports.fetchWithRetry)(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-goog-api-key': apiKey
            },
            data
        });
        return response.data;
    }
    catch (error) {
        logger_1.logger.error('Failed to call Gemini API:', error);
        throw error;
    }
};
exports.fetchGemini = fetchGemini;
exports.default = {
    fetchWithRetry: exports.fetchWithRetry,
    fetchSlack: exports.fetchSlack,
    fetchWebhook: exports.fetchWebhook,
    fetchGemini: exports.fetchGemini
};
//# sourceMappingURL=fetchHelper.js.map