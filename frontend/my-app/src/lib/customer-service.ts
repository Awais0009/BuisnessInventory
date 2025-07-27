
import { Customer, PartyType } from '@/types';
import { apiRequest } from '@/lib/auth';

export interface CreateCustomerData {
  name: string;
  phone?: string;
  address?: string;
  email?: string;
  party_type?: PartyType;
  notes?: string;
}

export interface CustomerSearchResult {
  id: string;
  name: string;
  phone?: string;
  address?: string;
  displayText: string; // "Name - Phone - Address" for dropdown
}

/**
 * Mock customer data for testing when backend is not available
 */
const mockCustomers: CustomerSearchResult[] = [
  {
    id: 'mock-1',
    name: 'Ahmed Ali',
    phone: '+92 300 1234567',
    address: 'Chak No 08, Kheror Pakka',
    displayText: 'Ahmed Ali - +92 300 1234567 - Chak No 08, Kheror Pakka'
  },
  {
    id: 'mock-2',
    name: 'Muhammad Hassan',
    phone: '+92 301 9876543',
    address: 'Village Manga',
    displayText: 'Muhammad Hassan - +92 301 9876543 - Village Manga'
  },
  {
    id: 'mock-3',
    name: 'Fatima Khan',
    phone: '+92 302 5555555',
    address: 'Chak No 15',
    displayText: 'Fatima Khan - +92 302 5555555 - Chak No 15'
  },
  {
    id: 'mock-4',
    name: 'Ali Raza',
    phone: '+92 303 7777777',
    address: 'Main Bazaar',
    displayText: 'Ali Raza - +92 303 7777777 - Main Bazaar'
  },
  {
    id: 'mock-5',
    name: 'Aisha Ahmed',
    phone: '+92 304 8888888',
    address: 'Near School',
    displayText: 'Aisha Ahmed - +92 304 8888888 - Near School'
  }
];

/**
 * Search mock customers by name
 */
function searchMockCustomers(searchTerm: string): CustomerSearchResult[] {
  return mockCustomers.filter(customer => 
    customer.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
}

/**
 * Search for customers by name (autocomplete)
 */
export async function searchCustomers(searchTerm: string): Promise<CustomerSearchResult[]> {
  if (!searchTerm.trim()) {
    return [];
  }

  console.log('searchCustomers called with:', searchTerm); // Debug log

  // For now, always use mock data for testing
  const mockResults = searchMockCustomers(searchTerm);
  console.log('Mock search results:', mockResults); // Debug log
  
  if (mockResults.length > 0) {
    return mockResults;
  }

  try {
    const response = await apiRequest(`/parties/search?name=${encodeURIComponent(searchTerm)}`);
    
    if (!response.ok) {
      console.error('Error searching customers:', response.statusText);
      return searchMockCustomers(searchTerm);
    }

    const data = await response.json();
    
    return (data.parties || []).map((customer: any) => ({
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      address: customer.address,
      displayText: formatCustomerDisplay(customer.name, customer.phone, customer.address)
    }));
  } catch (error) {
    console.error('Error in searchCustomers:', error);
    // Return mock data to allow testing
    return searchMockCustomers(searchTerm);
  }
}

/**
 * Get customer by ID
 */
export async function getCustomerById(customerId: string): Promise<Customer | null> {
  // Check if it's a mock customer ID
  if (customerId.startsWith('mock-')) {
    const mockCustomer = mockCustomers.find(c => c.id === customerId);
    if (mockCustomer) {
      return {
        id: mockCustomer.id,
        name: mockCustomer.name,
        phone: mockCustomer.phone,
        address: mockCustomer.address,
        email: undefined,
        party_type: 'both',
        credit_limit: 0,
        current_balance: 0,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    }
  }

  try {
    const response = await apiRequest(`/parties/${customerId}`);
    
    if (!response.ok) {
      console.error('Error getting customer:', response.statusText);
      return null;
    }

    const data = await response.json();
    return data.party;
  } catch (error) {
    console.error('Error in getCustomerById:', error);
    return null;
  }
}

/**
 * Create new customer
 */
export async function createCustomer(customerData: CreateCustomerData): Promise<Customer | null> {
  console.log('createCustomer called with:', customerData); // Debug log
  
  try {
    // For now, always create local customers since backend might not be fully set up
    const mockCustomer: Customer = {
      id: `local-${Date.now()}`,
      name: customerData.name.trim(),
      phone: customerData.phone?.trim() || undefined,
      address: customerData.address?.trim() || undefined,
      email: customerData.email?.trim() || undefined,
      party_type: customerData.party_type || 'both',
      notes: customerData.notes?.trim() || undefined,
      credit_limit: 0,
      current_balance: 0,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    console.log('Created mock customer:', mockCustomer); // Debug log
    return mockCustomer;
    
    // Backend API call (commented out for now, use when backend is ready)
    /*
    const response = await apiRequest('/parties', {
      method: 'POST',
      body: JSON.stringify({
        name: customerData.name.trim(),
        phone: customerData.phone?.trim() || null,
        address: customerData.address?.trim() || null,
        email: customerData.email?.trim() || null,
        party_type: customerData.party_type || 'both',
        notes: customerData.notes?.trim() || null,
      })
    });

    if (!response.ok) {
      console.error('Error creating customer:', response.statusText);
      return null;
    }

    const data = await response.json();
    return data.party;
    */
  } catch (error) {
    console.error('Error in createCustomer:', error);
    // Always return a local customer as fallback
    const mockCustomer: Customer = {
      id: `local-${Date.now()}`,
      name: customerData.name.trim(),
      phone: customerData.phone?.trim() || undefined,
      address: customerData.address?.trim() || undefined,
      email: customerData.email?.trim() || undefined,
      party_type: customerData.party_type || 'both',
      notes: customerData.notes?.trim() || undefined,
      credit_limit: 0,
      current_balance: 0,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    return mockCustomer;
  }
}

/**
 * Update existing customer
 */
export async function updateCustomer(customerId: string, updates: Partial<CreateCustomerData>): Promise<Customer | null> {
  try {
    const response = await apiRequest(`/parties/${customerId}`, {
      method: 'PUT',
      body: JSON.stringify({
        ...(updates.name && { name: updates.name.trim() }),
        ...(updates.phone !== undefined && { phone: updates.phone?.trim() || null }),
        ...(updates.address !== undefined && { address: updates.address?.trim() || null }),
        ...(updates.email !== undefined && { email: updates.email?.trim() || null }),
        ...(updates.party_type && { party_type: updates.party_type }),
        ...(updates.notes !== undefined && { notes: updates.notes?.trim() || null }),
      })
    });

    if (!response.ok) {
      console.error('Error updating customer:', response.statusText);
      return null;
    }

    const data = await response.json();
    return data.party;
  } catch (error) {
    console.error('Error in updateCustomer:', error);
    return null;
  }
}

/**
 * Get all customers (for dropdown/select)
 */
export async function getAllCustomers(): Promise<CustomerSearchResult[]> {
  try {
    const response = await apiRequest('/parties');
    
    if (!response.ok) {
      console.error('Error getting all customers:', response.statusText);
      return [];
    }

    const data = await response.json();
    
    return (data.parties || []).map((customer: any) => ({
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      address: customer.address,
      displayText: formatCustomerDisplay(customer.name, customer.phone, customer.address)
    }));
  } catch (error) {
    console.error('Error in getAllCustomers:', error);
    return [];
  }
}

/**
 * Format customer for display in dropdown
 */
function formatCustomerDisplay(name: string, phone?: string, address?: string): string {
  let display = name;
  
  if (phone) {
    display += ` - ${phone}`;
  }
  
  if (address) {
    display += ` - ${address}`;
  }
  
  return display;
}

/**
 * Check if customer exists by name
 */
export async function checkCustomerExists(name: string): Promise<CustomerSearchResult | null> {
  try {
    const response = await apiRequest(`/parties/check?name=${encodeURIComponent(name.trim())}`);
    
    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    
    if (!data.party) {
      return null;
    }

    return {
      id: data.party.id,
      name: data.party.name,
      phone: data.party.phone,
      address: data.party.address,
      displayText: formatCustomerDisplay(data.party.name, data.party.phone, data.party.address)
    };
  } catch {
    return null;
  }
}
