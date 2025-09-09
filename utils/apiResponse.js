// utils/ApiResponse.js
export class ApiResponse {
    static _stamp(res) {
        return {
            timestamp: new Date().toISOString(),
            ...(res.req?.id ? { requestId: res.req.id } : {}),
        };
    }

    static success(res, data = null, message = 'Success', statusCode = 200, meta) {
        const body = { success: true, message, data, ...ApiResponse._stamp(res) };
        if (meta !== undefined) body.meta = meta; // hoặc dùng 'pagination' nếu FE đang dùng key này
        return res.status(statusCode).json(body);
    }

    static created(res, data = null, message = 'Created successfully') {
        return ApiResponse.success(res, data, message, 201);
    }

    static noContent(res) {
        return res.status(204).send();
    }

    static paginated(res, items, pagination, message = 'Success') {
        const { page, limit, total } = pagination;
        const body = {
            success: true,
            message,
            data: {
                items,
                total,
                page: Number(page),
                limit: Number(limit),
            },
            timestamp: new Date().toISOString(),
            ...(res.req?.id ? { requestId: res.req.id } : {}),
        };
        return res.status(200).json(body);
    }

    // Thêm code + details
    static error(res, message = 'Internal Server Error', statusCode = 500, { code = 'INTERNAL_ERROR', details } = {}) {
        const body = {
            success: false,
            error: { code, message, ...(details ? { details } : {}) },
            ...ApiResponse._stamp(res),
        };
        return res.status(statusCode).json(body);
    }
}

// Middleware gắn helpers vào res
export const attachResponseHelpers = (_req, res, next) => {
    res.success = (data, message, statusCode, meta) => ApiResponse.success(res, data, message, statusCode, meta);
    res.created = (data, message) => ApiResponse.created(res, data, message);
    res.noContent = () => ApiResponse.noContent(res);
    res.paginated = (items, pagination, message) => ApiResponse.paginated(res, items, pagination, message);
    res.error = (message, statusCode, opts) => ApiResponse.error(res, message, statusCode, opts);
    next();
};
