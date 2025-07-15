import { Router } from 'express';
import { prisma } from '../index';
import { 
  CreateCropSchema, 
  UpdateCropSchema, 
  PaginationSchema 
} from '../types';
import { 
  validateBody, 
  validateQuery, 
  asyncHandler, 
  successResponse, 
  errorResponse,
  calculatePagination 
} from '../utils/helpers';

const router = Router();

// GET /api/crops - Get all crops with pagination
router.get('/', 
  validateQuery(PaginationSchema.partial()),
  asyncHandler(async (req: any, res: any) => {
    const { page = 1, limit = 10 } = req.query;
    
    const [crops, total] = await Promise.all([
      prisma.crop.findMany({
        skip: (page - 1) * limit,
        take: limit,
        include: {
          _count: {
            select: { transactions: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.crop.count()
    ]);

    const pagination = calculatePagination(page, limit, total);

    res.json({
      success: true,
      data: crops,
      pagination
    });
  })
);

// GET /api/crops/:id - Get single crop
router.get('/:id', 
  asyncHandler(async (req: any, res: any) => {
    const { id } = req.params;
    
    const crop = await prisma.crop.findUnique({
      where: { id },
      include: {
        transactions: {
          orderBy: { date: 'desc' },
          take: 10 // Recent transactions
        },
        _count: {
          select: { transactions: true }
        }
      }
    });

    if (!crop) {
      return res.status(404).json(errorResponse('Not Found', 'Crop not found'));
    }

    res.json(successResponse(crop));
  })
);

// POST /api/crops - Create new crop
router.post('/',
  validateBody(CreateCropSchema),
  asyncHandler(async (req: any, res: any) => {
    const cropData = req.body;
    
    try {
      const crop = await prisma.crop.create({
        data: cropData
      });

      res.status(201).json(successResponse(crop, 'Crop created successfully'));
    } catch (error: any) {
      if (error.code === 'P2002') {
        return res.status(400).json(errorResponse('Duplicate Entry', 'Crop name already exists'));
      }
      throw error;
    }
  })
);

// PUT /api/crops/:id - Update crop
router.put('/:id',
  validateBody(UpdateCropSchema),
  asyncHandler(async (req: any, res: any) => {
    const { id } = req.params;
    const updateData = req.body;

    try {
      const crop = await prisma.crop.update({
        where: { id },
        data: updateData
      });

      res.json(successResponse(crop, 'Crop updated successfully'));
    } catch (error: any) {
      if (error.code === 'P2025') {
        return res.status(404).json(errorResponse('Not Found', 'Crop not found'));
      }
      if (error.code === 'P2002') {
        return res.status(400).json(errorResponse('Duplicate Entry', 'Crop name already exists'));
      }
      throw error;
    }
  })
);

// DELETE /api/crops/:id - Delete crop
router.delete('/:id',
  asyncHandler(async (req: any, res: any) => {
    const { id } = req.params;

    try {
      await prisma.crop.delete({
        where: { id }
      });

      res.json(successResponse(null, 'Crop deleted successfully'));
    } catch (error: any) {
      if (error.code === 'P2025') {
        return res.status(404).json(errorResponse('Not Found', 'Crop not found'));
      }
      throw error;
    }
  })
);

// GET /api/crops/:id/transactions - Get crop transactions
router.get('/:id/transactions',
  validateQuery(PaginationSchema.partial()),
  asyncHandler(async (req: any, res: any) => {
    const { id } = req.params;
    const { page = 1, limit = 10 } = req.query;

    // Check if crop exists
    const crop = await prisma.crop.findUnique({ where: { id } });
    if (!crop) {
      return res.status(404).json(errorResponse('Not Found', 'Crop not found'));
    }

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where: { cropId: id },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { date: 'desc' }
      }),
      prisma.transaction.count({ where: { cropId: id } })
    ]);

    const pagination = calculatePagination(page, limit, total);

    res.json({
      success: true,
      data: transactions,
      pagination
    });
  })
);

// GET /api/crops/search/:query - Search crops
router.get('/search/:query',
  asyncHandler(async (req: any, res: any) => {
    const { query } = req.params;
    
    const crops = await prisma.crop.findMany({
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

    res.json(successResponse(crops));
  })
);

export default router;
