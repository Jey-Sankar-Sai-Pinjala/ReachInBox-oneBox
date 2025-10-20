declare class Application {
    private app;
    private imapService;
    private aiCategorizer;
    private webhookService;
    private ragService;
    private emailIndexService;
    constructor();
    private initializeServices;
    private setupMiddleware;
    private setupRoutes;
    private setupErrorHandling;
    private setupEmailProcessing;
    initialize(): Promise<void>;
    start(): Promise<void>;
    gracefulShutdown(): Promise<void>;
}
declare const app: Application;
export default app;
//# sourceMappingURL=app.d.ts.map