import { Request, Response, NextFunction } from 'express';
export declare const globalErrorHandler: (error: any, req: Request, res: Response, next: NextFunction) => void;
export declare const notFoundHandler: (req: Request, res: Response, next: NextFunction) => void;
declare const _default: {
    globalErrorHandler: (error: any, req: Request, res: Response, next: NextFunction) => void;
    notFoundHandler: (req: Request, res: Response, next: NextFunction) => void;
};
export default _default;
//# sourceMappingURL=error.middleware.d.ts.map