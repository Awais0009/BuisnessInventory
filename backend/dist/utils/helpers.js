"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculatePagination = exports.getDateRange = exports.asyncHandler = exports.errorResponse = exports.successResponse = exports.validateQuery = exports.validateBody = void 0;
const zod_1 = require("zod");
const validateBody = (schema) => {
    return (req, res, next) => {
        try {
            req.body = schema.parse(req.body);
            next();
        }
        catch (error) {
            if (error instanceof zod_1.ZodError) {
                return res.status(400).json({
                    success: false,
                    error: 'Validation Error',
                    message: error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
                });
            }
            next(error);
        }
    };
};
exports.validateBody = validateBody;
const validateQuery = (schema) => {
    return (req, res, next) => {
        try {
            req.query = schema.parse(req.query);
            next();
        }
        catch (error) {
            if (error instanceof zod_1.ZodError) {
                return res.status(400).json({
                    success: false,
                    error: 'Query Validation Error',
                    message: error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
                });
            }
            next(error);
        }
    };
};
exports.validateQuery = validateQuery;
const successResponse = (data, message) => ({
    success: true,
    data,
    message
});
exports.successResponse = successResponse;
const errorResponse = (error, message) => ({
    success: false,
    error,
    message
});
exports.errorResponse = errorResponse;
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};
exports.asyncHandler = asyncHandler;
const getDateRange = (startDate, endDate) => {
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();
    return { start, end };
};
exports.getDateRange = getDateRange;
const calculatePagination = (page, limit, total) => {
    const pages = Math.ceil(total / limit);
    const offset = (page - 1) * limit;
    return {
        page,
        limit,
        total,
        pages,
        offset,
        hasNext: page < pages,
        hasPrev: page > 1
    };
};
exports.calculatePagination = calculatePagination;
//# sourceMappingURL=helpers.js.map