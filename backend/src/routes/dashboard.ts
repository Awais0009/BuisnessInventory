import { Router } from 'express';
import { prisma } from '../index';
import { 
  TransactionType,
  DashboardStats
} from '../types';
import { 
  asyncHandler, 
  successResponse
} from '../utils/helpers';

const router = Router();

// GET /api/dashboard/stats - Get dashboard statistics
router.get('/stats',
  asyncHandler(async (req: any, res: any) => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Get all basic counts
    const [
      totalCrops,
      totalTransactions,
      recentTransactions,
      allTransactions
    ] = await Promise.all([
      prisma.crop.count(),
      prisma.transaction.count(),
      prisma.transaction.findMany({
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
      prisma.transaction.findMany({
        where: {
          date: {
            gte: thirtyDaysAgo
          }
        }
      })
    ]);

    // Calculate financial metrics
    let totalInvestment = 0;
    let totalRevenue = 0;

    allTransactions.forEach((transaction: any) => {
      if (transaction.action === TransactionType.BUY) {
        totalInvestment += transaction.total;
      } else {
        totalRevenue += transaction.total;
      }
    });

    const netProfit = totalRevenue - totalInvestment;
    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    // Get top profitable crops
    const cropPerformance = await prisma.transaction.groupBy({
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

    // Get detailed crop info for top performers
    const topCropIds = cropPerformance.slice(0, 5).map((item: any) => item.cropId);
    const topCropsDetails = await prisma.crop.findMany({
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

    const topProfitableCrops = topCropsDetails.map((crop: any) => {
      let investment = 0;
      let revenue = 0;
      let boughtQuantity = 0;
      let soldQuantity = 0;

      crop.transactions.forEach((transaction: any) => {
        if (transaction.action === TransactionType.BUY) {
          investment += transaction.total;
          boughtQuantity += transaction.quantity;
        } else {
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
    }).sort((a: any, b: any) => b.profitMargin - a.profitMargin);

    const dashboardStats: DashboardStats = {
      totalCrops,
      totalTransactions,
      totalInvestment,
      totalRevenue,
      netProfit,
      profitMargin,
      recentTransactions,
      topProfitableCrops
    };

    res.json(successResponse(dashboardStats));
  })
);

// GET /api/dashboard/overview - Get overview for specific date range
router.get('/overview',
  asyncHandler(async (req: any, res: any) => {
    const { startDate, endDate } = req.query;
    
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    const transactions = await prisma.transaction.findMany({
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

    // Daily analytics
    const dailyStats = new Map();
    
    transactions.forEach((transaction: any) => {
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
      
      if (transaction.action === TransactionType.BUY) {
        dayData.buyTotal += transaction.total;
        dayData.buyCount++;
      } else {
        dayData.sellTotal += transaction.total;
        dayData.sellCount++;
      }
      
      dayData.profit = dayData.sellTotal - dayData.buyTotal;
    });

    const overview = {
      dateRange: { start, end },
      totalTransactions: transactions.length,
      dailyStats: Array.from(dailyStats.values()),
      transactions: transactions.slice(0, 20) // Latest 20 transactions
    };

    res.json(successResponse(overview));
  })
);

// GET /api/dashboard/quick-stats - Get quick statistics
router.get('/quick-stats',
  asyncHandler(async (req: any, res: any) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      todayTransactions,
      weekTransactions,
      monthTransactions,
      lowStockCrops
    ] = await Promise.all([
      prisma.transaction.count({
        where: {
          date: {
            gte: today
          }
        }
      }),
      prisma.transaction.count({
        where: {
          date: {
            gte: thisWeek
          }
        }
      }),
      prisma.transaction.count({
        where: {
          date: {
            gte: thisMonth
          }
        }
      }),
      prisma.crop.findMany({
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
    ]);

    const quickStats = {
      todayTransactions,
      weekTransactions,
      monthTransactions,
      lowStockCrops
    };

    res.json(successResponse(quickStats));
  })
);

export default router;
