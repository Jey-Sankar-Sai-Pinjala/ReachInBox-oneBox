import { AICategorizerService } from '../src/services/ai-categorizer.service';
import { EmailDocument } from '../src/models/email.interface';

// Mock the GoogleGenerativeAI
jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: jest.fn().mockReturnValue({
      generateContent: jest.fn().mockResolvedValue({
        response: {
          text: jest.fn().mockReturnValue('{"category": "Interested"}')
        }
      })
    })
  }))
}));

describe('AI Categorizer Service', () => {
  let categorizerService: AICategorizerService;

  beforeEach(() => {
    categorizerService = new AICategorizerService();
  });

  test('should categorize email as Interested', async () => {
    const email: EmailDocument = {
      id: 'test-email-1',
      accountId: 'account1',
      folder: 'INBOX',
      subject: 'I am interested in your product',
      body: 'Hi, I would like to learn more about your services. Can we schedule a call?',
      from: 'interested@example.com',
      to: ['sales@company.com'],
      date: new Date(),
      aiCategory: 'Uncategorized',
      indexedAt: new Date(),
      messageId: 'test-message-id',
      hasAttachments: false,
      attachmentCount: 0
    };

    const category = await categorizerService.categorizeEmail(email);
    expect(category).toBe('Interested');
  });

  test('should handle categorization errors gracefully', async () => {
    // Mock API error
    const mockCategorizer = new AICategorizerService();
    jest.spyOn(mockCategorizer as any, 'model').mockImplementation(() => {
      throw new Error('API Error');
    });

    const email: EmailDocument = {
      id: 'test-email-2',
      accountId: 'account1',
      folder: 'INBOX',
      subject: 'Test Email',
      body: 'Test body',
      from: 'test@example.com',
      to: ['recipient@example.com'],
      date: new Date(),
      aiCategory: 'Uncategorized',
      indexedAt: new Date(),
      messageId: 'test-message-id',
      hasAttachments: false,
      attachmentCount: 0
    };

    const category = await mockCategorizer.categorizeEmail(email);
    expect(category).toBe('Uncategorized');
  });

  test('should build proper categorization prompt', () => {
    const email: EmailDocument = {
      id: 'test-email-3',
      accountId: 'account1',
      folder: 'INBOX',
      subject: 'Meeting Request',
      body: 'Let\'s schedule a meeting for next week',
      from: 'client@example.com',
      to: ['sales@company.com'],
      date: new Date(),
      aiCategory: 'Uncategorized',
      indexedAt: new Date(),
      messageId: 'test-message-id',
      hasAttachments: false,
      attachmentCount: 0
    };

    const prompt = (categorizerService as any).buildCategorizationPrompt(email);
    expect(prompt).toContain(email.subject);
    expect(prompt).toContain(email.from);
    expect(prompt).toContain(email.body);
    expect(prompt).toContain('Interested');
    expect(prompt).toContain('Meeting Booked');
  });
});

