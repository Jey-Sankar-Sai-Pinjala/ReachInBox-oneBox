import { EventEmitter } from 'events';
import { EmailSyncStatus } from '../models/email.interface';
export declare class IMAPService extends EventEmitter {
    private connections;
    private accountStatuses;
    private isIdleActive;
    private idleTimeouts;
    private lastSeenUid;
    constructor();
    private initializeAccounts;
    connectAll(): Promise<void>;
    private connectAccount;
    private initialSync;
    private startIdleMode;
    private restartIdleMode;
    private openInbox;
    private fetchNewByUid;
    private fetchEmails;
    private parseEmail;
    private updateAccountStatus;
    getAccountStatuses(): EmailSyncStatus[];
    getAccountStatus(accountId: string): EmailSyncStatus | undefined;
    disconnectAll(): Promise<void>;
    reconnectAccount(accountId: string): Promise<void>;
    private disconnectAccount;
    private checkForNewEmails;
    private formatDateForIMAP;
    private stripHtml;
    private cleanText;
}
export default IMAPService;
//# sourceMappingURL=imap.service.d.ts.map