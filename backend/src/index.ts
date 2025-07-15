import express from 'express';
import cors from 'cors';
import * as dotenv from 'dotenv';
import { PrismaClient } from '../generated/prisma';

// Import routes
import cropRoutes from './routes/crops';
import transactionRoutes from './routes/transactions';
import analyticsRoutes from './routes/analytics';
import dashboardRoutes from './routes/dashboard';

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

// Initialize Prisma
export const prisma = new PrismaClient();

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3002',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Business Inventory Backend is running',
    timestamp: new Date().toISOString() 
  });
});

// API Routes
app.use('/api/crops', cropRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Global error handler:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.originalUrl} not found`
  });
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

// Start server
app.listen(port, () => {
  console.log(`🚀 Business Inventory Backend running on port ${port}`);
  console.log(`📊 Health check: http://localhost:${port}/health`);
  console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3002'}`);
});

export default app;
