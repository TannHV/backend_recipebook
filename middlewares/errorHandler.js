import { AppError } from '../utils/error.js';

/** Chuẩn hoá một số lỗi kỹ thuật thành AppError thân thiện */
function transformError(err) {
    // MongoDB: ObjectId không hợp lệ (thường bạn đã chặn bằng toObjectId)
    if (err?.name === 'BSONTypeError' || /Argument passed in must be a string/.test(err?.message || '')) {
        return new AppError('ID không hợp lệ', 400);
    }

    // MongoDB duplicate key
    if (err?.code === 11000) {
        const fields = Object.keys(err.keyPattern || {});
        return new AppError(`Trùng giá trị ở trường: ${fields.join(', ')}`, 400);
    }

    // Body quá lớn
    if (err?.type === 'entity.too.large') {
        return new AppError('Payload quá lớn', 413);
    }

    // Joi/Zod (nếu bạn dùng Joi/Zod)
    if (err?.isJoi) {
        return new AppError(err.details?.map(d => d.message).join('; ') || 'Dữ liệu không hợp lệ', 400);
    }

    return err;
}

function sendErrorDev(err, req, res) {
    res.status(err.statusCode || 500).json({
        success: false,
        status: err.status || 'error',
        message: err.message,
        // giúp trace request
        requestId: req.id,
        // show đủ trong dev
        stack: err.stack,
        raw: err, // cẩn thận: chỉ DEV mới trả
    });
}

function sendErrorProd(err, req, res) {
    // Chỉ hiển thị lỗi nghiệp vụ (isOperational)
    if (err.isOperational) {
        return res.status(err.statusCode || 500).json({
            success: false,
            status: err.status || 'error',
            message: err.message,
            requestId: req.id,
        });
    }
    // Lỗi lập trình/không lường trước: log server, trả msg chung
    console.error('UNEXPECTED ERROR ', err);
    return res.status(500).json({
        success: false,
        status: 'error',
        message: 'Đã có lỗi xảy ra!',
        requestId: req.id,
    });
}

/** Global error handler – đặt CUỐI CÙNG trong app.js */
export default function globalErrorHandler(err, req, res, _next) {
    let error = err;
    error.statusCode = error.statusCode || 500;
    error.status = error.status || 'error';

    error = transformError(error);

    const isProd = process.env.NODE_ENV === 'production';
    if (!isProd) return sendErrorDev(error, req, res);
    return sendErrorProd(error, req, res);
}
