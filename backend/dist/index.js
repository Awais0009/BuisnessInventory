"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv = __importStar(require("dotenv"));
const prisma_1 = require("../generated/prisma");
const crops_1 = __importDefault(require("./routes/crops"));
const transactions_1 = __importDefault(require("./routes/transactions"));
const analytics_1 = __importDefault(require("./routes/analytics"));
const dashboard_1 = __importDefault(require("./routes/dashboard"));
dotenv.config();
const app = (0, express_1.default)();
const port = process.env.PORT || 5000;
exports.prisma = new prisma_1.PrismaClient();
app.use((0, cors_1.default)({
    origin: process.env.FRONTEND_URL || 'http://localhost:3002',
    credentials: true
}));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        message: 'Business Inventory Backend is running',
        timestamp: new Date().toISOString()
    });
});
app.use('/api/crops', crops_1.default);
app.use('/api/transactions', transactions_1.default);
app.use('/api/analytics', analytics_1.default);
app.use('/api/dashboard', dashboard_1.default);
app.use((err, req, res, next) => {
    console.error('Global error handler:', err);
    res.status(500).json({
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
    });
});
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Not Found',
        message: `Route ${req.originalUrl} not found`
    });
});
process.on('SIGINT', async () => {
    console.log('Shutting down gracefully...');
    await exports.prisma.$disconnect();
    process.exit(0);
});
app.listen(port, () => {
    console.log(`🚀 Business Inventory Backend running on port ${port}`);
    console.log(`📊 Health check: http://localhost:${port}/health`);
    console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3002'}`);
});
exports.default = app;
//# sourceMappingURL=index.js.map