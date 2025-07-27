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
  full_name?: string;
  avatar_url?: string;
  role: UserRole;
  business_name?: string;  // Fixed spelling to match database schema
  phone?: string;
  address?: string;
  is_active: boolean;
  email_confirmed_at?: string;  // Email confirmation field
  created_at: string;
  updated_at: string;
}


export interface Customer {
  id: string;
  name: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  address?: string;
  party_type: PartyType;
  company_id?: string;
  created_by?: string;
  notes?: string;
  credit_limit: number;
  current_balance: number;
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
  customerId?: string; // Link to customer/party ID
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