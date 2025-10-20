import { IMAPService } from '../src/services/imap.service';
import { config } from '../src/config/env';

describe('IMAP Service', () => {
  let imapService: IMAPService;

  beforeEach(() => {
    imapService = new IMAPService();
  });

  afterEach(async () => {
    await imapService.disconnectAll();
  });

  test('should initialize with account statuses', () => {
    const statuses = imapService.getAccountStatuses();
    expect(statuses).toBeDefined();
    expect(Array.isArray(statuses)).toBe(true);
  });

  test('should have configured accounts', () => {
    expect(config.imap.accounts.length).toBeGreaterThan(0);
  });

  test('should handle email processing events', (done) => {
    const mockEmail = {
      id: 'test-email-1',
      accountId: 'account1',
      folder: 'INBOX',
      subject: 'Test Email',
      body: 'This is a test email',
      from: 'test@example.com',
      to: ['recipient@example.com'],
      date: new Date(),
      aiCategory: 'Uncategorized' as const,
      indexedAt: new Date(),
      messageId: 'test-message-id',
      hasAttachments: false,
      attachmentCount: 0
    };

    imapService.on('emailReceived', (email) => {
      expect(email.id).toBe(mockEmail.id);
      expect(email.subject).toBe(mockEmail.subject);
      done();
    });

    // Simulate email received
    imapService.emit('emailReceived', mockEmail);
  });
});

