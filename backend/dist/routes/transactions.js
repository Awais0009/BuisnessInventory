"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const index_1 = require("../index");
const types_1 = require("../types");
const helpers_1 = require("../utils/helpers");
const router = (0, express_1.Router)();
router.get('/', (0, helpers_1.validateQuery)(types_1.PaginationSchema.partial().merge(types_1.DateRangeSchema.partial().extend({
    cropId: require('zod').string().optional(),
    action: require('zod').nativeEnum(types_1.TransactionType).optional(),
    partyName: require('zod').string().optional()
}))), (0, helpers_1.asyncHandler)(async (req, res) => {
    const { page = 1, limit = 10, startDate, endDate, cropId, action, partyName } = req.query;
    const { start, end } = (0, helpers_1.getDateRange)(startDate, endDate);
    const where = {
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
    const [transactions, total] = await Promise.all([
        index_1.prisma.transaction.findMany({
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
        index_1.prisma.transaction.count({ where })
    ]);
    const pagination = (0, helpers_1.calculatePagination)(page, limit, total);
    res.json({
        success: true,
        data: transactions,
        pagination
    });
}));
router.get('/:id', (0, helpers_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const transaction = await index_1.prisma.transaction.findUnique({
        where: { id },
        include: {
            crop: true
        }
    });
    if (!transaction) {
        return res.status(404).json((0, helpers_1.errorResponse)('Not Found', 'Transaction not found'));
    }
    res.json((0, helpers_1.successResponse)(transaction));
}));
router.post('/', (0, helpers_1.validateBody)(types_1.CreateTransactionSchema), (0, helpers_1.asyncHandler)(async (req, res) => {
    const transactionData = req.body;
    const crop = await index_1.prisma.crop.findUnique({
        where: { id: transactionData.cropId }
    });
    if (!crop) {
        return res.status(404).json((0, helpers_1.errorResponse)('Not Found', 'Crop not found'));
    }
    if (!transactionData.total) {
        transactionData.total = transactionData.quantity * transactionData.rate;
    }
    if (!transactionData.cropName) {
        transactionData.cropName = crop.name;
    }
    const transaction = await index_1.prisma.$transaction(async (tx) => {
        const newTransaction = await tx.transaction.create({
            data: transactionData,
            include: {
                crop: true
            }
        });
        const stockChange = transactionData.action === types_1.TransactionType.BUY
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
    res.status(201).json((0, helpers_1.successResponse)(transaction, 'Transaction created successfully'));
}));
router.put('/:id', (0, helpers_1.validateBody)(types_1.UpdateTransactionSchema), (0, helpers_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const updateData = req.body;
    const originalTransaction = await index_1.prisma.transaction.findUnique({
        where: { id }
    });
    if (!originalTransaction) {
        return res.status(404).json((0, helpers_1.errorResponse)('Not Found', 'Transaction not found'));
    }
    const updatedTransaction = await index_1.prisma.$transaction(async (tx) => {
        const originalStockChange = originalTransaction.action === types_1.TransactionType.BUY
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
        const updated = await tx.transaction.update({
            where: { id },
            data: updateData,
            include: {
                crop: true
            }
        });
        const newStockChange = (updateData.action || originalTransaction.action) === types_1.TransactionType.BUY
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
    res.json((0, helpers_1.successResponse)(updatedTransaction, 'Transaction updated successfully'));
}));
router.delete('/:id', (0, helpers_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const transaction = await index_1.prisma.transaction.findUnique({
        where: { id }
    });
    if (!transaction) {
        return res.status(404).json((0, helpers_1.errorResponse)('Not Found', 'Transaction not found'));
    }
    await index_1.prisma.$transaction(async (tx) => {
        const stockChange = transaction.action === types_1.TransactionType.BUY
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
        await tx.transaction.delete({
            where: { id }
        });
    });
    res.json((0, helpers_1.successResponse)(null, 'Transaction deleted successfully'));
}));
router.get('/recent/:limit', (0, helpers_1.asyncHandler)(async (req, res) => {
    const limit = Math.min(parseInt(req.params.limit) || 10, 100);
    const transactions = await index_1.prisma.transaction.findMany({
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
    res.json((0, helpers_1.successResponse)(transactions));
}));
exports.default = router;
//# sourceMappingURL=transactions.js.map