import { Router } from 'express';
import { prisma } from '../index';
import { 
  AnalyticsQuerySchema,
  TransactionType,
  CropAnalytics,
  ProfitLossData
} from '../types';
import { 
  validateQuery, 
  asyncHandler, 
  successResponse, 
  getDateRange
} from '../utils/helpers';

const router = Router();

// GET /api/analytics/profit-loss - Get profit/loss trends
router.get('/profit-loss',
  validateQuery(AnalyticsQuerySchema),
  asyncHandler(async (req: any, res: any) => {
    const { startDate, endDate, cropIds, transactionType } = req.query;
    const { start, end } = getDateRange(startDate, endDate);

    const where: any = {
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

    const transactions = await prisma.transaction.findMany({
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

    // Group transactions by date
    const dailyData = new Map<string, { revenue: number; cost: number; transactions: any[] }>();

    transactions.forEach((transaction: any) => {
      const dateKey = transaction.date.toISOString().split('T')[0];
      
      if (!dailyData.has(dateKey)) {
        dailyData.set(dateKey, { revenue: 0, cost: 0, transactions: [] });
      }

      const dayData = dailyData.get(dateKey)!;
      dayData.transactions.push(transaction);

      if (transaction.action === TransactionType.SELL) {
        dayData.revenue += transaction.total;
      } else {
        dayData.cost += transaction.total;
      }
    });

    const profitLossData: ProfitLossData[] = Array.from(dailyData.entries()).map(([date, data]) => {
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

    res.json(successResponse(profitLossData));
  })
);

// GET /api/analytics/crop-performance - Get crop-wise analytics
router.get('/crop-performance',
  validateQuery(AnalyticsQuerySchema),
  asyncHandler(async (req: any, res: any) => {
    const { startDate, endDate, cropIds } = req.query;
    const { start, end } = getDateRange(startDate, endDate);

    const where: any = {
      date: {
        gte: start,
        lte: end
      }
    };

    if (cropIds?.length) {
      where.cropId = { in: cropIds };
    }

    const transactions = await prisma.transaction.findMany({
      where,
      include: {
        crop: true
      }
    });

    // Group by crop
    const cropData = new Map<string, {
      crop: any;
      bought: number;
      sold: number;
      investment: number;
      revenue: number;
      boughtQuantity: number;
      soldQuantity: number;
    }>();

    transactions.forEach((transaction: any) => {
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

      const data = cropData.get(cropId)!;

      if (transaction.action === TransactionType.BUY) {
        data.bought += transaction.total;
        data.investment += transaction.total;
        data.boughtQuantity += transaction.quantity;
      } else {
        data.sold += transaction.total;
        data.revenue += transaction.total;
        data.soldQuantity += transaction.quantity;
      }
    });

    const cropAnalytics: CropAnalytics[] = Array.from(cropData.entries()).map(([cropId, data]) => {
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

    // Sort by profit margin
    cropAnalytics.sort((a, b) => b.profitMargin - a.profitMargin);

    res.json(successResponse(cropAnalytics));
  })
);

// GET /api/analytics/trends - Get trend data for charts
router.get('/trends',
  validateQuery(AnalyticsQuerySchema.extend({
    groupBy: require('zod').enum(['day', 'week', 'month']).optional().default('day')
  })),
  asyncHandler(async (req: any, res: any) => {
    const { startDate, endDate, cropIds, transactionType, groupBy } = req.query;
    const { start, end } = getDateRange(startDate, endDate);

    const where: any = {
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

    const transactions = await prisma.transaction.findMany({
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

    // Group by time period
    const getDateKey = (date: Date) => {
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

    const trendData = new Map<string, {
      buy: number;
      sell: number;
      buyQuantity: number;
      sellQuantity: number;
      transactions: any[];
    }>();

    transactions.forEach((transaction: any) => {
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

      const data = trendData.get(dateKey)!;
      data.transactions.push(transaction);

      if (transaction.action === TransactionType.BUY) {
        data.buy += transaction.total;
        data.buyQuantity += transaction.quantity;
      } else {
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

    res.json(successResponse(trends));
  })
);

// GET /api/analytics/summary - Get overall analytics summary
router.get('/summary',
  validateQuery(AnalyticsQuerySchema),
  asyncHandler(async (req: any, res: any) => {
    const { startDate, endDate, cropIds } = req.query;
    const { start, end } = getDateRange(startDate, endDate);

    const where: any = {
      date: {
        gte: start,
        lte: end
      }
    };

    if (cropIds?.length) {
      where.cropId = { in: cropIds };
    }

    const [transactions, totalCrops] = await Promise.all([
      prisma.transaction.findMany({
        where,
        include: {
          crop: {
            select: {
              name: true
            }
          }
        }
      }),
      prisma.crop.count(cropIds?.length ? { where: { id: { in: cropIds } } } : undefined)
    ]);

    let totalInvestment = 0;
    let totalRevenue = 0;
    let totalBuyTransactions = 0;
    let totalSellTransactions = 0;

    transactions.forEach((transaction: any) => {
      if (transaction.action === TransactionType.BUY) {
        totalInvestment += transaction.total;
        totalBuyTransactions++;
      } else {
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

    res.json(successResponse(summary));
  })
);

export default router;
