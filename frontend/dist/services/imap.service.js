"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IMAPService = void 0;
const node_imap_1 = __importDefault(require("node-imap"));
const mailparser_1 = require("mailparser");
const events_1 = require("events");
const uuid_1 = require("uuid");
const logger_1 = require("../utils/logger");
const env_1 = require("../config/env");
class IMAPService extends events_1.EventEmitter {
    constructor() {
        super();
        this.connections = new Map();
        this.accountStatuses = new Map();
        this.isIdleActive = new Map();
        this.idleTimeouts = new Map();
        this.lastSeenUid = new Map();
        this.initializeAccounts();
    }
    initializeAccounts() {
        env_1.config.imap.accounts.forEach(account => {
            this.accountStatuses.set(account.id, {
                accountId: account.id,
                isConnected: false,
                lastSync: null,
                totalEmails: 0,
                newEmails: 0
            });
        });
    }
    async connectAll() {
        logger_1.logger.info('🔄 Connecting to all IMAP accounts...');
        for (const account of env_1.config.imap.accounts) {
            try {
                await this.connectAccount(account);
                await this.initialSync(account.id);
                await this.startIdleMode(account.id);
            }
            catch (error) {
                logger_1.logger.error(`❌ Failed to connect account ${account.id}:`, error);
                this.updateAccountStatus(account.id, { error: error.message });
            }
        }
    }
    async connectAccount(account) {
        return new Promise((resolve, reject) => {
            const imap = new node_imap_1.default({
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
                logger_1.logger.info(`✅ Connected to IMAP account: ${account.user}`);
                this.connections.set(account.id, imap);
                this.updateAccountStatus(account.id, {
                    isConnected: true,
                    error: undefined
                });
                resolve();
            });
            imap.once('error', (err) => {
                logger_1.logger.error(`❌ IMAP connection error for ${account.user}:`, err);
                this.updateAccountStatus(account.id, {
                    isConnected: false,
                    error: err.message
                });
                reject(err);
            });
            imap.once('end', () => {
                logger_1.logger.warn(`🔌 IMAP connection ended for ${account.user}`);
                this.updateAccountStatus(account.id, { isConnected: false });
                this.connections.delete(account.id);
            });
            imap.connect();
        });
    }
    async initialSync(accountId) {
        const imap = this.connections.get(accountId);
        if (!imap)
            return;
        try {
            await this.openInbox(imap);
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            const searchCriteria = ['ALL'];
            console.log(`🔧 DEBUG: Using ALL search criteria instead of SINCE`);
            imap.search(searchCriteria, (err, uids) => {
                if (err) {
                    logger_1.logger.error(`❌ Search error for account ${accountId}:`, err);
                    return;
                }
                if (uids && uids.length > 0) {
                    logger_1.logger.info(`📧 Found ${uids.length} emails for initial sync in account ${accountId}`);
                    this.fetchEmails(imap, uids, accountId);
                }
            });
        }
        catch (error) {
            logger_1.logger.error(`❌ Initial sync error for account ${accountId}:`, error);
        }
    }
    async startIdleMode(accountId) {
        const imap = this.connections.get(accountId);
        if (!imap)
            return;
        try {
            const box = await this.openInbox(imap);
            if (!this.lastSeenUid.has(accountId) && box.uidnext) {
                const uidNext = box.uidnext;
                this.lastSeenUid.set(accountId, Math.max(0, uidNext - 1));
            }
            this.isIdleActive.set(accountId, true);
            imap.on('mail', (numNewMsgs) => {
                logger_1.logger.info(`📬 New email detected in account ${accountId}: ${numNewMsgs} messages`);
                this.fetchNewByUid(accountId);
            });
            imap.on('close', (hadError) => {
                logger_1.logger.warn(`🔁 IMAP connection closed for ${accountId}. hadError=${hadError}`);
                this.isIdleActive.set(accountId, false);
                setTimeout(() => this.reconnectAccount(accountId).catch(() => { }), 2000);
            });
            imap.on('error', (err) => {
                logger_1.logger.error(`❌ IMAP error for ${accountId}:`, err);
            });
            logger_1.logger.info(`🔄 IDLE mode started for account ${accountId}`);
        }
        catch (error) {
            logger_1.logger.error(`❌ Failed to start IDLE mode for account ${accountId}:`, error);
        }
    }
    async restartIdleMode(accountId) {
        const imap = this.connections.get(accountId);
        if (!imap)
            return;
        try {
            const timeout = this.idleTimeouts.get(accountId);
            if (timeout) {
                clearTimeout(timeout);
                this.idleTimeouts.delete(accountId);
            }
            setTimeout(() => {
                this.startIdleMode(accountId);
            }, 1000);
            logger_1.logger.info(`🔄 Restarting IDLE mode for account ${accountId}`);
        }
        catch (error) {
            logger_1.logger.error(`❌ Failed to restart IDLE mode for account ${accountId}:`, error);
        }
    }
    async openInbox(imap) {
        return new Promise((resolve, reject) => {
            imap.openBox('INBOX', false, (err, box) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(box);
                }
            });
        });
    }
    async fetchNewByUid(accountId) {
        const imap = this.connections.get(accountId);
        if (!imap)
            return;
        try {
            const box = await this.openInbox(imap);
            let startFromUid = this.lastSeenUid.get(accountId);
            if (typeof startFromUid !== 'number') {
                const uidNext = box.uidnext;
                startFromUid = uidNext ? Math.max(1, uidNext - 50) : 1;
            }
            else {
                startFromUid = startFromUid + 1;
            }
            const range = `${startFromUid}:*`;
            imap.search(['UID', range], (err, uids) => {
                if (err) {
                    logger_1.logger.error(`❌ UID search error for account ${accountId}:`, err);
                    return;
                }
                if (!uids || uids.length === 0) {
                    return;
                }
                const fetch = imap.fetch(uids, { bodies: '', struct: true, uid: true });
                let maxUid = this.lastSeenUid.get(accountId) || 0;
                fetch.on('message', (msg, seqno) => {
                    let buffer = '';
                    let currentUid;
                    msg.on('attributes', (attrs) => {
                        if (attrs.uid) {
                            currentUid = attrs.uid;
                            if (currentUid > maxUid) {
                                maxUid = currentUid;
                            }
                        }
                    });
                    msg.on('body', (stream) => {
                        stream.on('data', (chunk) => {
                            buffer += chunk.toString('utf8');
                        });
                    });
                    msg.once('end', () => {
                        this.parseEmail(buffer, accountId, 'INBOX');
                    });
                });
                fetch.once('error', (fetchErr) => {
                    logger_1.logger.error(`❌ UID fetch error for account ${accountId}:`, fetchErr);
                });
                fetch.once('end', () => {
                    if (maxUid > (this.lastSeenUid.get(accountId) || 0)) {
                        this.lastSeenUid.set(accountId, maxUid);
                    }
                    this.updateAccountStatus(accountId, { lastSync: new Date() });
                    logger_1.logger.info(`✅ Finished UID fetch for account ${accountId}, lastSeenUid=${this.lastSeenUid.get(accountId)}`);
                });
            });
        }
        catch (error) {
            logger_1.logger.error(`❌ Error in fetchNewByUid for account ${accountId}:`, error);
        }
    }
    async fetchEmails(imap, uids, accountId) {
        if (uids.length === 0)
            return;
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
            });
        });
        fetch.once('error', (err) => {
            logger_1.logger.error(`❌ Fetch error for account ${accountId}:`, err);
        });
        fetch.once('end', () => {
            logger_1.logger.info(`✅ Finished fetching emails for account ${accountId}`);
        });
    }
    async parseEmail(rawEmail, accountId, folder) {
        try {
            const parsed = await (0, mailparser_1.simpleParser)(rawEmail);
            let plaintextBody = '';
            if (parsed.text) {
                plaintextBody = parsed.text;
            }
            else if (parsed.html) {
                plaintextBody = this.stripHtml(parsed.html);
            }
            else {
                plaintextBody = '';
            }
            plaintextBody = this.cleanText(plaintextBody);
            const emailData = {
                id: (0, uuid_1.v4)(),
                accountId,
                folder,
                subject: parsed.subject || 'No Subject',
                body: plaintextBody,
                from: parsed.from?.text || 'Unknown',
                to: parsed.to ? (Array.isArray(parsed.to) ? parsed.to.map((t) => t.text) : [parsed.to.text]) : [],
                date: parsed.date || new Date(),
                aiCategory: 'Uncategorized',
                indexedAt: new Date(),
                messageId: parsed.messageId || '',
                threadId: parsed.inReplyTo || undefined,
                hasAttachments: parsed.attachments ? parsed.attachments.length > 0 : false,
                attachmentCount: parsed.attachments ? parsed.attachments.length : 0
            };
            this.emit('emailReceived', emailData);
            const status = this.accountStatuses.get(accountId);
            if (status) {
                status.newEmails++;
                status.totalEmails++;
                this.accountStatuses.set(accountId, status);
            }
            logger_1.logger.info(`📧 Email parsed: ${emailData.subject} from ${emailData.from}`);
        }
        catch (error) {
            logger_1.logger.error('❌ Error parsing email:', error);
        }
    }
    updateAccountStatus(accountId, updates) {
        const currentStatus = this.accountStatuses.get(accountId);
        if (currentStatus) {
            const updatedStatus = { ...currentStatus, ...updates };
            this.accountStatuses.set(accountId, updatedStatus);
            this.emit('accountStatusChanged', updatedStatus);
        }
    }
    getAccountStatuses() {
        return Array.from(this.accountStatuses.values());
    }
    getAccountStatus(accountId) {
        return this.accountStatuses.get(accountId);
    }
    async disconnectAll() {
        logger_1.logger.info('🔌 Disconnecting all IMAP accounts...');
        for (const [accountId, imap] of this.connections) {
            try {
                const timeout = this.idleTimeouts.get(accountId);
                if (timeout) {
                    clearTimeout(timeout);
                }
                imap.end();
                this.connections.delete(accountId);
                this.isIdleActive.delete(accountId);
                this.idleTimeouts.delete(accountId);
                logger_1.logger.info(`✅ Disconnected account ${accountId}`);
            }
            catch (error) {
                logger_1.logger.error(`❌ Error disconnecting account ${accountId}:`, error);
            }
        }
    }
    async reconnectAccount(accountId) {
        const account = env_1.config.imap.accounts.find(acc => acc.id === accountId);
        if (!account) {
            throw new Error(`Account ${accountId} not found`);
        }
        const existingConnection = this.connections.get(accountId);
        if (existingConnection) {
            await this.disconnectAccount(accountId);
        }
        await this.connectAccount(account);
        await this.initialSync(accountId);
        await this.startIdleMode(accountId);
    }
    async disconnectAccount(accountId) {
        const imap = this.connections.get(accountId);
        if (imap) {
            const timeout = this.idleTimeouts.get(accountId);
            if (timeout) {
                clearTimeout(timeout);
            }
            imap.end();
            this.connections.delete(accountId);
            this.isIdleActive.delete(accountId);
            this.idleTimeouts.delete(accountId);
        }
    }
    async checkForNewEmails(accountId) {
        const imap = this.connections.get(accountId);
        if (!imap)
            return;
        try {
            await this.openInbox(imap);
            const status = this.accountStatuses.get(accountId);
            const sinceDate = status?.lastSync
                ? new Date(status.lastSync)
                : new Date(Date.now() - 5 * 60 * 1000);
            const formattedDate = this.formatDateForIMAP(sinceDate);
            imap.search(['UNSEEN'], (unseenErr, unseenUids) => {
                if (unseenErr) {
                    logger_1.logger.warn(`⚠️ UNSEEN search failed for account ${accountId}, falling back to SINCE:`, unseenErr);
                    imap.search(['SINCE', formattedDate], (sinceErr, uids) => {
                        if (sinceErr) {
                            logger_1.logger.error(`❌ Search error in polling for account ${accountId}:`, sinceErr);
                            return;
                        }
                        if (uids && uids.length > 0) {
                            logger_1.logger.info(`📥 Polling found ${uids.length} emails for account ${accountId}`);
                            this.fetchEmails(imap, uids, accountId);
                        }
                        this.updateAccountStatus(accountId, { lastSync: new Date() });
                    });
                    return;
                }
                if (unseenUids && unseenUids.length > 0) {
                    logger_1.logger.info(`📥 Polling found ${unseenUids.length} UNSEEN emails for account ${accountId}`);
                    this.fetchEmails(imap, unseenUids, accountId);
                }
                this.updateAccountStatus(accountId, { lastSync: new Date() });
            });
        }
        catch (error) {
            logger_1.logger.error(`❌ Error checking for new emails in account ${accountId}:`, error);
        }
    }
    formatDateForIMAP(date) {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
            'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const day = date.getDate().toString().padStart(2, '0');
        const month = months[date.getMonth()];
        const year = date.getFullYear();
        const formattedDate = `${day}-${month}-${year}`;
        console.log(`🔧 DEBUG: formatDateForIMAP called with date: ${date.toISOString()}, formatted: ${formattedDate}`);
        return formattedDate;
    }
    stripHtml(html) {
        if (!html)
            return '';
        let text = html.replace(/<[^>]*>/g, '');
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
        text = text.replace(/\s+/g, ' ').trim();
        return text;
    }
    cleanText(text) {
        if (!text)
            return '';
        let cleaned = text.replace(/\s+/g, ' ').trim();
        cleaned = cleaned.replace(/--\s*$.*$/gm, '');
        cleaned = cleaned.replace(/Sent from my .*$/gm, '');
        cleaned = cleaned.replace(/Get Outlook for .*$/gm, '');
        cleaned = cleaned.replace(/This email was sent from .*$/gm, '');
        cleaned = cleaned.replace(/^On .* wrote:$/gm, '');
        cleaned = cleaned.replace(/^From: .*$/gm, '');
        cleaned = cleaned.replace(/^To: .*$/gm, '');
        cleaned = cleaned.replace(/^Subject: .*$/gm, '');
        cleaned = cleaned.replace(/^Date: .*$/gm, '');
        cleaned = cleaned.replace(/\s+/g, ' ').trim();
        return cleaned;
    }
}
exports.IMAPService = IMAPService;
exports.default = IMAPService;
//# sourceMappingURL=imap.service.js.map