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
// GET /api/analytics/profit-loss - Get profit/loss trends
router.get('/profit-loss', (0, helpers_1.validateQuery)(types_1.AnalyticsQuerySchema), (0, helpers_1.asyncHandler)(function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, startDate, endDate, cropIds, transactionType, _b, start, end, where, transactions, dailyData, profitLossData;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                _a = req.query, startDate = _a.startDate, endDate = _a.endDate, cropIds = _a.cropIds, transactionType = _a.transactionType;
                _b = (0, helpers_1.getDateRange)(startDate, endDate), start = _b.start, end = _b.end;
                where = {
                    date: {
                        gte: start,
                        lte: end
                    }
                };
                if (cropIds === null || cropIds === void 0 ? void 0 : cropIds.length) {
                    where.cropId = { in: cropIds };
                }
                if (transactionType) {
                    where.action = transactionType;
                }
                return [4 /*yield*/, index_1.prisma.transaction.findMany({
                        where: where,
                        orderBy: { date: 'asc' },
                        include: {
                            crop: {
                                select: {
                                    name: true
                                }
                            }
                        }
                    })];
            case 1:
                transactions = _c.sent();
                dailyData = new Map();
                transactions.forEach(function (transaction) {
                    var dateKey = transaction.date.toISOString().split('T')[0];
                    if (!dailyData.has(dateKey)) {
                        dailyData.set(dateKey, { revenue: 0, cost: 0, transactions: [] });
                    }
                    var dayData = dailyData.get(dateKey);
                    dayData.transactions.push(transaction);
                    if (transaction.action === types_1.TransactionType.SELL) {
                        dayData.revenue += transaction.total;
                    }
                    else {
                        dayData.cost += transaction.total;
                    }
                });
                profitLossData = Array.from(dailyData.entries()).map(function (_a) {
                    var date = _a[0], data = _a[1];
                    var netProfit = data.revenue - data.cost;
                    return {
                        date: date,
                        profit: data.revenue > data.cost ? netProfit : 0,
                        loss: data.revenue < data.cost ? Math.abs(netProfit) : 0,
                        netProfit: netProfit,
                        totalRevenue: data.revenue,
                        totalCost: data.cost
                    };
                });
                res.json((0, helpers_1.successResponse)(profitLossData));
                return [2 /*return*/];
        }
    });
}); }));
// GET /api/analytics/crop-performance - Get crop-wise analytics
router.get('/crop-performance', (0, helpers_1.validateQuery)(types_1.AnalyticsQuerySchema), (0, helpers_1.asyncHandler)(function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, startDate, endDate, cropIds, _b, start, end, where, transactions, cropData, cropAnalytics;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                _a = req.query, startDate = _a.startDate, endDate = _a.endDate, cropIds = _a.cropIds;
                _b = (0, helpers_1.getDateRange)(startDate, endDate), start = _b.start, end = _b.end;
                where = {
                    date: {
                        gte: start,
                        lte: end
                    }
                };
                if (cropIds === null || cropIds === void 0 ? void 0 : cropIds.length) {
                    where.cropId = { in: cropIds };
                }
                return [4 /*yield*/, index_1.prisma.transaction.findMany({
                        where: where,
                        include: {
                            crop: true
                        }
                    })];
            case 1:
                transactions = _c.sent();
                cropData = new Map();
                transactions.forEach(function (transaction) {
                    var cropId = transaction.cropId;
                    if (!cropData.has(cropId)) {
                        cropData.set(cropId, {
                            crop: transaction.crop,
                            bought: 0,
                            sold: 0,
                            investment: 0,
                            revenue: 0,
                            boughtQuantity: 0,
                            soldQuantity: 0
                        });
                    }
                    var data = cropData.get(cropId);
                    if (transaction.action === types_1.TransactionType.BUY) {
                        data.bought += transaction.total;
                        data.investment += transaction.total;
                        data.boughtQuantity += transaction.quantity;
                    }
                    else {
                        data.sold += transaction.total;
                        data.revenue += transaction.total;
                        data.soldQuantity += transaction.quantity;
                    }
                });
                cropAnalytics = Array.from(cropData.entries()).map(function (_a) {
                    var cropId = _a[0], data = _a[1];
                    var netProfit = data.revenue - data.investment;
                    var profitMargin = data.revenue > 0 ? (netProfit / data.revenue) * 100 : 0;
                    return {
                        cropId: cropId,
                        cropName: data.crop.name,
                        totalBought: data.boughtQuantity,
                        totalSold: data.soldQuantity,
                        currentStock: data.crop.currentStock,
                        totalInvestment: data.investment,
                        totalRevenue: data.revenue,
                        netProfit: netProfit,
                        profitMargin: profitMargin
                    };
                });
                // Sort by profit margin
                cropAnalytics.sort(function (a, b) { return b.profitMargin - a.profitMargin; });
                res.json((0, helpers_1.successResponse)(cropAnalytics));
                return [2 /*return*/];
        }
    });
}); }));
// GET /api/analytics/trends - Get trend data for charts
router.get('/trends', (0, helpers_1.validateQuery)(types_1.AnalyticsQuerySchema.extend({
    groupBy: require('zod').enum(['day', 'week', 'month']).optional().default('day')
})), (0, helpers_1.asyncHandler)(function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, startDate, endDate, cropIds, transactionType, groupBy, _b, start, end, where, transactions, getDateKey, trendData, trends;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                _a = req.query, startDate = _a.startDate, endDate = _a.endDate, cropIds = _a.cropIds, transactionType = _a.transactionType, groupBy = _a.groupBy;
                _b = (0, helpers_1.getDateRange)(startDate, endDate), start = _b.start, end = _b.end;
                where = {
                    date: {
                        gte: start,
                        lte: end
                    }
                };
                if (cropIds === null || cropIds === void 0 ? void 0 : cropIds.length) {
                    where.cropId = { in: cropIds };
                }
                if (transactionType) {
                    where.action = transactionType;
                }
                return [4 /*yield*/, index_1.prisma.transaction.findMany({
                        where: where,
                        orderBy: { date: 'asc' },
                        include: {
                            crop: {
                                select: {
                                    name: true
                                }
                            }
                        }
                    })];
            case 1:
                transactions = _c.sent();
                getDateKey = function (date) {
                    switch (groupBy) {
                        case 'week':
                            var weekStart = new Date(date);
                            weekStart.setDate(date.getDate() - date.getDay());
                            return weekStart.toISOString().split('T')[0];
                        case 'month':
                            return "".concat(date.getFullYear(), "-").concat(String(date.getMonth() + 1).padStart(2, '0'));
                        default:
                            return date.toISOString().split('T')[0];
                    }
                };
                trendData = new Map();
                transactions.forEach(function (transaction) {
                    var dateKey = getDateKey(transaction.date);
                    if (!trendData.has(dateKey)) {
                        trendData.set(dateKey, {
                            buy: 0,
                            sell: 0,
                            buyQuantity: 0,
                            sellQuantity: 0,
                            transactions: []
                        });
                    }
                    var data = trendData.get(dateKey);
                    data.transactions.push(transaction);
                    if (transaction.action === types_1.TransactionType.BUY) {
                        data.buy += transaction.total;
                        data.buyQuantity += transaction.quantity;
                    }
                    else {
                        data.sell += transaction.total;
                        data.sellQuantity += transaction.quantity;
                    }
                });
                trends = Array.from(trendData.entries()).map(function (_a) {
                    var date = _a[0], data = _a[1];
                    return ({
                        date: date,
                        buy: data.buy,
                        sell: data.sell,
                        buyQuantity: data.buyQuantity,
                        sellQuantity: data.sellQuantity,
                        profit: data.sell - data.buy,
                        transactionCount: data.transactions.length
                    });
                });
                res.json((0, helpers_1.successResponse)(trends));
                return [2 /*return*/];
        }
    });
}); }));
// GET /api/analytics/summary - Get overall analytics summary
router.get('/summary', (0, helpers_1.validateQuery)(types_1.AnalyticsQuerySchema), (0, helpers_1.asyncHandler)(function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, startDate, endDate, cropIds, _b, start, end, where, _c, transactions, totalCrops, totalInvestment, totalRevenue, totalBuyTransactions, totalSellTransactions, netProfit, profitMargin, summary;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0:
                _a = req.query, startDate = _a.startDate, endDate = _a.endDate, cropIds = _a.cropIds;
                _b = (0, helpers_1.getDateRange)(startDate, endDate), start = _b.start, end = _b.end;
                where = {
                    date: {
                        gte: start,
                        lte: end
                    }
                };
                if (cropIds === null || cropIds === void 0 ? void 0 : cropIds.length) {
                    where.cropId = { in: cropIds };
                }
                return [4 /*yield*/, Promise.all([
                        index_1.prisma.transaction.findMany({
                            where: where,
                            include: {
                                crop: {
                                    select: {
                                        name: true
                                    }
                                }
                            }
                        }),
                        index_1.prisma.crop.count((cropIds === null || cropIds === void 0 ? void 0 : cropIds.length) ? { where: { id: { in: cropIds } } } : undefined)
                    ])];
            case 1:
                _c = _d.sent(), transactions = _c[0], totalCrops = _c[1];
                totalInvestment = 0;
                totalRevenue = 0;
                totalBuyTransactions = 0;
                totalSellTransactions = 0;
                transactions.forEach(function (transaction) {
                    if (transaction.action === types_1.TransactionType.BUY) {
                        totalInvestment += transaction.total;
                        totalBuyTransactions++;
                    }
                    else {
                        totalRevenue += transaction.total;
                        totalSellTransactions++;
                    }
                });
                netProfit = totalRevenue - totalInvestment;
                profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
                summary = {
                    totalCrops: totalCrops,
                    totalTransactions: transactions.length,
                    totalBuyTransactions: totalBuyTransactions,
                    totalSellTransactions: totalSellTransactions,
                    totalInvestment: totalInvestment,
                    totalRevenue: totalRevenue,
                    netProfit: netProfit,
                    profitMargin: profitMargin,
                    dateRange: { start: start, end: end }
                };
                res.json((0, helpers_1.successResponse)(summary));
                return [2 /*return*/];
        }
    });
}); }));
exports.default = router;
