import { z } from 'zod';
import { TransactionType as PrismaTransactionType } from '../../generated/prisma';

// Use Prisma enum
export const TransactionType = PrismaTransactionType;
export type TransactionType = PrismaTransactionType;

// Zod schemas for validation
export const CropSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Crop name is required'),
  description: z.string().optional(),
  basePrice: z.number().min(0, 'Base price must be positive').default(0),
  currentStock: z.number().min(0, 'Stock must be positive').default(0),
  unit: z.string().default('kg'),
  category: z.string().optional(),
});

export const CreateCropSchema = CropSchema.omit({ id: true });
export const UpdateCropSchema = CropSchema.partial().omit({ id: true });

export const TransactionSchema = z.object({
  id: z.string().optional(),
  cropId: z.string().min(1, 'Crop ID is required'),
  cropName: z.string().min(1, 'Crop name is required'),
  action: z.nativeEnum(TransactionType),
  quantity: z.number().positive('Quantity must be positive'),
  rate: z.number().positive('Rate must be positive'),
  total: z.number().positive('Total must be positive'),
  partyName: z.string().min(1, 'Party name is required'),
  notes: z.string().optional(),
  date: z.string().or(z.date()).transform((val: any) => new Date(val)),
});

export const CreateTransactionSchema = TransactionSchema.omit({ id: true });
export const UpdateTransactionSchema = TransactionSchema.partial().omit({ id: true });

// Query parameter schemas
export const DateRangeSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export const AnalyticsQuerySchema = DateRangeSchema.extend({
  cropIds: z.string().optional().transform((val: any) => val ? val.split(',') : undefined),
  transactionType: z.nativeEnum(TransactionType).optional(),
});

export const PaginationSchema = z.object({
  page: z.string().transform((val: any) => parseInt(val) || 1),
  limit: z.string().transform((val: any) => Math.min(parseInt(val) || 10, 100)),
});

// TypeScript types
export type Crop = z.infer<typeof CropSchema>;
export type CreateCrop = z.infer<typeof CreateCropSchema>;
export type UpdateCrop = z.infer<typeof UpdateCropSchema>;

export type Transaction = z.infer<typeof TransactionSchema>;
export type CreateTransaction = z.infer<typeof CreateTransactionSchema>;
export type UpdateTransaction = z.infer<typeof UpdateTransactionSchema>;

export type DateRange = z.infer<typeof DateRangeSchema>;
export type AnalyticsQuery = z.infer<typeof AnalyticsQuerySchema>;
export type Pagination = z.infer<typeof PaginationSchema>;

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// Analytics types
export interface ProfitLossData {
  date: string;
  profit: number;
  loss: number;
  netProfit: number;
  totalRevenue: number;
  totalCost: number;
}

export interface CropAnalytics {
  cropId: string;
  cropName: string;
  totalBought: number;
  totalSold: number;
  currentStock: number;
  totalInvestment: number;
  totalRevenue: number;
  netProfit: number;
  profitMargin: number;
}

export interface DashboardStats {
  totalCrops: number;
  totalTransactions: number;
  totalInvestment: number;
  totalRevenue: number;
  netProfit: number;
  profitMargin: number;
  recentTransactions: any[]; // Use any[] for Prisma query results
  topProfitableCrops: CropAnalytics[];
}
