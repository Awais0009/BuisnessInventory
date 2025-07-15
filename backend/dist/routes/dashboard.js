"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const index_1 = require("../index");
const types_1 = require("../types");
const helpers_1 = require("../utils/helpers");
const router = (0, express_1.Router)();
router.get('/stats', (0, helpers_1.asyncHandler)(async (req, res) => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const [totalCrops, totalTransactions, recentTransactions, allTransactions] = await Promise.all([
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
    ]);
    let totalInvestment = 0;
    let totalRevenue = 0;
    allTransactions.forEach((transaction) => {
        if (transaction.action === types_1.TransactionType.BUY) {
            totalInvestment += transaction.total;
        }
        else {
            totalRevenue += transaction.total;
        }
    });
    const netProfit = totalRevenue - totalInvestment;
    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
    const cropPerformance = await index_1.prisma.transaction.groupBy({
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
    });
    const topCropIds = cropPerformance.slice(0, 5).map((item) => item.cropId);
    const topCropsDetails = await index_1.prisma.crop.findMany({
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
    });
    const topProfitableCrops = topCropsDetails.map((crop) => {
        let investment = 0;
        let revenue = 0;
        let boughtQuantity = 0;
        let soldQuantity = 0;
        crop.transactions.forEach((transaction) => {
            if (transaction.action === types_1.TransactionType.BUY) {
                investment += transaction.total;
                boughtQuantity += transaction.quantity;
            }
            else {
                revenue += transaction.total;
                soldQuantity += transaction.quantity;
            }
        });
        const netProfit = revenue - investment;
        const profitMargin = revenue > 0 ? (netProfit / revenue) * 100 : 0;
        return {
            cropId: crop.id,
            cropName: crop.name,
            totalBought: boughtQuantity,
            totalSold: soldQuantity,
            currentStock: crop.currentStock,
            totalInvestment: investment,
            totalRevenue: revenue,
            netProfit,
            profitMargin
        };
    }).sort((a, b) => b.profitMargin - a.profitMargin);
    const dashboardStats = {
        totalCrops,
        totalTransactions,
        totalInvestment,
        totalRevenue,
        netProfit,
        profitMargin,
        recentTransactions,
        topProfitableCrops
    };
    res.json((0, helpers_1.successResponse)(dashboardStats));
}));
router.get('/overview', (0, helpers_1.asyncHandler)(async (req, res) => {
    const { startDate, endDate } = req.query;
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();
    const transactions = await index_1.prisma.transaction.findMany({
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
    });
    const dailyStats = new Map();
    transactions.forEach((transaction) => {
        const dateKey = transaction.date.toISOString().split('T')[0];
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
        const dayData = dailyStats.get(dateKey);
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
    const overview = {
        dateRange: { start, end },
        totalTransactions: transactions.length,
        dailyStats: Array.from(dailyStats.values()),
        transactions: transactions.slice(0, 20)
    };
    res.json((0, helpers_1.successResponse)(overview));
}));
router.get('/quick-stats', (0, helpers_1.asyncHandler)(async (req, res) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const [todayTransactions, weekTransactions, monthTransactions, lowStockCrops] = await Promise.all([
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
                    lt: 10
                }
            },
            select: {
                id: true,
                name: true,
                currentStock: true,
                unit: true
            }
        })
    ]);
    const quickStats = {
        todayTransactions,
        weekTransactions,
        monthTransactions,
        lowStockCrops
    };
    res.json((0, helpers_1.successResponse)(quickStats));
}));
exports.default = router;
//# sourceMappingURL=dashboard.js.map