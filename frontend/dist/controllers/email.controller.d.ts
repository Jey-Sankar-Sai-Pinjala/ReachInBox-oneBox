import { Request, Response } from 'express';
export declare class EmailController {
    private emailIndexService;
    private ragService;
    private webhookService;
    constructor();
    searchEmails: (req: Request, res: Response, next: import("express").NextFunction) => void;
    getEmailById: (req: Request, res: Response, next: import("express").NextFunction) => void;
    updateEmailCategory: (req: Request, res: Response, next: import("express").NextFunction) => void;
    suggestReply: (req: Request, res: Response, next: import("express").NextFunction) => void;
    getEmailStats: (req: Request, res: Response, next: import("express").NextFunction) => void;
    deleteEmail: (req: Request, res: Response, next: import("express").NextFunction) => void;
    bulkIndexEmails: (req: Request, res: Response, next: import("express").NextFunction) => void;
    reindexAll: (req: Request, res: Response, next: import("express").NextFunction) => void;
    advancedSearch: (req: Request, res: Response, next: import("express").NextFunction) => void;
}
export default EmailController;
//# sourceMappingURL=email.controller.d.ts.map