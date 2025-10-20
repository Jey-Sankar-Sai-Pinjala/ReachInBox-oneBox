import { EmailDocument } from '../models/email.interface';
export declare class WebhookService {
    private slackWebhookUrl;
    private webhookSiteUrl;
    constructor();
    triggerInterestedEmailWebhooks(email: EmailDocument): Promise<void>;
    private sendSlackNotification;
    private sendExternalWebhook;
    sendTestSlackNotification(): Promise<void>;
    sendTestExternalWebhook(): Promise<void>;
    sendMeetingBookedNotification(email: EmailDocument): Promise<void>;
    sendSpamAlert(email: EmailDocument): Promise<void>;
    getWebhookStatus(): {
        slackConfigured: boolean;
        externalWebhookConfigured: boolean;
    };
}
export default WebhookService;
//# sourceMappingURL=webhook.service.d.ts.map