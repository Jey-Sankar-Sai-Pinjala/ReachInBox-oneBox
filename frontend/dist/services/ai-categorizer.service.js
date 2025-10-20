"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AICategorizerService = void 0;
const generative_ai_1 = require("@google/generative-ai");
const env_1 = require("../config/env");
const logger_1 = require("../utils/logger");
class AICategorizerService {
    constructor() {
        this.maxRetries = 3;
        this.baseDelay = 1000;
        this.availableModels = ['gemini-1.0-pro', 'gemini-1.5-flash', 'gemini-1.5-pro'];
        if (!env_1.config.gemini.apiKey) {
            throw new Error('Gemini API key is required');
        }
        this.genAI = new generative_ai_1.GoogleGenerativeAI(env_1.config.gemini.apiKey);
        this.model = this.genAI.getGenerativeModel({
            model: 'gemini-1.5-pro',
            generationConfig: {
                temperature: 0.1,
                topP: 0.8,
                topK: 10,
                maxOutputTokens: 100
            }
        });
    }
    async categorizeEmail(email) {
        return this.withExponentialBackoff(async () => {
            const prompt = this.buildCategorizationPrompt(email);
            for (const modelName of this.availableModels) {
                try {
                    const model = this.genAI.getGenerativeModel({
                        model: modelName,
                        generationConfig: {
                            temperature: 0.1,
                            topP: 0.8,
                            topK: 10,
                            maxOutputTokens: 100
                        }
                    });
                    const result = await model.generateContent(prompt);
                    const response = await result.response;
                    const text = response.text();
                    const cleanedText = text.trim().replace(/```json\n?/g, '').replace(/```\n?/g, '');
                    const parsedResponse = JSON.parse(cleanedText);
                    const category = parsedResponse.category;
                    const validCategories = ['Interested', 'Meeting Booked', 'Not Interested', 'Spam', 'Out of Office'];
                    if (!validCategories.includes(category)) {
                        logger_1.logger.warn(`⚠️  Invalid category returned: ${category}, defaulting to Uncategorized`);
                        return 'Uncategorized';
                    }
                    logger_1.logger.info(`🏷️  Email categorized as: ${category} for subject: ${email.subject} using model: ${modelName}`);
                    return category;
                }
                catch (modelError) {
                    logger_1.logger.warn(`⚠️  Model ${modelName} failed, trying next model:`, modelError);
                    if (modelName === this.availableModels[this.availableModels.length - 1]) {
                        logger_1.logger.warn('⚠️  All AI models failed, using rule-based categorization');
                        return this.ruleBasedCategorization(email);
                    }
                    continue;
                }
            }
            logger_1.logger.warn('⚠️  All AI models failed, using rule-based categorization');
            return this.ruleBasedCategorization(email);
        });
    }
    ruleBasedCategorization(email) {
        const subject = email.subject.toLowerCase();
        const body = email.body.toLowerCase();
        const from = email.from.toLowerCase();
        if (subject.includes('meeting') || subject.includes('call') || subject.includes('schedule') ||
            body.includes('meeting') || body.includes('call') || body.includes('schedule')) {
            return 'Meeting Booked';
        }
        if (subject.includes('out of office') || subject.includes('vacation') || subject.includes('away') ||
            body.includes('out of office') || body.includes('vacation') || body.includes('away') ||
            body.includes('auto-reply') || body.includes('automatic reply')) {
            return 'Out of Office';
        }
        if (subject.includes('promotion') || subject.includes('offer') || subject.includes('discount') ||
            body.includes('promotion') || body.includes('offer') || body.includes('discount') ||
            from.includes('noreply') || from.includes('no-reply')) {
            return 'Spam';
        }
        if (subject.includes('interested') || subject.includes('learn more') || subject.includes('information') ||
            body.includes('interested') || body.includes('learn more') || body.includes('information') ||
            body.includes('tell me more') || body.includes('details')) {
            return 'Interested';
        }
        if (subject.includes('not interested') || subject.includes('unsubscribe') || subject.includes('remove') ||
            body.includes('not interested') || body.includes('unsubscribe') || body.includes('remove') ||
            body.includes('no thanks') || body.includes('decline')) {
            return 'Not Interested';
        }
        return 'Uncategorized';
    }
    buildCategorizationPrompt(email) {
        return `You are an expert email classifier for a business outreach platform. Your task is to analyze the provided email text and categorize it into one of the following labels: Interested, Meeting Booked, Not Interested, Spam, or Out of Office.

Email Details:
Subject: ${email.subject}
From: ${email.from}
Body: ${email.body.substring(0, 2000)}${email.body.length > 2000 ? '...' : ''}

Category Definitions:
- Interested: Shows genuine interest, asks questions, requests more information, or expresses positive engagement
- Meeting Booked: Agreed to a meeting, scheduled a call, or confirmed an appointment  
- Not Interested: Explicitly declines, says no, or shows clear disinterest
- Spam: Automated responses, promotional content, or irrelevant messages
- Out of Office: Auto-replies, vacation messages, or out-of-office notifications

IMPORTANT: Respond with ONLY a JSON object in this exact format: {"category": "CategoryName"}`;
    }
    async categorizeBatch(emails) {
        const results = new Map();
        logger_1.logger.info(`🔄 Categorizing batch of ${emails.length} emails...`);
        const batchSize = 3;
        for (let i = 0; i < emails.length; i += batchSize) {
            const batch = emails.slice(i, i + batchSize);
            const promises = batch.map(async (email) => {
                try {
                    const category = await this.categorizeEmail(email);
                    results.set(email.id, category);
                }
                catch (error) {
                    logger_1.logger.error(`❌ Error categorizing email ${email.id}:`, error);
                    results.set(email.id, 'Uncategorized');
                }
            });
            await Promise.all(promises);
            if (i + batchSize < emails.length) {
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }
        logger_1.logger.info(`✅ Batch categorization completed: ${results.size} emails processed`);
        return results;
    }
    async withExponentialBackoff(operation) {
        let lastError;
        for (let attempt = 0; attempt < this.maxRetries; attempt++) {
            try {
                return await operation();
            }
            catch (error) {
                lastError = error;
                if (attempt === this.maxRetries - 1) {
                    logger_1.logger.error(`❌ All ${this.maxRetries} attempts failed for categorization`);
                    throw lastError;
                }
                const delay = this.baseDelay * Math.pow(2, attempt);
                logger_1.logger.warn(`⚠️  Attempt ${attempt + 1} failed, retrying in ${delay}ms:`, error);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
        throw lastError;
    }
    async getCategorizationStats() {
        return {
            total: 0,
            byCategory: {
                'Interested': 0,
                'Meeting Booked': 0,
                'Not Interested': 0,
                'Spam': 0,
                'Out of Office': 0,
                'Uncategorized': 0
            }
        };
    }
    async recategorizeEmail(emailId, newCategory) {
        try {
            logger_1.logger.info(`🔄 Recategorizing email ${emailId} to ${newCategory}`);
        }
        catch (error) {
            logger_1.logger.error(`❌ Error recategorizing email ${emailId}:`, error);
            throw error;
        }
    }
    async getCategoryInsights() {
        return {
            mostCommonCategory: 'Interested',
            averageResponseTime: 2.5,
            conversionRate: 0.15
        };
    }
}
exports.AICategorizerService = AICategorizerService;
exports.default = AICategorizerService;
//# sourceMappingURL=ai-categorizer.service.js.map