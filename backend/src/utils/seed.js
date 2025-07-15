"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var client_1 = require("@prisma/client");
var types_1 = require("../types");
var prisma = new client_1.PrismaClient();
var crops = [
    { name: 'Wheat', description: 'High-quality wheat grain', basePrice: 1200, unit: 'kg', category: 'Grains' },
    { name: 'Rice', description: 'Premium basmati rice', basePrice: 1400, unit: 'kg', category: 'Grains' },
    { name: 'Corn', description: 'Sweet corn kernels', basePrice: 800, unit: 'kg', category: 'Grains' },
    { name: 'Soybeans', description: 'Organic soybeans', basePrice: 1600, unit: 'kg', category: 'Legumes' },
    { name: 'Barley', description: 'Malting barley', basePrice: 1000, unit: 'kg', category: 'Grains' },
    { name: 'Oats', description: 'Rolled oats', basePrice: 900, unit: 'kg', category: 'Grains' },
    { name: 'Millet', description: 'Pearl millet', basePrice: 1100, unit: 'kg', category: 'Grains' },
    { name: 'Sorghum', description: 'Grain sorghum', basePrice: 950, unit: 'kg', category: 'Grains' },
    { name: 'Rye', description: 'Winter rye', basePrice: 1300, unit: 'kg', category: 'Grains' }
];
function generateRealisticTransactions(cropId, cropName, basePrice, startDate, endDate) {
    return __awaiter(this, void 0, void 0, function () {
        var transactions, currentDate, dayCount, dayOfYear, seasonalFactor, randomFactor, year, yearTrend, buyPrice, profitMargin, demandFactor, competitionFactor, sellPrice, baseQuantityBuy, baseQuantitySell, buyQuantity, sellQuantity, buyTransaction, sellTransaction;
        return __generator(this, function (_a) {
            transactions = [];
            currentDate = new Date(startDate);
            dayCount = 0;
            while (currentDate <= endDate) {
                dayCount++;
                dayOfYear = Math.floor((currentDate.getTime() - new Date(currentDate.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
                seasonalFactor = 1 + 0.2 * Math.sin(2 * Math.PI * dayOfYear / 365);
                randomFactor = 0.85 + Math.random() * 0.3;
                year = currentDate.getFullYear();
                yearTrend = 1 + (year - 2024) * 0.1;
                buyPrice = Math.round(basePrice * seasonalFactor * randomFactor * yearTrend * 100) / 100;
                profitMargin = 0.15 + Math.random() * 0.1;
                demandFactor = 0.9 + Math.random() * 0.2;
                competitionFactor = 0.95 + Math.random() * 0.1;
                sellPrice = Math.round(buyPrice * (1 + profitMargin) * demandFactor * competitionFactor * 100) / 100;
                baseQuantityBuy = 65 + dayCount % 10;
                baseQuantitySell = 35 + dayCount % 10;
                buyQuantity = baseQuantityBuy + Math.floor(Math.random() * 10);
                sellQuantity = baseQuantitySell + Math.floor(Math.random() * 10);
                buyTransaction = {
                    cropId: cropId,
                    cropName: cropName,
                    action: types_1.TransactionType.BUY,
                    quantity: buyQuantity,
                    rate: buyPrice,
                    total: Math.round(buyQuantity * buyPrice * 100) / 100,
                    partyName: 'Supplier',
                    notes: 'Daily buy',
                    date: new Date(currentDate)
                };
                sellTransaction = {
                    cropId: cropId,
                    cropName: cropName,
                    action: types_1.TransactionType.SELL,
                    quantity: sellQuantity,
                    rate: sellPrice,
                    total: Math.round(sellQuantity * sellPrice * 100) / 100,
                    partyName: 'Customer',
                    notes: 'Daily sell',
                    date: new Date(currentDate)
                };
                transactions.push(buyTransaction, sellTransaction);
                // Move to next day
                currentDate.setDate(currentDate.getDate() + 1);
            }
            return [2 /*return*/, transactions];
        });
    });
}
function seed() {
    return __awaiter(this, void 0, void 0, function () {
        var createdCrops, _i, crops_1, crop, createdCrop, startDate, endDate, _a, createdCrops_1, crop, transactions, batchSize, i, batch, totalBought, totalSold, currentStock, totalTransactions, error_1;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 17, 18, 20]);
                    console.log('🌱 Starting database seed...');
                    // Clear existing data
                    return [4 /*yield*/, prisma.transaction.deleteMany()];
                case 1:
                    // Clear existing data
                    _b.sent();
                    return [4 /*yield*/, prisma.crop.deleteMany()];
                case 2:
                    _b.sent();
                    console.log('🗑️  Cleared existing data');
                    createdCrops = [];
                    _i = 0, crops_1 = crops;
                    _b.label = 3;
                case 3:
                    if (!(_i < crops_1.length)) return [3 /*break*/, 6];
                    crop = crops_1[_i];
                    return [4 /*yield*/, prisma.crop.create({
                            data: crop
                        })];
                case 4:
                    createdCrop = _b.sent();
                    createdCrops.push(createdCrop);
                    console.log("\u2705 Created crop: ".concat(crop.name));
                    _b.label = 5;
                case 5:
                    _i++;
                    return [3 /*break*/, 3];
                case 6:
                    startDate = new Date('2024-07-14');
                    endDate = new Date('2025-07-14');
                    console.log('📊 Generating realistic transactions...');
                    _a = 0, createdCrops_1 = createdCrops;
                    _b.label = 7;
                case 7:
                    if (!(_a < createdCrops_1.length)) return [3 /*break*/, 15];
                    crop = createdCrops_1[_a];
                    return [4 /*yield*/, generateRealisticTransactions(crop.id, crop.name, crop.basePrice, startDate, endDate)];
                case 8:
                    transactions = _b.sent();
                    batchSize = 100;
                    i = 0;
                    _b.label = 9;
                case 9:
                    if (!(i < transactions.length)) return [3 /*break*/, 12];
                    batch = transactions.slice(i, i + batchSize);
                    return [4 /*yield*/, prisma.transaction.createMany({
                            data: batch
                        })];
                case 10:
                    _b.sent();
                    _b.label = 11;
                case 11:
                    i += batchSize;
                    return [3 /*break*/, 9];
                case 12:
                    totalBought = transactions
                        .filter(function (t) { return t.action === types_1.TransactionType.BUY; })
                        .reduce(function (sum, t) { return sum + t.quantity; }, 0);
                    totalSold = transactions
                        .filter(function (t) { return t.action === types_1.TransactionType.SELL; })
                        .reduce(function (sum, t) { return sum + t.quantity; }, 0);
                    currentStock = totalBought - totalSold;
                    return [4 /*yield*/, prisma.crop.update({
                            where: { id: crop.id },
                            data: { currentStock: currentStock }
                        })];
                case 13:
                    _b.sent();
                    console.log("\uD83D\uDCC8 Generated ".concat(transactions.length, " transactions for ").concat(crop.name, ", stock: ").concat(currentStock));
                    _b.label = 14;
                case 14:
                    _a++;
                    return [3 /*break*/, 7];
                case 15: return [4 /*yield*/, prisma.transaction.count()];
                case 16:
                    totalTransactions = _b.sent();
                    console.log("\uD83C\uDF89 Seed completed! Created ".concat(createdCrops.length, " crops and ").concat(totalTransactions, " transactions"));
                    return [3 /*break*/, 20];
                case 17:
                    error_1 = _b.sent();
                    console.error('❌ Seed failed:', error_1);
                    throw error_1;
                case 18: return [4 /*yield*/, prisma.$disconnect()];
                case 19:
                    _b.sent();
                    return [7 /*endfinally*/];
                case 20: return [2 /*return*/];
            }
        });
    });
}
// Run seed if called directly
if (require.main === module) {
    seed().catch(function (error) {
        console.error(error);
        process.exit(1);
    });
}
exports.default = seed;
