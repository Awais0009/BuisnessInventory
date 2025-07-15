"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const index_1 = require("../index");
const types_1 = require("../types");
const helpers_1 = require("../utils/helpers");
const router = (0, express_1.Router)();
router.get('/profit-loss', (0, helpers_1.validateQuery)(types_1.AnalyticsQuerySchema), (0, helpers_1.asyncHandler)(async (req, res) => {
    const { startDate, endDate, cropIds, transactionType } = req.query;
    const { start, end } = (0, helpers_1.getDateRange)(startDate, endDate);
    const where = {
        date: {
            gte: start,
            lte: end
        }
    };
    if (cropIds?.length) {
        where.cropId = { in: cropIds };
    }
    if (transactionType) {
        where.action = transactionType;
    }
    const transactions = await index_1.prisma.transaction.findMany({
        where,
        orderBy: { date: 'asc' },
        include: {
            crop: {
                select: {
                    name: true
                }
            }
        }
    });
    const dailyData = new Map();
    transactions.forEach((transaction) => {
        const dateKey = transaction.date.toISOString().split('T')[0];
        if (!dailyData.has(dateKey)) {
            dailyData.set(dateKey, { revenue: 0, cost: 0, transactions: [] });
        }
        const dayData = dailyData.get(dateKey);
        dayData.transactions.push(transaction);
        if (transaction.action === types_1.TransactionType.SELL) {
            dayData.revenue += transaction.total;
        }
        else {
            dayData.cost += transaction.total;
        }
    });
    const profitLossData = Array.from(dailyData.entries()).map(([date, data]) => {
        const netProfit = data.revenue - data.cost;
        return {
            date,
            profit: data.revenue > data.cost ? netProfit : 0,
            loss: data.revenue < data.cost ? Math.abs(netProfit) : 0,
            netProfit,
            totalRevenue: data.revenue,
            totalCost: data.cost
        };
    });
    res.json((0, helpers_1.successResponse)(profitLossData));
}));
router.get('/crop-performance', (0, helpers_1.validateQuery)(types_1.AnalyticsQuerySchema), (0, helpers_1.asyncHandler)(async (req, res) => {
    const { startDate, endDate, cropIds } = req.query;
    const { start, end } = (0, helpers_1.getDateRange)(startDate, endDate);
    const where = {
        date: {
            gte: start,
            lte: end
        }
    };
    if (cropIds?.length) {
        where.cropId = { in: cropIds };
    }
    const transactions = await index_1.prisma.transaction.findMany({
        where,
        include: {
            crop: true
        }
    });
    const cropData = new Map();
    transactions.forEach((transaction) => {
        const cropId = transaction.cropId;
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
        const data = cropData.get(cropId);
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
    const cropAnalytics = Array.from(cropData.entries()).map(([cropId, data]) => {
        const netProfit = data.revenue - data.investment;
        const profitMargin = data.revenue > 0 ? (netProfit / data.revenue) * 100 : 0;
        return {
            cropId,
            cropName: data.crop.name,
            totalBought: data.boughtQuantity,
            totalSold: data.soldQuantity,
            currentStock: data.crop.currentStock,
            totalInvestment: data.investment,
            totalRevenue: data.revenue,
            netProfit,
            profitMargin
        };
    });
    cropAnalytics.sort((a, b) => b.profitMargin - a.profitMargin);
    res.json((0, helpers_1.successResponse)(cropAnalytics));
}));
router.get('/trends', (0, helpers_1.validateQuery)(types_1.AnalyticsQuerySchema.extend({
    groupBy: require('zod').enum(['day', 'week', 'month']).optional().default('day')
})), (0, helpers_1.asyncHandler)(async (req, res) => {
    const { startDate, endDate, cropIds, transactionType, groupBy } = req.query;
    const { start, end } = (0, helpers_1.getDateRange)(startDate, endDate);
    const where = {
        date: {
            gte: start,
            lte: end
        }
    };
    if (cropIds?.length) {
        where.cropId = { in: cropIds };
    }
    if (transactionType) {
        where.action = transactionType;
    }
    const transactions = await index_1.prisma.transaction.findMany({
        where,
        orderBy: { date: 'asc' },
        include: {
            crop: {
                select: {
                    name: true
                }
            }
        }
    });
    const getDateKey = (date) => {
        switch (groupBy) {
            case 'week':
                const weekStart = new Date(date);
                weekStart.setDate(date.getDate() - date.getDay());
                return weekStart.toISOString().split('T')[0];
            case 'month':
                return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            default:
                return date.toISOString().split('T')[0];
        }
    };
    const trendData = new Map();
    transactions.forEach((transaction) => {
        const dateKey = getDateKey(transaction.date);
        if (!trendData.has(dateKey)) {
            trendData.set(dateKey, {
                buy: 0,
                sell: 0,
                buyQuantity: 0,
                sellQuantity: 0,
                transactions: []
            });
        }
        const data = trendData.get(dateKey);
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
    const trends = Array.from(trendData.entries()).map(([date, data]) => ({
        date,
        buy: data.buy,
        sell: data.sell,
        buyQuantity: data.buyQuantity,
        sellQuantity: data.sellQuantity,
        profit: data.sell - data.buy,
        transactionCount: data.transactions.length
    }));
    res.json((0, helpers_1.successResponse)(trends));
}));
router.get('/summary', (0, helpers_1.validateQuery)(types_1.AnalyticsQuerySchema), (0, helpers_1.asyncHandler)(async (req, res) => {
    const { startDate, endDate, cropIds } = req.query;
    const { start, end } = (0, helpers_1.getDateRange)(startDate, endDate);
    const where = {
        date: {
            gte: start,
            lte: end
        }
    };
    if (cropIds?.length) {
        where.cropId = { in: cropIds };
    }
    const [transactions, totalCrops] = await Promise.all([
        index_1.prisma.transaction.findMany({
            where,
            include: {
                crop: {
                    select: {
                        name: true
                    }
                }
            }
        }),
        index_1.prisma.crop.count(cropIds?.length ? { where: { id: { in: cropIds } } } : undefined)
    ]);
    let totalInvestment = 0;
    let totalRevenue = 0;
    let totalBuyTransactions = 0;
    let totalSellTransactions = 0;
    transactions.forEach((transaction) => {
        if (transaction.action === types_1.TransactionType.BUY) {
            totalInvestment += transaction.total;
            totalBuyTransactions++;
        }
        else {
            totalRevenue += transaction.total;
            totalSellTransactions++;
        }
    });
    const netProfit = totalRevenue - totalInvestment;
    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
    const summary = {
        totalCrops,
        totalTransactions: transactions.length,
        totalBuyTransactions,
        totalSellTransactions,
        totalInvestment,
        totalRevenue,
        netProfit,
        profitMargin,
        dateRange: { start, end }
    };
    res.json((0, helpers_1.successResponse)(summary));
}));
exports.default = router;
//# sourceMappingURL=analytics.js.map