import { Request, Response } from 'express';
export declare class AccountController {
    private imapService;
    constructor();
    getAccounts: (req: Request, res: Response, next: import("express").NextFunction) => void;
    getAccountStatus: (req: Request, res: Response, next: import("express").NextFunction) => void;
    reconnectAccount: (req: Request, res: Response, next: import("express").NextFunction) => void;
    disconnectAll: (req: Request, res: Response, next: import("express").NextFunction) => void;
    connectAll: (req: Request, res: Response, next: import("express").NextFunction) => void;
}
export default AccountController;
//# sourceMappingURL=account.controller.d.ts.map