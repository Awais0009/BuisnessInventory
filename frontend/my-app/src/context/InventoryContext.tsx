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

const mockTransactions: Transaction[] = [
  {
    id: '1',
    cropId: '1',
    cropName: 'Wheat',
    action: 'buy',
    quantity: 100,
    rate: 1200,
    total: 3000,
    partyName: 'John Farmer',
    notes: 'Fresh harvest',
    date: new Date('2024-01-15'),
  },
  {
    id: '2',
    cropId: '2',
    cropName: 'Rice',
    action: 'sell',
    quantity: 50,
    rate: 1400,
    total: 1750,
    partyName: 'Local Market',
    notes: 'Premium quality',
    date: new Date('2024-01-14'),
  },
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