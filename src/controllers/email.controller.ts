import { Request, Response } from 'express';
import { logger } from '../utils/logger';
import { EmailIndexService } from '../services/email-index.service';
import { WebhookService } from '../services/webhook.service';
import { RAGService } from '../services/rag.service';
import { EmailSearchQuery } from '../models/email.interface';
import { asyncHandler } from '../utils/errorHandler';

export class EmailController {
  private emailIndexService: EmailIndexService;
  private ragService: RAGService;
  private webhookService: WebhookService;

  constructor() {
    this.emailIndexService = new EmailIndexService();
    this.ragService = new RAGService();
    this.webhookService = new WebhookService();
  }

  public searchEmails = asyncHandler(async (req: Request, res: Response) => {
    const {
      q: query,
      account,
      folder,
      category,
      from,
      dateFrom,
      dateTo,
      page = 1,
      size = 20,
      sortBy = 'date',
      sortOrder = 'desc',
      hasAttachments,
      to
    } = req.query;

    // Validate pagination parameters
    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(size as string) || 20));

    // Validate sort parameters
    const validSortFields = ['date', 'subject', 'from', 'indexedAt'];
    const sortField = validSortFields.includes(sortBy as string) ? sortBy as string : 'date';
    const sortDirection = sortOrder === 'asc' ? 'asc' : 'desc';

    const searchQuery: EmailSearchQuery = {
      query: query as string,
      accountId: account as string,
      folder: folder as string,
      category: category as any,
      from: from as string,
      to: to as string,
      dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
      dateTo: dateTo ? new Date(dateTo as string) : undefined,
      page: pageNum,
      size: pageSize,
      sortBy: sortField,
      sortOrder: sortDirection as 'asc' | 'desc',
      hasAttachments: hasAttachments ? hasAttachments === 'true' : undefined
    };

    const results = await this.emailIndexService.searchEmails(searchQuery);

    res.json({
      success: true,
      data: results,
      meta: {
        query: {
          search: query || '',
          filters: {
            account: account || null,
            folder: folder || null,
            category: category || null,
            from: from || null,
            to: to || null,
            dateFrom: dateFrom || null,
            dateTo: dateTo || null,
            hasAttachments: hasAttachments || null
          },
          pagination: {
            page: pageNum,
            size: pageSize,
            totalPages: results.totalPages,
            totalResults: results.total
          },
          sort: {
            field: sortField,
            order: sortDirection
          }
        }
      }
    });
  });

  public getEmailById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    
    const email = await this.emailIndexService.getEmailById(id);
    
    if (!email) {
      return res.status(404).json({
        success: false,
        error: 'Email not found'
      });
    }

    return res.json({
      success: true,
      data: email
    });
  });

  public updateEmailCategory = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { category } = req.body;

    if (!category) {
      return res.status(400).json({
        success: false,
        error: 'Category is required'
      });
    }

    await this.emailIndexService.updateEmailCategory(id, category);

    // Trigger Slack + external webhook when marked as Interested
    if (category === 'Interested') {
      const email = await this.emailIndexService.getEmailById(id);
      if (email) {
        await this.webhookService.triggerInterestedEmailWebhooks({
          ...email,
          aiCategory: 'Interested'
        });
      } else {
        logger.warn(`Email ${id} not found after category update; skipping webhook trigger.`);
      }
    }

    return res.json({
      success: true,
      message: 'Email category updated successfully'
    });
  });

  public suggestReply = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    // Get the email first
    const email = await this.emailIndexService.getEmailById(id);
    
    if (!email) {
      return res.status(404).json({
        success: false,
        error: 'Email not found'
      });
    }

    // Generate reply suggestion using RAG
    const suggestedReply = await this.ragService.suggestReply(email);

    return res.json({
      success: true,
      data: {
        emailId: id,
        suggestedReply,
        generatedAt: new Date().toISOString()
      }
    });
  });

  public getEmailStats = asyncHandler(async (req: Request, res: Response) => {
    const stats = await this.emailIndexService.getEmailStats();

    res.json({
      success: true,
      data: stats
    });
  });

  public deleteEmail = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    await this.emailIndexService.deleteEmail(id);

    res.json({
      success: true,
      message: 'Email deleted successfully'
    });
  });

  public bulkIndexEmails = asyncHandler(async (req: Request, res: Response) => {
    const { emails } = req.body;

    if (!Array.isArray(emails)) {
      return res.status(400).json({
        success: false,
        error: 'Emails must be an array'
      });
    }

    await this.emailIndexService.bulkIndexEmails(emails);

    return res.json({
      success: true,
      message: `Bulk indexed ${emails.length} emails successfully`
    });
  });

  public reindexAll = asyncHandler(async (req: Request, res: Response) => {
    await this.emailIndexService.reindexAll();

    res.json({
      success: true,
      message: 'Full reindex completed successfully'
    });
  });

  public advancedSearch = asyncHandler(async (req: Request, res: Response) => {
    const {
      query,
      filters = {},
      pagination = {},
      sort = {}
    } = req.body;

    // Validate and set defaults
    const searchQuery: EmailSearchQuery = {
      query: query || '',
      accountId: filters.accountId,
      folder: filters.folder,
      category: filters.category,
      from: filters.from,
      to: filters.to,
      dateFrom: filters.dateFrom ? new Date(filters.dateFrom) : undefined,
      dateTo: filters.dateTo ? new Date(filters.dateTo) : undefined,
      hasAttachments: filters.hasAttachments,
      page: Math.max(1, pagination.page || 1),
      size: Math.min(100, Math.max(1, pagination.size || 20)),
      sortBy: sort.field || 'date',
      sortOrder: sort.order || 'desc'
    };

    const results = await this.emailIndexService.searchEmails(searchQuery);

    res.json({
      success: true,
      data: results,
      meta: {
        query: {
          search: query || '',
          filters,
          pagination: {
            page: searchQuery.page,
            size: searchQuery.size,
            totalPages: results.totalPages,
            totalResults: results.total
          },
          sort: {
            field: searchQuery.sortBy,
            order: searchQuery.sortOrder
          }
        }
      }
    });
  });
}

export default EmailController;

