import Imap from 'node-imap';
import { simpleParser, ParsedMail } from 'mailparser';
import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';
import { config } from '../config/env';
import { EmailDocument, ParsedEmail, IMAPAccount, EmailSyncStatus } from '../models/email.interface';

export class IMAPService extends EventEmitter {
  private connections: Map<string, Imap> = new Map();
  private accountStatuses: Map<string, EmailSyncStatus> = new Map();
  private isIdleActive: Map<string, boolean> = new Map();
  private idleTimeouts: Map<string, NodeJS.Timeout> = new Map();
  private lastSeenUid: Map<string, number> = new Map();

  constructor() {
    super();
    this.initializeAccounts();
  }

  private initializeAccounts(): void {
    config.imap.accounts.forEach(account => {
      this.accountStatuses.set(account.id, {
        accountId: account.id,
        isConnected: false,
        lastSync: null,
        totalEmails: 0,
        newEmails: 0
      });
    });
  }

  public async connectAll(): Promise<void> {
    logger.info('🔄 Connecting to all IMAP accounts...');
    
    for (const account of config.imap.accounts) {
      try {
        await this.connectAccount(account);
        await this.initialSync(account.id);
        await this.startIdleMode(account.id);
      } catch (error) {
        logger.error(`❌ Failed to connect account ${account.id}:`, error);
        this.updateAccountStatus(account.id, { error: (error as Error).message });
      }
    }
  }

  private async connectAccount(account: any): Promise<void> {
    return new Promise((resolve, reject) => {
      const imap = new Imap({
        user: account.user,
        password: account.password,
        host: account.host,
        port: account.port,
        tls: account.ssl,
        tlsOptions: { rejectUnauthorized: false },
        keepalive: {
          interval: 10000,
          idleInterval: 300000,
          forceNoop: true
        }
      });

      imap.once('ready', () => {
        logger.info(`✅ Connected to IMAP account: ${account.user}`);
        this.connections.set(account.id, imap);
        this.updateAccountStatus(account.id, { 
          isConnected: true,
          error: undefined
        });
        resolve();
      });

      imap.once('error', (err) => {
        logger.error(`❌ IMAP connection error for ${account.user}:`, err);
        this.updateAccountStatus(account.id, { 
          isConnected: false,
          error: err.message
        });
        reject(err);
      });

      imap.once('end', () => {
        logger.warn(`🔌 IMAP connection ended for ${account.user}`);
        this.updateAccountStatus(account.id, { isConnected: false });
        this.connections.delete(account.id);
      });

      imap.connect();
    });
  }

  private async initialSync(accountId: string): Promise<void> {
    const imap = this.connections.get(accountId);
    if (!imap) return;

    try {
      await this.openInbox(imap);
      
      // Search for emails from the last 30 days - try different approach
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      // Try using ALL instead of SINCE to avoid the error
      const searchCriteria = ['ALL'];
      console.log(`🔧 DEBUG: Using ALL search criteria instead of SINCE`);
      
      imap.search(searchCriteria, (err, uids) => {
        if (err) {
          logger.error(`❌ Search error for account ${accountId}:`, err);
          return;
        }

        if (uids && uids.length > 0) {
          logger.info(`📧 Found ${uids.length} emails for initial sync in account ${accountId}`);
          this.fetchEmails(imap, uids, accountId);
        }
      });
    } catch (error) {
      logger.error(`❌ Initial sync error for account ${accountId}:`, error);
    }
  }

  private async startIdleMode(accountId: string): Promise<void> {
    const imap = this.connections.get(accountId);
    if (!imap) return;

    try {
      const box = await this.openInbox(imap);

      // Initialize lastSeenUid on first open using UIDNEXT - 1
      if (!this.lastSeenUid.has(accountId) && (box as any).uidnext) {
        const uidNext = (box as any).uidnext as number;
        this.lastSeenUid.set(accountId, Math.max(0, uidNext - 1));
      }

      // Mark IDLE active; node-imap manages IDLE via keepalive
      this.isIdleActive.set(accountId, true);

      // Listen for new emails and fetch by UID range
      imap.on('mail', (numNewMsgs) => {
        logger.info(`📬 New email detected in account ${accountId}: ${numNewMsgs} messages`);
        this.fetchNewByUid(accountId);
      });

      // Resilience: reconnect on connection end/close
      imap.on('close', (hadError) => {
        logger.warn(`🔁 IMAP connection closed for ${accountId}. hadError=${hadError}`);
        this.isIdleActive.set(accountId, false);
        setTimeout(() => this.reconnectAccount(accountId).catch(() => {}), 2000);
      });
      imap.on('error', (err) => {
        logger.error(`❌ IMAP error for ${accountId}:`, err);
      });

      logger.info(`🔄 IDLE mode started for account ${accountId}`);
    } catch (error) {
      logger.error(`❌ Failed to start IDLE mode for account ${accountId}:`, error);
    }
  }

  private async restartIdleMode(accountId: string): Promise<void> {
    const imap = this.connections.get(accountId);
    if (!imap) return;

    try {
      // Clear existing timeout
      const timeout = this.idleTimeouts.get(accountId);
      if (timeout) {
        clearTimeout(timeout);
        this.idleTimeouts.delete(accountId);
      }

      // Restart IDLE after a short delay
      setTimeout(() => {
        this.startIdleMode(accountId);
      }, 1000);

      logger.info(`🔄 Restarting IDLE mode for account ${accountId}`);
    } catch (error) {
      logger.error(`❌ Failed to restart IDLE mode for account ${accountId}:`, error);
    }
  }

  private async openInbox(imap: Imap): Promise<Imap.Box> {
    return new Promise((resolve, reject) => {
      imap.openBox('INBOX', false, (err, box) => {
        if (err) {
          reject(err);
        } else {
          resolve(box as Imap.Box);
        }
      });
    });
  }

  private async fetchNewByUid(accountId: string): Promise<void> {
    const imap = this.connections.get(accountId);
    if (!imap) return;

    try {
      const box = await this.openInbox(imap);

      // Establish start UID from lastSeen or uidnext - numNew (fallback)
      let startFromUid = this.lastSeenUid.get(accountId);
      if (typeof startFromUid !== 'number') {
        const uidNext = (box as any).uidnext as number | undefined;
        startFromUid = uidNext ? Math.max(1, uidNext - 50) : 1; // fetch last up to 50 if unknown
      } else {
        startFromUid = startFromUid + 1;
      }

      const range = `${startFromUid}:*`;

      imap.search(['UID', range], (err, uids) => {
        if (err) {
          logger.error(`❌ UID search error for account ${accountId}:`, err);
          return;
        }

        if (!uids || uids.length === 0) {
          return;
        }

        // Fetch by UID
        const fetch = (imap as any).fetch(uids as unknown as number[], ({ bodies: '', struct: true, uid: true } as any));

        let maxUid = this.lastSeenUid.get(accountId) || 0;

        fetch.on('message', (msg: any, seqno: number) => {
          let buffer = '';
          let currentUid: number | undefined;

          msg.on('attributes', (attrs: any) => {
            // attrs.uid is present when fetching by UID
            if ((attrs as any).uid) {
              currentUid = (attrs as any).uid as number;
              if (currentUid > maxUid) {
                maxUid = currentUid;
              }
            }
          });

          msg.on('body', (stream: any) => {
            stream.on('data', (chunk: any) => {
              buffer += chunk.toString('utf8');
            });
          });

          msg.once('end', () => {
            this.parseEmail(buffer, accountId, 'INBOX');
          });
        });

        fetch.once('error', (fetchErr: any) => {
          logger.error(`❌ UID fetch error for account ${accountId}:`, fetchErr);
        });

        fetch.once('end', () => {
          if (maxUid > (this.lastSeenUid.get(accountId) || 0)) {
            this.lastSeenUid.set(accountId, maxUid);
          }
          this.updateAccountStatus(accountId, { lastSync: new Date() as unknown as any });
          logger.info(`✅ Finished UID fetch for account ${accountId}, lastSeenUid=${this.lastSeenUid.get(accountId)}`);
        });
      });
    } catch (error) {
      logger.error(`❌ Error in fetchNewByUid for account ${accountId}:`, error);
    }
  }

  // handleNewMail replaced by UID-driven fetch via fetchNewByUid

  private async fetchEmails(imap: Imap, uids: number[], accountId: string): Promise<void> {
    if (uids.length === 0) return;

    const fetch = imap.fetch(uids, { bodies: '', struct: true });
    
    fetch.on('message', (msg, seqno) => {
      let buffer = '';
      
      msg.on('body', (stream, info) => {
        stream.on('data', (chunk) => {
          buffer += chunk.toString('utf8');
        });
      });

      msg.once('end', () => {
        this.parseEmail(buffer, accountId, 'INBOX');
      });

      msg.once('attributes', (attrs) => {
        // Store message attributes if needed
      });
    });

    fetch.once('error', (err) => {
      logger.error(`❌ Fetch error for account ${accountId}:`, err);
    });

    fetch.once('end', () => {
      logger.info(`✅ Finished fetching emails for account ${accountId}`);
    });
  }

  private async parseEmail(rawEmail: string, accountId: string, folder: string): Promise<void> {
    try {
      const parsed: ParsedMail = await simpleParser(rawEmail);
      
      // Extract plaintext body, stripping HTML if present
      let plaintextBody = '';
      if (parsed.text) {
        plaintextBody = parsed.text;
      } else if (parsed.html) {
        // Strip HTML tags and convert to plaintext
        plaintextBody = this.stripHtml(parsed.html);
      } else {
        plaintextBody = '';
      }

      // Clean and normalize the body text
      plaintextBody = this.cleanText(plaintextBody);

      const emailData: EmailDocument = {
        id: uuidv4(),
        accountId,
        folder,
        subject: parsed.subject || 'No Subject',
        body: plaintextBody,
        from: parsed.from?.text || 'Unknown',
        to: parsed.to ? (Array.isArray(parsed.to) ? parsed.to.map((t: any) => t.text) : [parsed.to.text]) : [],
        date: parsed.date || new Date(),
        aiCategory: 'Uncategorized',
        indexedAt: new Date(),
        messageId: parsed.messageId || '',
        threadId: parsed.inReplyTo || undefined,
        hasAttachments: parsed.attachments ? parsed.attachments.length > 0 : false,
        attachmentCount: parsed.attachments ? parsed.attachments.length : 0
      };

      // Emit the parsed email for further processing
      this.emit('emailReceived', emailData);
      
      // Update account status
      const status = this.accountStatuses.get(accountId);
      if (status) {
        status.newEmails++;
        status.totalEmails++;
        this.accountStatuses.set(accountId, status);
      }

      logger.info(`📧 Email parsed: ${emailData.subject} from ${emailData.from}`);
    } catch (error) {
      logger.error('❌ Error parsing email:', error);
    }
  }

  private updateAccountStatus(accountId: string, updates: Partial<EmailSyncStatus>): void {
    const currentStatus = this.accountStatuses.get(accountId);
    if (currentStatus) {
      const updatedStatus = { ...currentStatus, ...updates };
      this.accountStatuses.set(accountId, updatedStatus);
      this.emit('accountStatusChanged', updatedStatus);
    }
  }

  public getAccountStatuses(): EmailSyncStatus[] {
    return Array.from(this.accountStatuses.values());
  }

  public getAccountStatus(accountId: string): EmailSyncStatus | undefined {
    return this.accountStatuses.get(accountId);
  }

  public async disconnectAll(): Promise<void> {
    logger.info('🔌 Disconnecting all IMAP accounts...');
    
    for (const [accountId, imap] of this.connections) {
      try {
        // Clear timeouts
        const timeout = this.idleTimeouts.get(accountId);
        if (timeout) {
          clearTimeout(timeout);
        }

        // Stop IDLE mode
        // No polling to stop; IDLE handled by server keepalive

        // Close connection
        imap.end();
        this.connections.delete(accountId);
        this.isIdleActive.delete(accountId);
        this.idleTimeouts.delete(accountId);
        
        logger.info(`✅ Disconnected account ${accountId}`);
      } catch (error) {
        logger.error(`❌ Error disconnecting account ${accountId}:`, error);
      }
    }
  }

  public async reconnectAccount(accountId: string): Promise<void> {
    const account = config.imap.accounts.find(acc => acc.id === accountId);
    if (!account) {
      throw new Error(`Account ${accountId} not found`);
    }

    // Disconnect existing connection
    const existingConnection = this.connections.get(accountId);
    if (existingConnection) {
      await this.disconnectAccount(accountId);
    }

    // Reconnect
    await this.connectAccount(account);
    await this.initialSync(accountId);
    await this.startIdleMode(accountId);
  }

  private async disconnectAccount(accountId: string): Promise<void> {
    const imap = this.connections.get(accountId);
    if (imap) {
      const timeout = this.idleTimeouts.get(accountId);
      if (timeout) {
        clearTimeout(timeout);
      }
      
      // No polling to stop; IDLE handled by server keepalive
      
      imap.end();
      this.connections.delete(accountId);
      this.isIdleActive.delete(accountId);
      this.idleTimeouts.delete(accountId);
    }
  }

  // Polling removed in favor of IMAP IDLE + UID-driven fetching

  private async checkForNewEmails(accountId: string): Promise<void> {
    const imap = this.connections.get(accountId);
    if (!imap) return;

    try {
      await this.openInbox(imap);
      // Determine time window: use lastSync if available, else last 5 minutes
      const status = this.accountStatuses.get(accountId);
      const sinceDate = status?.lastSync
        ? new Date(status.lastSync)
        : new Date(Date.now() - 5 * 60 * 1000);

      const formattedDate = this.formatDateForIMAP(sinceDate);

      // Prefer UNSEEN to avoid reprocessing, but fall back to SINCE for servers without flags
      // Try UNSEEN first
      imap.search(['UNSEEN'], (unseenErr, unseenUids) => {
        if (unseenErr) {
          logger.warn(`⚠️ UNSEEN search failed for account ${accountId}, falling back to SINCE:`, unseenErr);

          // Fallback: SINCE formattedDate
          imap.search(['SINCE', formattedDate], (sinceErr, uids) => {
            if (sinceErr) {
              logger.error(`❌ Search error in polling for account ${accountId}:`, sinceErr);
              return;
            }

            if (uids && uids.length > 0) {
              logger.info(`📥 Polling found ${uids.length} emails for account ${accountId}`);
              this.fetchEmails(imap, uids as unknown as number[], accountId);
            }

            // Update lastSync timestamp
            this.updateAccountStatus(accountId, { lastSync: new Date() as unknown as any });
          });
          return;
        }

        if (unseenUids && unseenUids.length > 0) {
          logger.info(`📥 Polling found ${unseenUids.length} UNSEEN emails for account ${accountId}`);
          this.fetchEmails(imap, unseenUids as unknown as number[], accountId);
        }

        // Update lastSync timestamp
        this.updateAccountStatus(accountId, { lastSync: new Date() as unknown as any });
      });
    } catch (error) {
      logger.error(`❌ Error checking for new emails in account ${accountId}:`, error);
    }
  }

  private formatDateForIMAP(date: Date): string {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                   'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    const day = date.getDate().toString().padStart(2, '0');
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    
    const formattedDate = `${day}-${month}-${year}`;
    console.log(`🔧 DEBUG: formatDateForIMAP called with date: ${date.toISOString()}, formatted: ${formattedDate}`);
    
    return formattedDate;
  }

  private stripHtml(html: string): string {
    if (!html) return '';
    
    // Remove HTML tags
    let text = html.replace(/<[^>]*>/g, '');
    
    // Decode HTML entities
    text = text
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ')
      .replace(/&copy;/g, '©')
      .replace(/&reg;/g, '®')
      .replace(/&trade;/g, '™');
    
    // Remove extra whitespace and normalize line breaks
    text = text.replace(/\s+/g, ' ').trim();
    
    return text;
  }

  private cleanText(text: string): string {
    if (!text) return '';
    
    // Remove excessive whitespace
    let cleaned = text.replace(/\s+/g, ' ').trim();
    
    // Remove common email signatures and footers
    cleaned = cleaned.replace(/--\s*$.*$/gm, ''); // Remove lines after --
    cleaned = cleaned.replace(/Sent from my .*$/gm, ''); // Remove "Sent from my iPhone" etc.
    cleaned = cleaned.replace(/Get Outlook for .*$/gm, ''); // Remove Outlook signatures
    cleaned = cleaned.replace(/This email was sent from .*$/gm, ''); // Remove email client signatures
    
    // Remove quoted text (replies)
    cleaned = cleaned.replace(/^On .* wrote:$/gm, '');
    cleaned = cleaned.replace(/^From: .*$/gm, '');
    cleaned = cleaned.replace(/^To: .*$/gm, '');
    cleaned = cleaned.replace(/^Subject: .*$/gm, '');
    cleaned = cleaned.replace(/^Date: .*$/gm, '');
    
    // Clean up again after removing quoted text
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    
    return cleaned;
  }
}

export default IMAPService;

