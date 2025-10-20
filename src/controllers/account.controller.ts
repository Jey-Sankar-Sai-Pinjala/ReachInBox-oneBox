import { Request, Response } from 'express';
import { logger } from '../utils/logger';
import { IMAPService } from '../services/imap.service';
import { asyncHandler } from '../utils/errorHandler';

export class AccountController {
  private imapService: IMAPService;

  constructor() {
    this.imapService = new IMAPService();
  }

  public getAccounts = asyncHandler(async (req: Request, res: Response) => {
    const statuses = this.imapService.getAccountStatuses();

    res.json({
      success: true,
      data: statuses
    });
  });

  public getAccountStatus = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    
    const status = this.imapService.getAccountStatus(id);
    
    if (!status) {
      return res.status(404).json({
        success: false,
        error: 'Account not found'
      });
    }

    return res.json({
      success: true,
      data: status
    });
  });

  public reconnectAccount = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    await this.imapService.reconnectAccount(id);

    res.json({
      success: true,
      message: `Account ${id} reconnected successfully`
    });
  });

  public disconnectAll = asyncHandler(async (req: Request, res: Response) => {
    await this.imapService.disconnectAll();

    res.json({
      success: true,
      message: 'All accounts disconnected successfully'
    });
  });

  public connectAll = asyncHandler(async (req: Request, res: Response) => {
    await this.imapService.connectAll();

    res.json({
      success: true,
      message: 'All accounts connected successfully'
    });
  });
}

export default AccountController;

