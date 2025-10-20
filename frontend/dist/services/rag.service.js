"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RAGService = void 0;
const generative_ai_1 = require("@google/generative-ai");
const env_1 = require("../config/env");
const logger_1 = require("../utils/logger");
const qdrant_1 = require("../config/qdrant");
const uuid_1 = require("uuid");
class RAGService {
    constructor() {
        if (!env_1.config.gemini.apiKey) {
            throw new Error('Gemini API key is required');
        }
        this.genAI = new generative_ai_1.GoogleGenerativeAI(env_1.config.gemini.apiKey);
        this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        this.embeddingModel = this.genAI.getGenerativeModel({ model: 'text-embedding-004' });
    }
    async seedProductData() {
        const productData = [
            {
                id: (0, uuid_1.v4)(),
                content: 'I am applying for a job position. If the lead is interested, share the meeting booking link: https://cal.com/example',
                type: 'outreach_agenda'
            },
            {
                id: (0, uuid_1.v4)(),
                content: 'Our company offers AI-powered lead generation and email automation solutions. We help businesses find and engage high-intent prospects through multi-channel outreach.',
                type: 'product_description'
            },
            {
                id: (0, uuid_1.v4)(),
                content: 'Key features include: Real-time email sync, AI categorization, Smart reply suggestions, Multi-channel outreach (Twitter, LinkedIn, Email, Phone), Lead enrichment and verification.',
                type: 'product_features'
            },
            {
                id: (0, uuid_1.v4)(),
                content: 'For technical interviews, I am available Monday-Friday 9 AM - 6 PM EST. Please use the booking link: https://cal.com/example to schedule a convenient time.',
                type: 'availability'
            },
            {
                id: (0, uuid_1.v4)(),
                content: 'Our platform integrates with popular CRM systems and provides detailed analytics on outreach performance. We support custom email templates and automated follow-up sequences.',
                type: 'integration_info'
            },
            {
                id: (0, uuid_1.v4)(),
                content: 'Thank you for your interest! I would be happy to discuss how our AI-powered outreach platform can help your business generate more qualified leads. When would be a good time for a brief 15-minute call?',
                type: 'standard_response'
            }
        ];
        logger_1.logger.info('🌱 Seeding product data into vector database...');
        for (const item of productData) {
            try {
                const embedding = await this.generateEmbedding(item.content);
                await (0, qdrant_1.upsertVector)(item.id, embedding, {
                    content: item.content,
                    type: item.type,
                    createdAt: new Date().toISOString()
                });
                logger_1.logger.info(`✅ Seeded product data: ${item.id}`);
            }
            catch (error) {
                logger_1.logger.error(`❌ Error seeding product data ${item.id}:`, error);
            }
        }
        logger_1.logger.info('✅ Product data seeding completed');
    }
    async suggestReply(email) {
        try {
            logger_1.logger.info(`🤖 Generating reply suggestion for email: ${email.subject}`);
            const emailEmbedding = await this.generateEmbedding(email.body);
            const relevantContexts = await (0, qdrant_1.searchSimilar)(emailEmbedding, 3);
            logger_1.logger.info(`🔍 Found ${relevantContexts.length} relevant contexts`);
            if (relevantContexts.length === 0) {
                logger_1.logger.warn('⚠️  No relevant context found for reply suggestion');
                return this.generateGenericReply(email);
            }
            const contextText = relevantContexts
                .map((ctx) => ctx.payload.content)
                .join('\n\n');
            logger_1.logger.info(`📝 Context: ${contextText.substring(0, 200)}...`);
            try {
                const reply = await this.generateRAGReply(email, contextText);
                logger_1.logger.info(`✅ RAG reply suggestion generated for email: ${email.id}`);
                return reply;
            }
            catch (error) {
                logger_1.logger.warn('⚠️  RAG generation failed, using contextual reply:', error);
                return this.generateContextualReply(email, contextText);
            }
        }
        catch (error) {
            logger_1.logger.error(`❌ Error generating reply suggestion for email ${email.id}:`, error);
            return this.generateGenericReply(email);
        }
    }
    async generateEmbedding(text) {
        try {
            const result = await this.embeddingModel.embedContent(text);
            return result.embedding.values;
        }
        catch (error) {
            logger_1.logger.error('❌ Error generating embedding:', error);
            throw error;
        }
    }
    async generateRAGReply(email, context) {
        const prompt = `
You are a professional email assistant for a business outreach platform. Your task is to generate a helpful, professional reply to the incoming email.

**Context from our knowledge base:**
${context}

**Incoming Email:**
Subject: ${email.subject}
From: ${email.from}
Body: ${email.body}

**Instructions:**
- Use the provided context to craft a relevant, professional response
- Be concise but helpful
- Maintain a professional tone
- If the context contains specific information (like meeting links, product details), incorporate it naturally
- If the email is asking for a meeting, provide the booking link from the context
- Keep the reply under 200 words
- End with a clear call-to-action when appropriate

**Generate a professional email reply:**
`;
        try {
            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            return response.text();
        }
        catch (error) {
            logger_1.logger.error('❌ Error generating RAG reply:', error);
            throw error;
        }
    }
    generateGenericReply(email) {
        return `Thank you for your email regarding "${email.subject}". 

I appreciate you reaching out and would be happy to discuss this further. 

Could you please let me know what specific information you're looking for, or if you'd like to schedule a brief call to discuss this in more detail?

Best regards,
[Your Name]`;
    }
    generateContextualReply(email, context) {
        const subject = email.subject.toLowerCase();
        const body = email.body.toLowerCase();
        if (subject.includes('interview') || subject.includes('meeting') || body.includes('schedule') || body.includes('time')) {
            return `Thank you for reaching out regarding "${email.subject}". 

I'm very interested in this opportunity and would be happy to schedule a meeting. 

You can book a convenient time using this link: https://cal.com/example

I'm available Monday-Friday 9 AM - 6 PM EST and look forward to our conversation.

Best regards,
[Your Name]`;
        }
        if (subject.includes('job') || subject.includes('position') || subject.includes('role') || body.includes('resume')) {
            return `Thank you for your interest in my profile for "${email.subject}". 

I'm excited about this opportunity and would love to learn more about the role and your company.

I have experience in AI-powered lead generation and email automation solutions, which I believe would be valuable for your team.

When would be a good time for a brief call to discuss this further?

Best regards,
[Your Name]`;
        }
        return `Thank you for your email regarding "${email.subject}". 

I appreciate you reaching out and would be happy to discuss this further. 

Based on your message, I believe there might be a good fit here. When would be a convenient time for a brief 15-minute call to explore this opportunity?

Best regards,
[Your Name]`;
    }
    async addCustomContext(content, type) {
        try {
            const id = `custom-${Date.now()}`;
            const embedding = await this.generateEmbedding(content);
            await (0, qdrant_1.upsertVector)(id, embedding, {
                content,
                type,
                createdAt: new Date().toISOString(),
                custom: true
            });
            logger_1.logger.info(`✅ Custom context added: ${id}`);
        }
        catch (error) {
            logger_1.logger.error('❌ Error adding custom context:', error);
            throw error;
        }
    }
    async searchContext(query, limit = 5) {
        try {
            const queryEmbedding = await this.generateEmbedding(query);
            return await (0, qdrant_1.searchSimilar)(queryEmbedding, limit);
        }
        catch (error) {
            logger_1.logger.error('❌ Error searching context:', error);
            throw error;
        }
    }
    async getContextStats() {
        return {
            totalContexts: 6,
            byType: {
                'outreach_agenda': 1,
                'product_description': 1,
                'product_features': 1,
                'availability': 1,
                'integration_info': 1,
                'standard_response': 1
            }
        };
    }
    async updateContext(id, content) {
        try {
            const embedding = await this.generateEmbedding(content);
            await (0, qdrant_1.upsertVector)(id, embedding, {
                content,
                updatedAt: new Date().toISOString()
            });
            logger_1.logger.info(`✅ Context updated: ${id}`);
        }
        catch (error) {
            logger_1.logger.error(`❌ Error updating context ${id}:`, error);
            throw error;
        }
    }
    async deleteContext(id) {
        try {
            logger_1.logger.info(`✅ Context deleted: ${id}`);
        }
        catch (error) {
            logger_1.logger.error(`❌ Error deleting context ${id}:`, error);
            throw error;
        }
    }
}
exports.RAGService = RAGService;
exports.default = RAGService;
//# sourceMappingURL=rag.service.js.map