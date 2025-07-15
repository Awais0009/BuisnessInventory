import { Router } from 'express';
import { prisma } from '../index';
import { 
  CreateTransactionSchema, 
  UpdateTransactionSchema, 
  PaginationSchema,
  DateRangeSchema,
  TransactionType
} from '../types';
import { 
  validateBody, 
  validateQuery, 
  asyncHandler, 
  successResponse, 
  errorResponse,
  calculatePagination,
  getDateRange
} from '../utils/helpers';

const router = Router();

// GET /api/transactions - Get all transactions with filters
router.get('/', 
  validateQuery(PaginationSchema.partial().merge(DateRangeSchema.partial().extend({
    cropId: require('zod').string().optional(),
    action: require('zod').nativeEnum(TransactionType).optional(),
    partyName: require('zod').string().optional()
  }))),
  asyncHandler(async (req: any, res: any) => {
    const { 
      page = 1, 
      limit = 10, 
      startDate, 
      endDate, 
      cropId, 
      action, 
      partyName 
    } = req.query;
    
    const { start, end } = getDateRange(startDate, endDate);
    
    const where: any = {
      date: {
        gte: start,
        lte: end
      }
    };

    if (cropId) where.cropId = cropId;
    if (action) where.action = action;
    if (partyName) where.partyName = { contains: partyName, mode: 'insensitive' };

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
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
      prisma.transaction.count({ where })
    ]);

    const pagination = calculatePagination(page, limit, total);

    res.json({
      success: true,
      data: transactions,
      pagination
    });
  })
);

// GET /api/transactions/:id - Get single transaction
router.get('/:id', 
  asyncHandler(async (req: any, res: any) => {
    const { id } = req.params;
    
    const transaction = await prisma.transaction.findUnique({
      where: { id },
      include: {
        crop: true
      }
    });

    if (!transaction) {
      return res.status(404).json(errorResponse('Not Found', 'Transaction not found'));
    }

    res.json(successResponse(transaction));
  })
);

// POST /api/transactions - Create new transaction
router.post('/',
  validateBody(CreateTransactionSchema),
  asyncHandler(async (req: any, res: any) => {
    const transactionData = req.body;
    
    // Verify crop exists
    const crop = await prisma.crop.findUnique({
      where: { id: transactionData.cropId }
    });

    if (!crop) {
      return res.status(404).json(errorResponse('Not Found', 'Crop not found'));
    }

    // Calculate total if not provided
    if (!transactionData.total) {
      transactionData.total = transactionData.quantity * transactionData.rate;
    }

    // Use crop name if not provided
    if (!transactionData.cropName) {
      transactionData.cropName = crop.name;
    }

    const transaction = await prisma.$transaction(async (tx: any) => {
      // Create the transaction
      const newTransaction = await tx.transaction.create({
        data: transactionData,
        include: {
          crop: true
        }
      });

      // Update crop stock
      const stockChange = transactionData.action === TransactionType.BUY 
        ? transactionData.quantity 
        : -transactionData.quantity;

      await tx.crop.update({
        where: { id: transactionData.cropId },
        data: {
          currentStock: {
            increment: stockChange
          }
        }
      });

      return newTransaction;
    });

    res.status(201).json(successResponse(transaction, 'Transaction created successfully'));
  })
);

// PUT /api/transactions/:id - Update transaction
router.put('/:id',
  validateBody(UpdateTransactionSchema),
  asyncHandler(async (req: any, res: any) => {
    const { id } = req.params;
    const updateData = req.body;

    // Get the original transaction to calculate stock adjustment
    const originalTransaction = await prisma.transaction.findUnique({
      where: { id }
    });

    if (!originalTransaction) {
      return res.status(404).json(errorResponse('Not Found', 'Transaction not found'));
    }

    const updatedTransaction = await prisma.$transaction(async (tx: any) => {
      // Revert original stock change
      const originalStockChange = originalTransaction.action === TransactionType.BUY 
        ? -originalTransaction.quantity 
        : originalTransaction.quantity;

      await tx.crop.update({
        where: { id: originalTransaction.cropId },
        data: {
          currentStock: {
            increment: originalStockChange
          }
        }
      });

      // Update the transaction
      const updated = await tx.transaction.update({
        where: { id },
        data: updateData,
        include: {
          crop: true
        }
      });

      // Apply new stock change
      const newStockChange = (updateData.action || originalTransaction.action) === TransactionType.BUY 
        ? (updateData.quantity || originalTransaction.quantity)
        : -(updateData.quantity || originalTransaction.quantity);

      await tx.crop.update({
        where: { id: updateData.cropId || originalTransaction.cropId },
        data: {
          currentStock: {
            increment: newStockChange
          }
        }
      });

      return updated;
    });

    res.json(successResponse(updatedTransaction, 'Transaction updated successfully'));
  })
);

// DELETE /api/transactions/:id - Delete transaction
router.delete('/:id',
  asyncHandler(async (req: any, res: any) => {
    const { id } = req.params;

    const transaction = await prisma.transaction.findUnique({
      where: { id }
    });

    if (!transaction) {
      return res.status(404).json(errorResponse('Not Found', 'Transaction not found'));
    }

    await prisma.$transaction(async (tx: any) => {
      // Revert stock change
      const stockChange = transaction.action === TransactionType.BUY 
        ? -transaction.quantity 
        : transaction.quantity;

      await tx.crop.update({
        where: { id: transaction.cropId },
        data: {
          currentStock: {
            increment: stockChange
          }
        }
      });

      // Delete the transaction
      await tx.transaction.delete({
        where: { id }
      });
    });

    res.json(successResponse(null, 'Transaction deleted successfully'));
  })
);

// GET /api/transactions/recent/:limit - Get recent transactions
router.get('/recent/:limit',
  asyncHandler(async (req: any, res: any) => {
    const limit = Math.min(parseInt(req.params.limit) || 10, 100);
    
    const transactions = await prisma.transaction.findMany({
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
    });

    res.json(successResponse(transactions));
  })
);

export default router;
