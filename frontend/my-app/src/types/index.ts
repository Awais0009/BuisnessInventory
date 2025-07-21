// =============================================
// Database Enums (matching your SQL schema)
// =============================================

export type UserRole = 'admin' | 'manager' | 'user' | 'viewer';
export type TransactionAction = 'buy' | 'sell';
export type TransactionStatus = 'pending' | 'confirmed' | 'cancelled';
export type PaymentMethod = 'cash' | 'bank_transfer' | 'credit_card' | 'check' | 'other';
export type PartyType = 'buyer' | 'seller' | 'both';

// =============================================
// Supabase Auth & Profile Types
// =============================================

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  role: UserRole;
  company_name?: string;
  phone?: string;
  address?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Company {
  id: string;
  name: string;
  description?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  logo_url?: string;
  tax_id?: string;
  created_by: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// =============================================
// Business Logic Types
// =============================================

export interface Crop {
  id: string;
  name: string;
  stock: number; // in kg
  unit: string;
  pricePerUnit: number; // price per 40kg
  lastTradedAt?: Date; // for smart visibility logic
  isVisible?: boolean; // whether crop is in visibleCrops
}

export interface Transaction {
  id: string;
  cropId: string;
  cropName: string;
  action: TransactionAction;
  quantity: number; // in kg
  rate: number; // per 40kg
  total: number;
  partyName: string;
  notes?: string;
  date: Date;
  
  // New fields from database schema
  status: TransactionStatus;
  paymentMethod: PaymentMethod;
  referenceNumber?: string;
  batchNumber?: string;
  taxPercentage?: number;
  taxAmount?: number;
  discountAmount?: number;
  finalAmount?: number;
  paymentStatus?: string;
  paidAmount?: number;
  dueDate?: Date;
  paymentDate?: Date;
  qualityGrade?: string;
  qualityNotes?: string;
  vehicleNumber?: string;
  driverName?: string;
  deliveryAddress?: string;
  
  // Bulk transaction support
  bulkTransactionId?: string; // Groups multiple transactions together
}

export interface User {
  id: string;
  name: string;
  role: 'Shop Owner' | 'Manager' | 'Employee';
}

export type ActionType = TransactionAction;

export interface InventoryState {
  crops: Crop[];
  visibleCrops: Crop[]; // subset of crops for dashboard display
  transactions: Transaction[];
  selectedCrop: Crop | null;
  actionType: ActionType | null;
  isTransactionModalOpen: boolean;
  isBulkTransactionModalOpen: boolean; // New state for bulk modal
  isAddCropModalOpen: boolean;
  user: User | null;
  maxVisibleCrops: number;
} 