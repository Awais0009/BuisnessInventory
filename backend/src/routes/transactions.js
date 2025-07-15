"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var express_1 = require("express");
var index_1 = require("../index");
var types_1 = require("../types");
var helpers_1 = require("../utils/helpers");
var router = (0, express_1.Router)();
// GET /api/transactions - Get all transactions with filters
router.get('/', (0, helpers_1.validateQuery)(types_1.PaginationSchema.partial().merge(types_1.DateRangeSchema.partial().extend({
    cropId: require('zod').string().optional(),
    action: require('zod').nativeEnum(types_1.TransactionType).optional(),
    partyName: require('zod').string().optional()
}))), (0, helpers_1.asyncHandler)(function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, _b, page, _c, limit, startDate, endDate, cropId, action, partyName, _d, start, end, where, _e, transactions, total, pagination;
    return __generator(this, function (_f) {
        switch (_f.label) {
            case 0:
                _a = req.query, _b = _a.page, page = _b === void 0 ? 1 : _b, _c = _a.limit, limit = _c === void 0 ? 10 : _c, startDate = _a.startDate, endDate = _a.endDate, cropId = _a.cropId, action = _a.action, partyName = _a.partyName;
                _d = (0, helpers_1.getDateRange)(startDate, endDate), start = _d.start, end = _d.end;
                where = {
                    date: {
                        gte: start,
                        lte: end
                    }
                };
                if (cropId)
                    where.cropId = cropId;
                if (action)
                    where.action = action;
                if (partyName)
                    where.partyName = { contains: partyName, mode: 'insensitive' };
                return [4 /*yield*/, Promise.all([
                        index_1.prisma.transaction.findMany({
                            where: where,
                            skip: (page - 1) * limit,
                            take: limit,
                            include: {
                                crop: {
                                    select: {
                                        name: true,
                                        unit: true
                                    }
                                }
                            },
                            orderBy: { date: 'desc' }
                        }),
                        index_1.prisma.transaction.count({ where: where })
                    ])];
            case 1:
                _e = _f.sent(), transactions = _e[0], total = _e[1];
                pagination = (0, helpers_1.calculatePagination)(page, limit, total);
                res.json({
                    success: true,
                    data: transactions,
                    pagination: pagination
                });
                return [2 /*return*/];
        }
    });
}); }));
// GET /api/transactions/:id - Get single transaction
router.get('/:id', (0, helpers_1.asyncHandler)(function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, transaction;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                id = req.params.id;
                return [4 /*yield*/, index_1.prisma.transaction.findUnique({
                        where: { id: id },
                        include: {
                            crop: true
                        }
                    })];
            case 1:
                transaction = _a.sent();
                if (!transaction) {
                    return [2 /*return*/, res.status(404).json((0, helpers_1.errorResponse)('Not Found', 'Transaction not found'))];
                }
                res.json((0, helpers_1.successResponse)(transaction));
                return [2 /*return*/];
        }
    });
}); }));
// POST /api/transactions - Create new transaction
router.post('/', (0, helpers_1.validateBody)(types_1.CreateTransactionSchema), (0, helpers_1.asyncHandler)(function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var transactionData, crop, transaction;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                transactionData = req.body;
                return [4 /*yield*/, index_1.prisma.crop.findUnique({
                        where: { id: transactionData.cropId }
                    })];
            case 1:
                crop = _a.sent();
                if (!crop) {
                    return [2 /*return*/, res.status(404).json((0, helpers_1.errorResponse)('Not Found', 'Crop not found'))];
                }
                // Calculate total if not provided
                if (!transactionData.total) {
                    transactionData.total = transactionData.quantity * transactionData.rate;
                }
                // Use crop name if not provided
                if (!transactionData.cropName) {
                    transactionData.cropName = crop.name;
                }
                return [4 /*yield*/, index_1.prisma.$transaction(function (tx) { return __awaiter(void 0, void 0, void 0, function () {
                        var newTransaction, stockChange;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0: return [4 /*yield*/, tx.transaction.create({
                                        data: transactionData,
                                        include: {
                                            crop: true
                                        }
                                    })];
                                case 1:
                                    newTransaction = _a.sent();
                                    stockChange = transactionData.action === types_1.TransactionType.BUY
                                        ? transactionData.quantity
                                        : -transactionData.quantity;
                                    return [4 /*yield*/, tx.crop.update({
                                            where: { id: transactionData.cropId },
                                            data: {
                                                currentStock: {
                                                    increment: stockChange
                                                }
                                            }
                                        })];
                                case 2:
                                    _a.sent();
                                    return [2 /*return*/, newTransaction];
                            }
                        });
                    }); })];
            case 2:
                transaction = _a.sent();
                res.status(201).json((0, helpers_1.successResponse)(transaction, 'Transaction created successfully'));
                return [2 /*return*/];
        }
    });
}); }));
// PUT /api/transactions/:id - Update transaction
router.put('/:id', (0, helpers_1.validateBody)(types_1.UpdateTransactionSchema), (0, helpers_1.asyncHandler)(function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, updateData, originalTransaction, updatedTransaction;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                id = req.params.id;
                updateData = req.body;
                return [4 /*yield*/, index_1.prisma.transaction.findUnique({
                        where: { id: id }
                    })];
            case 1:
                originalTransaction = _a.sent();
                if (!originalTransaction) {
                    return [2 /*return*/, res.status(404).json((0, helpers_1.errorResponse)('Not Found', 'Transaction not found'))];
                }
                return [4 /*yield*/, index_1.prisma.$transaction(function (tx) { return __awaiter(void 0, void 0, void 0, function () {
                        var originalStockChange, updated, newStockChange;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    originalStockChange = originalTransaction.action === types_1.TransactionType.BUY
                                        ? -originalTransaction.quantity
                                        : originalTransaction.quantity;
                                    return [4 /*yield*/, tx.crop.update({
                                            where: { id: originalTransaction.cropId },
                                            data: {
                                                currentStock: {
                                                    increment: originalStockChange
                                                }
                                            }
                                        })];
                                case 1:
                                    _a.sent();
                                    return [4 /*yield*/, tx.transaction.update({
                                            where: { id: id },
                                            data: updateData,
                                            include: {
                                                crop: true
                                            }
                                        })];
                                case 2:
                                    updated = _a.sent();
                                    newStockChange = (updateData.action || originalTransaction.action) === types_1.TransactionType.BUY
                                        ? (updateData.quantity || originalTransaction.quantity)
                                        : -(updateData.quantity || originalTransaction.quantity);
                                    return [4 /*yield*/, tx.crop.update({
                                            where: { id: updateData.cropId || originalTransaction.cropId },
                                            data: {
                                                currentStock: {
                                                    increment: newStockChange
                                                }
                                            }
                                        })];
                                case 3:
                                    _a.sent();
                                    return [2 /*return*/, updated];
                            }
                        });
                    }); })];
            case 2:
                updatedTransaction = _a.sent();
                res.json((0, helpers_1.successResponse)(updatedTransaction, 'Transaction updated successfully'));
                return [2 /*return*/];
        }
    });
}); }));
// DELETE /api/transactions/:id - Delete transaction
router.delete('/:id', (0, helpers_1.asyncHandler)(function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, transaction;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                id = req.params.id;
                return [4 /*yield*/, index_1.prisma.transaction.findUnique({
                        where: { id: id }
                    })];
            case 1:
                transaction = _a.sent();
                if (!transaction) {
                    return [2 /*return*/, res.status(404).json((0, helpers_1.errorResponse)('Not Found', 'Transaction not found'))];
                }
                return [4 /*yield*/, index_1.prisma.$transaction(function (tx) { return __awaiter(void 0, void 0, void 0, function () {
                        var stockChange;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    stockChange = transaction.action === types_1.TransactionType.BUY
                                        ? -transaction.quantity
                                        : transaction.quantity;
                                    return [4 /*yield*/, tx.crop.update({
                                            where: { id: transaction.cropId },
                                            data: {
                                                currentStock: {
                                                    increment: stockChange
                                                }
                                            }
                                        })];
                                case 1:
                                    _a.sent();
                                    // Delete the transaction
                                    return [4 /*yield*/, tx.transaction.delete({
                                            where: { id: id }
                                        })];
                                case 2:
                                    // Delete the transaction
                                    _a.sent();
                                    return [2 /*return*/];
                            }
                        });
                    }); })];
            case 2:
                _a.sent();
                res.json((0, helpers_1.successResponse)(null, 'Transaction deleted successfully'));
                return [2 /*return*/];
        }
    });
}); }));
// GET /api/transactions/recent/:limit - Get recent transactions
router.get('/recent/:limit', (0, helpers_1.asyncHandler)(function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var limit, transactions;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                limit = Math.min(parseInt(req.params.limit) || 10, 100);
                return [4 /*yield*/, index_1.prisma.transaction.findMany({
                        take: limit,
                        include: {
                            crop: {
                                select: {
                                    name: true,
                                    unit: true
                                }
                            }
                        },
                        orderBy: { createdAt: 'desc' }
                    })];
            case 1:
                transactions = _a.sent();
                res.json((0, helpers_1.successResponse)(transactions));
                return [2 /*return*/];
        }
    });
}); }));
exports.default = router;
