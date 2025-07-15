"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculatePagination = exports.getDateRange = exports.asyncHandler = exports.errorResponse = exports.successResponse = exports.validateQuery = exports.validateBody = void 0;
var zod_1 = require("zod");
// Validation middleware
var validateBody = function (schema) {
    return function (req, res, next) {
        try {
            req.body = schema.parse(req.body);
            next();
        }
        catch (error) {
            if (error instanceof zod_1.ZodError) {
                return res.status(400).json({
                    success: false,
                    error: 'Validation Error',
                    message: error.errors.map(function (e) { return "".concat(e.path.join('.'), ": ").concat(e.message); }).join(', ')
                });
            }
            next(error);
        }
    };
};
exports.validateBody = validateBody;
var validateQuery = function (schema) {
    return function (req, res, next) {
        try {
            req.query = schema.parse(req.query);
            next();
        }
        catch (error) {
            if (error instanceof zod_1.ZodError) {
                return res.status(400).json({
                    success: false,
                    error: 'Query Validation Error',
                    message: error.errors.map(function (e) { return "".concat(e.path.join('.'), ": ").concat(e.message); }).join(', ')
                });
            }
            next(error);
        }
    };
};
exports.validateQuery = validateQuery;
// Response helpers
var successResponse = function (data, message) { return ({
    success: true,
    data: data,
    message: message
}); };
exports.successResponse = successResponse;
var errorResponse = function (error, message) { return ({
    success: false,
    error: error,
    message: message
}); };
exports.errorResponse = errorResponse;
// Error handler
var asyncHandler = function (fn) {
    return function (req, res, next) {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};
exports.asyncHandler = asyncHandler;
// Date utilities
var getDateRange = function (startDate, endDate) {
    var start = startDate ? new Date(startDate) : new Date(Date.now() - 365 * 24 * 60 * 60 * 1000); // Default: 1 year ago
    var end = endDate ? new Date(endDate) : new Date(); // Default: now
    return { start: start, end: end };
};
exports.getDateRange = getDateRange;
// Calculate pagination
var calculatePagination = function (page, limit, total) {
    var pages = Math.ceil(total / limit);
    var offset = (page - 1) * limit;
    return {
        page: page,
        limit: limit,
        total: total,
        pages: pages,
        offset: offset,
        hasNext: page < pages,
        hasPrev: page > 1
    };
};
exports.calculatePagination = calculatePagination;
