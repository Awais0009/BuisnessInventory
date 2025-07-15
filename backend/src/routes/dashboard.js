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
// GET /api/dashboard/stats - Get dashboard statistics
router.get('/stats', (0, helpers_1.asyncHandler)(function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var now, thirtyDaysAgo, _a, totalCrops, totalTransactions, recentTransactions, allTransactions, totalInvestment, totalRevenue, netProfit, profitMargin, cropPerformance, topCropIds, topCropsDetails, topProfitableCrops, dashboardStats;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                now = new Date();
                thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                return [4 /*yield*/, Promise.all([
                        index_1.prisma.crop.count(),
                        index_1.prisma.transaction.count(),
                        index_1.prisma.transaction.findMany({
                            take: 10,
                            orderBy: { createdAt: 'desc' },
                            include: {
                                crop: {
                                    select: {
                                        name: true,
                                        unit: true
                                    }
                                }
                            }
                        }),
                        index_1.prisma.transaction.findMany({
                            where: {
                                date: {
                                    gte: thirtyDaysAgo
                                }
                            }
                        })
                    ])];
            case 1:
                _a = _b.sent(), totalCrops = _a[0], totalTransactions = _a[1], recentTransactions = _a[2], allTransactions = _a[3];
                totalInvestment = 0;
                totalRevenue = 0;
                allTransactions.forEach(function (transaction) {
                    if (transaction.action === types_1.TransactionType.BUY) {
                        totalInvestment += transaction.total;
                    }
                    else {
                        totalRevenue += transaction.total;
                    }
                });
                netProfit = totalRevenue - totalInvestment;
                profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
                return [4 /*yield*/, index_1.prisma.transaction.groupBy({
                        by: ['cropId'],
                        where: {
                            date: {
                                gte: thirtyDaysAgo
                            }
                        },
                        _sum: {
                            total: true,
                            quantity: true
                        },
                        _count: {
                            id: true
                        }
                    })];
            case 2:
                cropPerformance = _b.sent();
                topCropIds = cropPerformance.slice(0, 5).map(function (item) { return item.cropId; });
                return [4 /*yield*/, index_1.prisma.crop.findMany({
                        where: {
                            id: {
                                in: topCropIds
                            }
                        },
                        include: {
                            transactions: {
                                where: {
                                    date: {
                                        gte: thirtyDaysAgo
                                    }
                                }
                            }
                        }
                    })];
            case 3:
                topCropsDetails = _b.sent();
                topProfitableCrops = topCropsDetails.map(function (crop) {
                    var investment = 0;
                    var revenue = 0;
                    var boughtQuantity = 0;
                    var soldQuantity = 0;
                    crop.transactions.forEach(function (transaction) {
                        if (transaction.action === types_1.TransactionType.BUY) {
                            investment += transaction.total;
                            boughtQuantity += transaction.quantity;
                        }
                        else {
                            revenue += transaction.total;
                            soldQuantity += transaction.quantity;
                        }
                    });
                    var netProfit = revenue - investment;
                    var profitMargin = revenue > 0 ? (netProfit / revenue) * 100 : 0;
                    return {
                        cropId: crop.id,
                        cropName: crop.name,
                        totalBought: boughtQuantity,
                        totalSold: soldQuantity,
                        currentStock: crop.currentStock,
                        totalInvestment: investment,
                        totalRevenue: revenue,
                        netProfit: netProfit,
                        profitMargin: profitMargin
                    };
                }).sort(function (a, b) { return b.profitMargin - a.profitMargin; });
                dashboardStats = {
                    totalCrops: totalCrops,
                    totalTransactions: totalTransactions,
                    totalInvestment: totalInvestment,
                    totalRevenue: totalRevenue,
                    netProfit: netProfit,
                    profitMargin: profitMargin,
                    recentTransactions: recentTransactions,
                    topProfitableCrops: topProfitableCrops
                };
                res.json((0, helpers_1.successResponse)(dashboardStats));
                return [2 /*return*/];
        }
    });
}); }));
// GET /api/dashboard/overview - Get overview for specific date range
router.get('/overview', (0, helpers_1.asyncHandler)(function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, startDate, endDate, start, end, transactions, dailyStats, overview;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _a = req.query, startDate = _a.startDate, endDate = _a.endDate;
                start = startDate ? new Date(startDate) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
                end = endDate ? new Date(endDate) : new Date();
                return [4 /*yield*/, index_1.prisma.transaction.findMany({
                        where: {
                            date: {
                                gte: start,
                                lte: end
                            }
                        },
                        include: {
                            crop: {
                                select: {
                                    name: true,
                                    unit: true
                                }
                            }
                        },
                        orderBy: { date: 'desc' }
                    })];
            case 1:
                transactions = _b.sent();
                dailyStats = new Map();
                transactions.forEach(function (transaction) {
                    var dateKey = transaction.date.toISOString().split('T')[0];
                    if (!dailyStats.has(dateKey)) {
                        dailyStats.set(dateKey, {
                            date: dateKey,
                            buyTotal: 0,
                            sellTotal: 0,
                            buyCount: 0,
                            sellCount: 0,
                            profit: 0
                        });
                    }
                    var dayData = dailyStats.get(dateKey);
                    if (transaction.action === types_1.TransactionType.BUY) {
                        dayData.buyTotal += transaction.total;
                        dayData.buyCount++;
                    }
                    else {
                        dayData.sellTotal += transaction.total;
                        dayData.sellCount++;
                    }
                    dayData.profit = dayData.sellTotal - dayData.buyTotal;
                });
                overview = {
                    dateRange: { start: start, end: end },
                    totalTransactions: transactions.length,
                    dailyStats: Array.from(dailyStats.values()),
                    transactions: transactions.slice(0, 20) // Latest 20 transactions
                };
                res.json((0, helpers_1.successResponse)(overview));
                return [2 /*return*/];
        }
    });
}); }));
// GET /api/dashboard/quick-stats - Get quick statistics
router.get('/quick-stats', (0, helpers_1.asyncHandler)(function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var now, today, thisWeek, thisMonth, _a, todayTransactions, weekTransactions, monthTransactions, lowStockCrops, quickStats;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                now = new Date();
                today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                thisWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                return [4 /*yield*/, Promise.all([
                        index_1.prisma.transaction.count({
                            where: {
                                date: {
                                    gte: today
                                }
                            }
                        }),
                        index_1.prisma.transaction.count({
                            where: {
                                date: {
                                    gte: thisWeek
                                }
                            }
                        }),
                        index_1.prisma.transaction.count({
                            where: {
                                date: {
                                    gte: thisMonth
                                }
                            }
                        }),
                        index_1.prisma.crop.findMany({
                            where: {
                                currentStock: {
                                    lt: 10 // Less than 10 units
                                }
                            },
                            select: {
                                id: true,
                                name: true,
                                currentStock: true,
                                unit: true
                            }
                        })
                    ])];
            case 1:
                _a = _b.sent(), todayTransactions = _a[0], weekTransactions = _a[1], monthTransactions = _a[2], lowStockCrops = _a[3];
                quickStats = {
                    todayTransactions: todayTransactions,
                    weekTransactions: weekTransactions,
                    monthTransactions: monthTransactions,
                    lowStockCrops: lowStockCrops
                };
                res.json((0, helpers_1.successResponse)(quickStats));
                return [2 /*return*/];
        }
    });
}); }));
exports.default = router;
