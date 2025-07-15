'use client';

import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { InventoryState, Crop, Transaction, ActionType, User } from '@/types';

// Mock data
const mockCrops: Crop[] = [
  { id: '1', name: 'Wheat', stock: 500, unit: 'kg', pricePerUnit: 1200, lastTradedAt: new Date('2024-01-15'), isVisible: true },
  { id: '2', name: 'Rice', stock: 300, unit: 'kg', pricePerUnit: 1400, lastTradedAt: new Date('2024-01-14'), isVisible: true },
  { id: '3', name: 'Corn', stock: 800, unit: 'kg', pricePerUnit: 800, lastTradedAt: new Date('2024-01-13'), isVisible: true },
  { id: '4', name: 'Soybeans', stock: 200, unit: 'kg', pricePerUnit: 1600, lastTradedAt: new Date('2024-01-12'), isVisible: true },
  { id: '5', name: 'Barley', stock: 150, unit: 'kg', pricePerUnit: 1000, lastTradedAt: new Date('2024-01-11'), isVisible: true },
  { id: '6', name: 'Oats', stock: 120, unit: 'kg', pricePerUnit: 900, lastTradedAt: new Date('2024-01-10'), isVisible: true },
  { id: '7', name: 'Millet', stock: 80, unit: 'kg', pricePerUnit: 1100, lastTradedAt: new Date('2024-01-09'), isVisible: true },
  { id: '8', name: 'Sorghum', stock: 95, unit: 'kg', pricePerUnit: 950, lastTradedAt: new Date('2024-01-08'), isVisible: true },
  { id: '9', name: 'Rye', stock: 60, unit: 'kg', pricePerUnit: 1300, lastTradedAt: new Date('2024-01-07'), isVisible: true },
];

// Replace generateMonthlyTransactions with generateDailyTransactions
function generateDailyTransactions() {
  const crops = mockCrops;
  const transactions: Transaction[] = [];
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth() - 12, today.getDate());
  for (let d = new Date(start); d <= today; d.setDate(d.getDate() + 1)) {
    for (const crop of crops) {
      // Create more realistic price variations
      const dayOfYear = Math.floor((d.getTime() - new Date(d.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
      const seasonalFactor = Math.sin((dayOfYear / 365) * 2 * Math.PI) * 0.2; // ±20% seasonal variation
      const randomFactor = (Math.sin(dayOfYear * parseInt(crop.id, 10)) * 0.15); // ±15% random variation
      const marketTrend = (dayOfYear / 365) * 0.1; // 10% yearly upward trend
      
      // Buy price (what we pay to suppliers) - base price with variations
      const buyPriceMultiplier = 1 + seasonalFactor + randomFactor + marketTrend;
      const buyQuantity = 50 + ((d.getDate() + parseInt(crop.id, 10)) % 100);
      const buyRate = crop.pricePerUnit * buyPriceMultiplier;
      const buyTotal = buyRate * buyQuantity;
      
      // Sell price (what we get from customers) - usually 15-25% higher than buy price for profit
      const profitMarginBase = 0.20; // 20% base profit margin
      const demandFactor = Math.sin((dayOfYear / 365) * 2 * Math.PI + Math.PI/4) * 0.1; // Demand varies
      const competitionFactor = (Math.cos(dayOfYear * parseInt(crop.id, 10) * 0.5) * 0.05); // Competition effect
      const sellPriceMultiplier = buyPriceMultiplier * (1 + profitMarginBase + demandFactor + competitionFactor);
      const sellQuantity = 20 + ((d.getDate() + parseInt(crop.id, 10)) % 60);
      const sellRate = crop.pricePerUnit * sellPriceMultiplier;
      const sellTotal = sellRate * sellQuantity;
      
      // Buy transaction
      transactions.push({
        id: `buy-${crop.id}-${d.toISOString().slice(0,10)}`,
        cropId: crop.id,
        cropName: crop.name,
        action: 'buy',
        quantity: buyQuantity,
        rate: Math.round(buyRate * 100) / 100, // Round to 2 decimal places
        total: Math.round(buyTotal * 100) / 100,
        partyName: 'Supplier',
        notes: 'Daily buy',
        date: new Date(d),
      });
      
      // Sell transaction
      transactions.push({
        id: `sell-${crop.id}-${d.toISOString().slice(0,10)}`,
        cropId: crop.id,
        cropName: crop.name,
        action: 'sell',
        quantity: sellQuantity,
        rate: Math.round(sellRate * 100) / 100,
        total: Math.round(sellTotal * 100) / 100,
        partyName: 'Customer',
        notes: 'Daily sell',
        date: new Date(d),
      });
    }
  }
  return transactions;
}

const mockTransactions: Transaction[] = [
  // Only use generated daily transactions
  ...generateDailyTransactions(),
];

const mockUser: User = {
  id: '1',
  name: 'Ahmed Khan',
  role: 'Shop Owner',
};

type InventoryAction =
  | { type: 'SET_SELECTED_CROP'; payload: Crop | null }
  | { type: 'SET_ACTION_TYPE'; payload: ActionType | null }
  | { type: 'SET_TRANSACTION_MODAL_OPEN'; payload: boolean }
  | { type: 'SET_ADD_CROP_MODAL_OPEN'; payload: boolean }
  | { type: 'ADD_TRANSACTION'; payload: Transaction }
  | { type: 'UPDATE_CROP_STOCK'; payload: { cropId: string; quantity: number; action: ActionType } }
  | { type: 'ADD_CROP'; payload: Crop }
  | { type: 'SET_USER'; payload: User | null };

const initialState: InventoryState = {
  crops: mockCrops,
  visibleCrops: mockCrops.slice(0, 5), // Show first 5 crops initially
  transactions: mockTransactions,
  selectedCrop: null,
  actionType: null,
  isTransactionModalOpen: false,
  isAddCropModalOpen: false,
  user: mockUser,
  maxVisibleCrops: 5, // Only 5 visible crops
};

// Helper function to update crop visibility based on last traded date
function updateCropVisibility(crops: Crop[], maxVisible: number): Crop[] {
  // Sort crops by lastTradedAt (most recent first)
  const sortedCrops = [...crops].sort((a, b) => {
    const dateA = a.lastTradedAt || new Date(0);
    const dateB = b.lastTradedAt || new Date(0);
    return dateB.getTime() - dateA.getTime();
  });

  // Take the most recently traded crops up to maxVisible
  return sortedCrops.slice(0, maxVisible);
}

function inventoryReducer(state: InventoryState, action: InventoryAction): InventoryState {
  switch (action.type) {
    case 'SET_SELECTED_CROP':
      return { ...state, selectedCrop: action.payload };
    case 'SET_ACTION_TYPE':
      return { ...state, actionType: action.payload };
    case 'SET_TRANSACTION_MODAL_OPEN':
      return { ...state, isTransactionModalOpen: action.payload };
    case 'SET_ADD_CROP_MODAL_OPEN':
      return { ...state, isAddCropModalOpen: action.payload };
    case 'ADD_TRANSACTION':
      // Update the crop's lastTradedAt and update visibility
      const updatedCrops = state.crops.map(crop =>
        crop.id === action.payload.cropId
          ? { ...crop, lastTradedAt: new Date() }
          : crop
      );
      
      return {
        ...state,
        crops: updatedCrops,
        visibleCrops: updateCropVisibility(updatedCrops, state.maxVisibleCrops),
        transactions: [action.payload, ...state.transactions],
        isTransactionModalOpen: false,
        selectedCrop: null,
        actionType: null,
      };
    case 'UPDATE_CROP_STOCK':
      return {
        ...state,
        crops: state.crops.map(crop =>
          crop.id === action.payload.cropId
            ? {
                ...crop,
                stock: action.payload.action === 'buy'
                  ? crop.stock + action.payload.quantity
                  : crop.stock - action.payload.quantity,
              }
            : crop
        ),
      };
    case 'ADD_CROP':
      const newCrop = {
        ...action.payload,
        lastTradedAt: new Date(),
        isVisible: true,
      };
      
      const cropsWithNewCrop = [...state.crops, newCrop];
      const updatedVisibleCrops = updateCropVisibility(cropsWithNewCrop, state.maxVisibleCrops);
      
      return {
        ...state,
        crops: cropsWithNewCrop,
        visibleCrops: updatedVisibleCrops,
        isAddCropModalOpen: false,
      };
    case 'SET_USER':
      return { ...state, user: action.payload };
    default:
      return state;
  }
}

interface InventoryContextType {
  state: InventoryState;
  dispatch: React.Dispatch<InventoryAction>;
}

const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

export function InventoryProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(inventoryReducer, initialState);

  return (
    <InventoryContext.Provider value={{ state, dispatch }}>
      {children}
    </InventoryContext.Provider>
  );
}

export function useInventory() {
  const context = useContext(InventoryContext);
  if (context === undefined) {
    throw new Error('useInventory must be used within an InventoryProvider');
  }
  return context;
} 