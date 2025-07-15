"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaginationSchema = exports.AnalyticsQuerySchema = exports.DateRangeSchema = exports.UpdateTransactionSchema = exports.CreateTransactionSchema = exports.TransactionSchema = exports.UpdateCropSchema = exports.CreateCropSchema = exports.CropSchema = exports.TransactionType = void 0;
var zod_1 = require("zod");
// Enums
var TransactionType;
(function (TransactionType) {
    TransactionType["BUY"] = "BUY";
    TransactionType["SELL"] = "SELL";
})(TransactionType || (exports.TransactionType = TransactionType = {}));
// Zod schemas for validation
exports.CropSchema = zod_1.z.object({
    id: zod_1.z.string().optional(),
    name: zod_1.z.string().min(1, 'Crop name is required'),
    description: zod_1.z.string().optional(),
    basePrice: zod_1.z.number().min(0, 'Base price must be positive').default(0),
    currentStock: zod_1.z.number().min(0, 'Stock must be positive').default(0),
    unit: zod_1.z.string().default('kg'),
    category: zod_1.z.string().optional(),
});
exports.CreateCropSchema = exports.CropSchema.omit({ id: true });
exports.UpdateCropSchema = exports.CropSchema.partial().omit({ id: true });
exports.TransactionSchema = zod_1.z.object({
    id: zod_1.z.string().optional(),
    cropId: zod_1.z.string().min(1, 'Crop ID is required'),
    cropName: zod_1.z.string().min(1, 'Crop name is required'),
    action: zod_1.z.nativeEnum(TransactionType),
    quantity: zod_1.z.number().positive('Quantity must be positive'),
    rate: zod_1.z.number().positive('Rate must be positive'),
    total: zod_1.z.number().positive('Total must be positive'),
    partyName: zod_1.z.string().min(1, 'Party name is required'),
    notes: zod_1.z.string().optional(),
    date: zod_1.z.string().or(zod_1.z.date()).transform(function (val) { return new Date(val); }),
});
exports.CreateTransactionSchema = exports.TransactionSchema.omit({ id: true });
exports.UpdateTransactionSchema = exports.TransactionSchema.partial().omit({ id: true });
// Query parameter schemas
exports.DateRangeSchema = zod_1.z.object({
    startDate: zod_1.z.string().optional(),
    endDate: zod_1.z.string().optional(),
});
exports.AnalyticsQuerySchema = exports.DateRangeSchema.extend({
    cropIds: zod_1.z.string().optional().transform(function (val) { return val ? val.split(',') : undefined; }),
    transactionType: zod_1.z.nativeEnum(TransactionType).optional(),
});
exports.PaginationSchema = zod_1.z.object({
    page: zod_1.z.string().transform(function (val) { return parseInt(val) || 1; }),
    limit: zod_1.z.string().transform(function (val) { return Math.min(parseInt(val) || 10, 100); }),
});
