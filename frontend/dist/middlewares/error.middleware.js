"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notFoundHandler = exports.globalErrorHandler = void 0;
const errorHandler_1 = require("../utils/errorHandler");
const logger_1 = require("../utils/logger");
const globalErrorHandler = (error, req, res, next) => {
    logger_1.logger.error('Global error handler:', {
        error: error.message,
        stack: error.stack,
        url: req.url,
        method: req.method,
        ip: req.ip
    });
    (0, errorHandler_1.errorHandler)(error, req, res, next);
};
exports.globalErrorHandler = globalErrorHandler;
const notFoundHandler = (req, res, next) => {
    (0, errorHandler_1.notFound)(req, res, next);
};
exports.notFoundHandler = notFoundHandler;
exports.default = {
    globalErrorHandler: exports.globalErrorHandler,
    notFoundHandler: exports.notFoundHandler
};
//# sourceMappingURL=error.middleware.js.map