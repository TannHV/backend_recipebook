// middlewares/errorHandler.js
import { AppError } from '../utils/error.js';
import { ApiResponse } from '../utils/apiResponse.js';

// Chuẩn hoá một số lỗi kỹ thuật thành AppError thân thiện
function transformError(err) {
    if (err?.name === 'BSONTypeError' || /Argument passed in must be a string/.test(err?.message || '')) {
        const e = new AppError('ID không hợp lệ', 400); e.code = 'INVALID_ID'; return e;
    }
    if (err?.code === 11000) {
        const fields = Object.keys(err.keyPattern || {});
        const e = new AppError(`Trùng giá trị ở trường: ${fields.join(', ')}`, 400); e.code = 'DUPLICATE_KEY'; return e;
    }
    if (err?.type === 'entity.too.large') {
        const e = new AppError('Payload quá lớn', 413); e.code = 'PAYLOAD_TOO_LARGE'; return e;
    }
    if (err?.isJoi) {
        const e = new AppError(err.details?.map(d => d.message).join('; ') || 'Dữ liệu không hợp lệ', 400);
        e.code = 'VALIDATION_ERROR'; e.details = err.details?.map(d => d.message); return e;
    }
    return err;
}

export default function globalErrorHandler(err, req, res, _next) {
    let error = transformError(err);
    const isProd = process.env.NODE_ENV === 'production';

    const statusCode = Number.isInteger(error.statusCode) ? error.statusCode : 500;
    const code =
        error.code ||
        (statusCode === 401 ? 'UNAUTHORIZED'
            : statusCode === 403 ? 'FORBIDDEN'
                : statusCode === 404 ? 'NOT_FOUND'
                    : statusCode >= 500 ? 'INTERNAL_ERROR' : 'BAD_REQUEST');

    // DEV: kèm stack trong details
    if (!isProd) {
        return ApiResponse.error(res, error.message || 'Internal Server Error', statusCode, {
            code,
            details: [
                ...(error.details || []),
                ...(error.stack ? [String(error.stack)] : [])
            ],
        });
    }

    // PROD
    return ApiResponse.error(res, error.isOperational ? (error.message || 'Đã có lỗi xảy ra!') : 'Đã có lỗi xảy ra!',
        error.isOperational ? statusCode : 500,
        { code, ...(error.isOperational && error.details ? { details: error.details } : {}) }
    );

}
