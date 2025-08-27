export class AppError extends Error {
    /**
     * @param {string} message
     * @param {number} statusCode HTTP status code (400/401/403/404/409/422/500...)
     */
    constructor(message, statusCode = 500) {
        super(message);
        this.statusCode = statusCode;
        this.status = String(statusCode).startsWith('4') ? 'fail' : 'error';
        this.isOperational = true;

        // Giữ stack gọn, bỏ constructor khỏi stack trace
        Error.captureStackTrace?.(this, this.constructor);
    }
}


export const catchAsync = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};
