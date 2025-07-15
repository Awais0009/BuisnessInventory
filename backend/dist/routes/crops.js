"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const index_1 = require("../index");
const types_1 = require("../types");
const helpers_1 = require("../utils/helpers");
const router = (0, express_1.Router)();
router.get('/', (0, helpers_1.validateQuery)(types_1.PaginationSchema.partial()), (0, helpers_1.asyncHandler)(async (req, res) => {
    const { page = 1, limit = 10 } = req.query;
    const [crops, total] = await Promise.all([
        index_1.prisma.crop.findMany({
            skip: (page - 1) * limit,
            take: limit,
            include: {
                _count: {
                    select: { transactions: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        }),
        index_1.prisma.crop.count()
    ]);
    const pagination = (0, helpers_1.calculatePagination)(page, limit, total);
    res.json({
        success: true,
        data: crops,
        pagination
    });
}));
router.get('/:id', (0, helpers_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const crop = await index_1.prisma.crop.findUnique({
        where: { id },
        include: {
            transactions: {
                orderBy: { date: 'desc' },
                take: 10
            },
            _count: {
                select: { transactions: true }
            }
        }
    });
    if (!crop) {
        return res.status(404).json((0, helpers_1.errorResponse)('Not Found', 'Crop not found'));
    }
    res.json((0, helpers_1.successResponse)(crop));
}));
router.post('/', (0, helpers_1.validateBody)(types_1.CreateCropSchema), (0, helpers_1.asyncHandler)(async (req, res) => {
    const cropData = req.body;
    try {
        const crop = await index_1.prisma.crop.create({
            data: cropData
        });
        res.status(201).json((0, helpers_1.successResponse)(crop, 'Crop created successfully'));
    }
    catch (error) {
        if (error.code === 'P2002') {
            return res.status(400).json((0, helpers_1.errorResponse)('Duplicate Entry', 'Crop name already exists'));
        }
        throw error;
    }
}));
router.put('/:id', (0, helpers_1.validateBody)(types_1.UpdateCropSchema), (0, helpers_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const updateData = req.body;
    try {
        const crop = await index_1.prisma.crop.update({
            where: { id },
            data: updateData
        });
        res.json((0, helpers_1.successResponse)(crop, 'Crop updated successfully'));
    }
    catch (error) {
        if (error.code === 'P2025') {
            return res.status(404).json((0, helpers_1.errorResponse)('Not Found', 'Crop not found'));
        }
        if (error.code === 'P2002') {
            return res.status(400).json((0, helpers_1.errorResponse)('Duplicate Entry', 'Crop name already exists'));
        }
        throw error;
    }
}));
router.delete('/:id', (0, helpers_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    try {
        await index_1.prisma.crop.delete({
            where: { id }
        });
        res.json((0, helpers_1.successResponse)(null, 'Crop deleted successfully'));
    }
    catch (error) {
        if (error.code === 'P2025') {
            return res.status(404).json((0, helpers_1.errorResponse)('Not Found', 'Crop not found'));
        }
        throw error;
    }
}));
router.get('/:id/transactions', (0, helpers_1.validateQuery)(types_1.PaginationSchema.partial()), (0, helpers_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const crop = await index_1.prisma.crop.findUnique({ where: { id } });
    if (!crop) {
        return res.status(404).json((0, helpers_1.errorResponse)('Not Found', 'Crop not found'));
    }
    const [transactions, total] = await Promise.all([
        index_1.prisma.transaction.findMany({
            where: { cropId: id },
            skip: (page - 1) * limit,
            take: limit,
            orderBy: { date: 'desc' }
        }),
        index_1.prisma.transaction.count({ where: { cropId: id } })
    ]);
    const pagination = (0, helpers_1.calculatePagination)(page, limit, total);
    res.json({
        success: true,
        data: transactions,
        pagination
    });
}));
router.get('/search/:query', (0, helpers_1.asyncHandler)(async (req, res) => {
    const { query } = req.params;
    const crops = await index_1.prisma.crop.findMany({
        where: {
            OR: [
                { name: { contains: query, mode: 'insensitive' } },
                { description: { contains: query, mode: 'insensitive' } },
                { category: { contains: query, mode: 'insensitive' } }
            ]
        },
        include: {
            _count: {
                select: { transactions: true }
            }
        }
    });
    res.json((0, helpers_1.successResponse)(crops));
}));
exports.default = router;
//# sourceMappingURL=crops.js.map