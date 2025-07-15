"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const prisma_1 = require("../../generated/prisma");
const types_1 = require("../types");
const prisma = new prisma_1.PrismaClient();
const crops = [
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
async function generateRealisticTransactions(cropId, cropName, basePrice, startDate, endDate) {
    const transactions = [];
    const currentDate = new Date(startDate);
    let dayCount = 0;
    while (currentDate <= endDate) {
        dayCount++;
        const dayOfYear = Math.floor((currentDate.getTime() - new Date(currentDate.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
        const seasonalFactor = 1 + 0.2 * Math.sin(2 * Math.PI * dayOfYear / 365);
        const randomFactor = 0.85 + Math.random() * 0.3;
        const year = currentDate.getFullYear();
        const yearTrend = 1 + (year - 2024) * 0.1;
        const buyPrice = Math.round(basePrice * seasonalFactor * randomFactor * yearTrend * 100) / 100;
        const profitMargin = 0.15 + Math.random() * 0.1;
        const demandFactor = 0.9 + Math.random() * 0.2;
        const competitionFactor = 0.95 + Math.random() * 0.1;
        const sellPrice = Math.round(buyPrice * (1 + profitMargin) * demandFactor * competitionFactor * 100) / 100;
        const baseQuantityBuy = 65 + dayCount % 10;
        const baseQuantitySell = 35 + dayCount % 10;
        const buyQuantity = baseQuantityBuy + Math.floor(Math.random() * 10);
        const sellQuantity = baseQuantitySell + Math.floor(Math.random() * 10);
        const buyTransaction = {
            cropId,
            cropName,
            action: types_1.TransactionType.BUY,
            quantity: buyQuantity,
            rate: buyPrice,
            total: Math.round(buyQuantity * buyPrice * 100) / 100,
            partyName: 'Supplier',
            notes: 'Daily buy',
            date: new Date(currentDate)
        };
        const sellTransaction = {
            cropId,
            cropName,
            action: types_1.TransactionType.SELL,
            quantity: sellQuantity,
            rate: sellPrice,
            total: Math.round(sellQuantity * sellPrice * 100) / 100,
            partyName: 'Customer',
            notes: 'Daily sell',
            date: new Date(currentDate)
        };
        transactions.push(buyTransaction, sellTransaction);
        currentDate.setDate(currentDate.getDate() + 1);
    }
    return transactions;
}
async function seed() {
    try {
        console.log('🌱 Starting database seed...');
        await prisma.transaction.deleteMany();
        await prisma.crop.deleteMany();
        console.log('🗑️  Cleared existing data');
        const createdCrops = [];
        for (const crop of crops) {
            const createdCrop = await prisma.crop.create({
                data: crop
            });
            createdCrops.push(createdCrop);
            console.log(`✅ Created crop: ${crop.name}`);
        }
        const startDate = new Date('2024-07-14');
        const endDate = new Date('2025-07-14');
        console.log('📊 Generating realistic transactions...');
        for (const crop of createdCrops) {
            const transactions = await generateRealisticTransactions(crop.id, crop.name, crop.basePrice, startDate, endDate);
            const batchSize = 100;
            for (let i = 0; i < transactions.length; i += batchSize) {
                const batch = transactions.slice(i, i + batchSize);
                await prisma.transaction.createMany({
                    data: batch
                });
            }
            const totalBought = transactions
                .filter(t => t.action === types_1.TransactionType.BUY)
                .reduce((sum, t) => sum + t.quantity, 0);
            const totalSold = transactions
                .filter(t => t.action === types_1.TransactionType.SELL)
                .reduce((sum, t) => sum + t.quantity, 0);
            const currentStock = totalBought - totalSold;
            await prisma.crop.update({
                where: { id: crop.id },
                data: { currentStock }
            });
            console.log(`📈 Generated ${transactions.length} transactions for ${crop.name}, stock: ${currentStock}`);
        }
        const totalTransactions = await prisma.transaction.count();
        console.log(`🎉 Seed completed! Created ${createdCrops.length} crops and ${totalTransactions} transactions`);
    }
    catch (error) {
        console.error('❌ Seed failed:', error);
        throw error;
    }
    finally {
        await prisma.$disconnect();
    }
}
if (require.main === module) {
    seed().catch((error) => {
        console.error(error);
        process.exit(1);
    });
}
exports.default = seed;
//# sourceMappingURL=seed.js.map