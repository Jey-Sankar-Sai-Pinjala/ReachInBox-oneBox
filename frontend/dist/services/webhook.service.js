"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebhookService = void 0;
const env_1 = require("../config/env");
const logger_1 = require("../utils/logger");
const fetchHelper_1 = require("../utils/fetchHelper");
class WebhookService {
    constructor() {
        this.slackWebhookUrl = env_1.config.slack.webhookUrl;
        this.webhookSiteUrl = env_1.config.webhook.siteUrl;
    }
    async triggerInterestedEmailWebhooks(email) {
        if (email.aiCategory !== 'Interested') {
            logger_1.logger.warn(`⚠️  Webhook triggered for non-Interested email: ${email.aiCategory}`);
            return;
        }
        logger_1.logger.info(`🚀 Triggering webhooks for Interested email: ${email.subject}`);
        const promises = [];
        if (this.slackWebhookUrl) {
            promises.push(this.sendSlackNotification(email));
        }
        else {
            logger_1.logger.warn('⚠️  Slack webhook URL not configured');
        }
        if (this.webhookSiteUrl) {
            promises.push(this.sendExternalWebhook(email));
        }
        else {
            logger_1.logger.warn('⚠️  External webhook URL not configured');
        }
        try {
            await Promise.all(promises);
            logger_1.logger.info(`✅ All webhooks triggered successfully for email: ${email.id}`);
        }
        catch (error) {
            logger_1.logger.error(`❌ Error triggering webhooks for email ${email.id}:`, error);
            throw error;
        }
    }
    async sendSlackNotification(email) {
        const slackPayload = {
            text: "🎯 New Interested Lead Detected!",
            blocks: [
                {
                    type: "header",
                    text: {
                        type: "plain_text",
                        text: "🎯 New Interested Lead"
                    }
                },
                {
                    type: "section",
                    fields: [
                        {
                            type: "mrkdwn",
                            text: `*Subject:* ${email.subject}`
                        },
                        {
                            type: "mrkdwn",
                            text: `*From:* ${email.from}`
                        },
                        {
                            type: "mrkdwn",
                            text: `*Account:* ${email.accountId}`
                        },
                        {
                            type: "mrkdwn",
                            text: `*Date:* ${email.date.toLocaleString()}`
                        }
                    ]
                },
                {
                    type: "section",
                    text: {
                        type: "mrkdwn",
                        text: `*Email Preview:*\n${email.body.substring(0, 500)}${email.body.length > 500 ? '...' : ''}`
                    }
                },
                {
                    type: "actions",
                    elements: [
                        {
                            type: "button",
                            text: {
                                type: "plain_text",
                                text: "View Email"
                            },
                            style: "primary",
                            url: `https://your-app.com/emails/${email.id}`
                        }
                    ]
                }
            ]
        };
        await (0, fetchHelper_1.fetchSlack)(this.slackWebhookUrl, slackPayload);
        logger_1.logger.info(`📱 Slack notification sent for email: ${email.id}`);
    }
    async sendExternalWebhook(email) {
        const webhookPayload = {
            event: 'InterestedLead',
            timestamp: new Date().toISOString(),
            email: {
                id: email.id,
                subject: email.subject,
                from: email.from,
                to: email.to,
                date: email.date.toISOString(),
                body: email.body,
                accountId: email.accountId,
                folder: email.folder,
                aiCategory: email.aiCategory,
                hasAttachments: email.hasAttachments,
                attachmentCount: email.attachmentCount
            },
            metadata: {
                source: 'reachinbox-onebox',
                version: '1.0.0',
                processingTime: new Date().toISOString()
            }
        };
        await (0, fetchHelper_1.fetchWebhook)(this.webhookSiteUrl, webhookPayload);
        logger_1.logger.info(`🔗 External webhook triggered for email: ${email.id}`);
    }
    async sendTestSlackNotification() {
        if (!this.slackWebhookUrl) {
            throw new Error('Slack webhook URL not configured');
        }
        const testPayload = {
            text: "🧪 Test notification from ReachInbox Onebox",
            blocks: [
                {
                    type: "section",
                    text: {
                        type: "mrkdwn",
                        text: "🧪 *Test Notification*\nThis is a test message to verify Slack integration is working correctly."
                    }
                }
            ]
        };
        await (0, fetchHelper_1.fetchSlack)(this.slackWebhookUrl, testPayload);
        logger_1.logger.info('✅ Test Slack notification sent successfully');
    }
    async sendTestExternalWebhook() {
        if (!this.webhookSiteUrl) {
            throw new Error('External webhook URL not configured');
        }
        const testPayload = {
            event: 'TestWebhook',
            timestamp: new Date().toISOString(),
            message: 'This is a test webhook to verify external integration is working correctly.',
            metadata: {
                source: 'reachinbox-onebox',
                version: '1.0.0'
            }
        };
        await (0, fetchHelper_1.fetchWebhook)(this.webhookSiteUrl, testPayload);
        logger_1.logger.info('✅ Test external webhook sent successfully');
    }
    async sendMeetingBookedNotification(email) {
        if (email.aiCategory !== 'Meeting Booked') {
            return;
        }
        const slackPayload = {
            text: "📅 Meeting Booked!",
            blocks: [
                {
                    type: "header",
                    text: {
                        type: "plain_text",
                        text: "📅 Meeting Booked"
                    }
                },
                {
                    type: "section",
                    fields: [
                        {
                            type: "mrkdwn",
                            text: `*Subject:* ${email.subject}`
                        },
                        {
                            type: "mrkdwn",
                            text: `*From:* ${email.from}`
                        }
                    ]
                }
            ]
        };
        if (this.slackWebhookUrl) {
            await (0, fetchHelper_1.fetchSlack)(this.slackWebhookUrl, slackPayload);
        }
    }
    async sendSpamAlert(email) {
        if (email.aiCategory !== 'Spam') {
            return;
        }
        const slackPayload = {
            text: "🚨 Spam Email Detected",
            blocks: [
                {
                    type: "section",
                    text: {
                        type: "mrkdwn",
                        text: `🚨 *Spam Email Detected*\nSubject: ${email.subject}\nFrom: ${email.from}`
                    }
                }
            ]
        };
        if (this.slackWebhookUrl) {
            await (0, fetchHelper_1.fetchSlack)(this.slackWebhookUrl, slackPayload);
        }
    }
    getWebhookStatus() {
        return {
            slackConfigured: !!this.slackWebhookUrl,
            externalWebhookConfigured: !!this.webhookSiteUrl
        };
    }
}
exports.WebhookService = WebhookService;
exports.default = WebhookService;
//# sourceMappingURL=webhook.service.js.map