import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config/env';
import { logger } from '../utils/logger';
import { EmailDocument, EmailCategory } from '../models/email.interface';

export class AICategorizerService {
  private genAI: GoogleGenerativeAI;
  private model: any;
  private maxRetries: number = 3;
  private baseDelay: number = 1000; // 1 second
  private availableModels: string[] = ['gemini-1.0-pro', 'gemini-1.5-flash', 'gemini-1.5-pro'];

  constructor() {
    if (!config.gemini.apiKey) {
      throw new Error('Gemini API key is required');
    }
    
    this.genAI = new GoogleGenerativeAI(config.gemini.apiKey);
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

  public async categorizeEmail(email: EmailDocument): Promise<EmailCategory> {
    return this.withExponentialBackoff(async () => {
      const prompt = this.buildCategorizationPrompt(email);
      
      // Try different models if the current one fails
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
          
          // Clean and parse the JSON response
          const cleanedText = text.trim().replace(/```json\n?/g, '').replace(/```\n?/g, '');
          const parsedResponse = JSON.parse(cleanedText);
          const category = parsedResponse.category as EmailCategory;
          
          // Validate category
          const validCategories: EmailCategory[] = ['Interested', 'Meeting Booked', 'Not Interested', 'Spam', 'Out of Office'];
          if (!validCategories.includes(category)) {
            logger.warn(`⚠️  Invalid category returned: ${category}, defaulting to Uncategorized`);
            return 'Uncategorized';
          }
          
          logger.info(`🏷️  Email categorized as: ${category} for subject: ${email.subject} using model: ${modelName}`);
          return category;
        } catch (modelError) {
          logger.warn(`⚠️  Model ${modelName} failed, trying next model:`, modelError);
          if (modelName === this.availableModels[this.availableModels.length - 1]) {
            // If this is the last model, use rule-based categorization instead of throwing
            logger.warn('⚠️  All AI models failed, using rule-based categorization');
            return this.ruleBasedCategorization(email);
          }
          continue; // Try next model
        }
      }
      
      // If all models fail, use a simple rule-based fallback
      logger.warn('⚠️  All AI models failed, using rule-based categorization');
      return this.ruleBasedCategorization(email);
    });
  }

  private ruleBasedCategorization(email: EmailDocument): EmailCategory {
    const subject = email.subject.toLowerCase();
    const body = email.body.toLowerCase();
    const from = email.from.toLowerCase();

    // Check for meeting-related keywords
    if (subject.includes('meeting') || subject.includes('call') || subject.includes('schedule') || 
        body.includes('meeting') || body.includes('call') || body.includes('schedule')) {
      return 'Meeting Booked';
    }

    // Check for out of office keywords
    if (subject.includes('out of office') || subject.includes('vacation') || subject.includes('away') ||
        body.includes('out of office') || body.includes('vacation') || body.includes('away') ||
        body.includes('auto-reply') || body.includes('automatic reply')) {
      return 'Out of Office';
    }

    // Check for spam keywords
    if (subject.includes('promotion') || subject.includes('offer') || subject.includes('discount') ||
        body.includes('promotion') || body.includes('offer') || body.includes('discount') ||
        from.includes('noreply') || from.includes('no-reply')) {
      return 'Spam';
    }

    // Check for interested keywords
    if (subject.includes('interested') || subject.includes('learn more') || subject.includes('information') ||
        body.includes('interested') || body.includes('learn more') || body.includes('information') ||
        body.includes('tell me more') || body.includes('details')) {
      return 'Interested';
    }

    // Check for not interested keywords
    if (subject.includes('not interested') || subject.includes('unsubscribe') || subject.includes('remove') ||
        body.includes('not interested') || body.includes('unsubscribe') || body.includes('remove') ||
        body.includes('no thanks') || body.includes('decline')) {
      return 'Not Interested';
    }

    // Default to Uncategorized
    return 'Uncategorized';
  }

  private buildCategorizationPrompt(email: EmailDocument): string {
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

  public async categorizeBatch(emails: EmailDocument[]): Promise<Map<string, EmailCategory>> {
    const results = new Map<string, EmailCategory>();
    
    logger.info(`🔄 Categorizing batch of ${emails.length} emails...`);
    
    // Process emails in parallel with rate limiting
    const batchSize = 3; // Reduced batch size for better reliability
    for (let i = 0; i < emails.length; i += batchSize) {
      const batch = emails.slice(i, i + batchSize);
      
      const promises = batch.map(async (email) => {
        try {
          const category = await this.categorizeEmail(email);
          results.set(email.id, category);
        } catch (error) {
          logger.error(`❌ Error categorizing email ${email.id}:`, error);
          results.set(email.id, 'Uncategorized');
        }
      });
      
      await Promise.all(promises);
      
      // Rate limiting: wait between batches
      if (i + batchSize < emails.length) {
        await new Promise(resolve => setTimeout(resolve, 2000)); // Increased delay
      }
    }
    
    logger.info(`✅ Batch categorization completed: ${results.size} emails processed`);
    return results;
  }

  private async withExponentialBackoff<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === this.maxRetries - 1) {
          logger.error(`❌ All ${this.maxRetries} attempts failed for categorization`);
          throw lastError;
        }
        
        const delay = this.baseDelay * Math.pow(2, attempt);
        logger.warn(`⚠️  Attempt ${attempt + 1} failed, retrying in ${delay}ms:`, error);
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError!;
  }

  public async getCategorizationStats(): Promise<{
    total: number;
    byCategory: Record<EmailCategory, number>;
  }> {
    // This would typically query your database/Elasticsearch
    // For now, return mock data
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

  public async recategorizeEmail(emailId: string, newCategory: EmailCategory): Promise<void> {
    try {
      logger.info(`🔄 Recategorizing email ${emailId} to ${newCategory}`);
      // This would update the email in Elasticsearch
      // Implementation depends on your data layer
    } catch (error) {
      logger.error(`❌ Error recategorizing email ${emailId}:`, error);
      throw error;
    }
  }

  public async getCategoryInsights(): Promise<{
    mostCommonCategory: EmailCategory;
    averageResponseTime: number;
    conversionRate: number;
  }> {
    // This would analyze your email data to provide insights
    // For now, return mock data
    return {
      mostCommonCategory: 'Interested',
      averageResponseTime: 2.5,
      conversionRate: 0.15
    };
  }
}

export default AICategorizerService;

