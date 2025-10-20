import { config } from '../config/env';
import { logger } from '../utils/logger';
import { EmailDocument } from '../models/email.interface';
import { fetchSlack, fetchWebhook } from '../utils/fetchHelper';

export class WebhookService {
  private slackWebhookUrl: string;
  private webhookSiteUrl: string;

  constructor() {
    this.slackWebhookUrl = config.slack.webhookUrl;
    this.webhookSiteUrl = config.webhook.siteUrl;
  }

  public async triggerInterestedEmailWebhooks(email: EmailDocument): Promise<void> {
    if (email.aiCategory !== 'Interested') {
      logger.warn(`⚠️  Webhook triggered for non-Interested email: ${email.aiCategory}`);
      return;
    }

    logger.info(`🚀 Triggering webhooks for Interested email: ${email.subject}`);

    const promises = [];

    // Trigger Slack notification
    if (this.slackWebhookUrl) {
      promises.push(this.sendSlackNotification(email));
    } else {
      logger.warn('⚠️  Slack webhook URL not configured');
    }

    // Trigger external webhook
    if (this.webhookSiteUrl) {
      promises.push(this.sendExternalWebhook(email));
    } else {
      logger.warn('⚠️  External webhook URL not configured');
    }

    try {
      await Promise.all(promises);
      logger.info(`✅ All webhooks triggered successfully for email: ${email.id}`);
    } catch (error) {
      logger.error(`❌ Error triggering webhooks for email ${email.id}:`, error);
      throw error;
    }
  }

  private async sendSlackNotification(email: EmailDocument): Promise<void> {
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

    await fetchSlack(this.slackWebhookUrl, slackPayload);
    logger.info(`📱 Slack notification sent for email: ${email.id}`);
  }

  private async sendExternalWebhook(email: EmailDocument): Promise<void> {
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

    await fetchWebhook(this.webhookSiteUrl, webhookPayload);
    logger.info(`🔗 External webhook triggered for email: ${email.id}`);
  }

  public async sendTestSlackNotification(): Promise<void> {
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

    await fetchSlack(this.slackWebhookUrl, testPayload);
    logger.info('✅ Test Slack notification sent successfully');
  }

  public async sendTestExternalWebhook(): Promise<void> {
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

    await fetchWebhook(this.webhookSiteUrl, testPayload);
    logger.info('✅ Test external webhook sent successfully');
  }

  public async sendMeetingBookedNotification(email: EmailDocument): Promise<void> {
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
      await fetchSlack(this.slackWebhookUrl, slackPayload);
    }
  }

  public async sendSpamAlert(email: EmailDocument): Promise<void> {
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
      await fetchSlack(this.slackWebhookUrl, slackPayload);
    }
  }

  public getWebhookStatus(): {
    slackConfigured: boolean;
    externalWebhookConfigured: boolean;
  } {
    return {
      slackConfigured: !!this.slackWebhookUrl,
      externalWebhookConfigured: !!this.webhookSiteUrl
    };
  }
}

export default WebhookService;

