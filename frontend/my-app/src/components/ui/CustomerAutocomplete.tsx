'use client';

import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, User, Phone, MapPin, Check } from 'lucide-react';
import { 
  searchCustomers, 
  createCustomer, 
  getCustomerById,
  CustomerSearchResult,
  CreateCustomerData 
} from '@/lib/customer-service';
import { toast } from 'sonner';

interface CustomerAutocompleteProps {
  value: {
    name: string;
    phone?: string;
    address?: string;
    customerId?: string;
  };
  onChange: (customer: {
    name: string;
    phone?: string;
    address?: string;
    customerId?: string;
  }) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
  actionType?: 'buy' | 'sell';
}

export function CustomerAutocomplete({
  value,
  onChange,
  placeholder = "Search customer or type new name...",
  required = false,
  className = "",
  actionType
}: CustomerAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState(value.name || '');
  const [searchResults, setSearchResults] = useState<CustomerSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showNewCustomerDialog, setShowNewCustomerDialog] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // New customer form state
  const [newCustomerData, setNewCustomerData] = useState<CreateCustomerData>({
    name: '',
    phone: '',
    address: '',
    party_type: 'both'
  });

  // Update search term when value changes from parent
  useEffect(() => {
    if (value.name !== searchTerm) {
      setSearchTerm(value.name || '');
    }
  }, [value.name, searchTerm]);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (searchTerm.trim().length < 2) {
      setSearchResults([]);
      setIsOpen(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setIsLoading(true);
      try {
        const results = await searchCustomers(searchTerm);
        setSearchResults(results);
        setIsOpen(results.length > 0 || searchTerm.trim().length >= 2); // Show dropdown even if no results
        setSelectedIndex(-1);
      } catch (error) {
        console.error('Search error:', error);
        setSearchResults([]);
        setIsOpen(true); // Still show dropdown for manual entry
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [searchTerm]);

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearchTerm(newValue);
    
    // If user is typing, clear the selected customer
    if (newValue !== value.name) {
      onChange({
        name: newValue,
        phone: undefined,
        address: undefined,
        customerId: undefined
      });
    }
  };

  // Handle customer selection
  const handleSelectCustomer = async (customer: CustomerSearchResult) => {
    setSearchTerm(customer.name);
    setIsOpen(false);
    setSelectedIndex(-1);

    // Get full customer details
    const fullCustomer = await getCustomerById(customer.id);
    
    onChange({
      name: customer.name,
      phone: customer.phone || '',
      address: customer.address || '',
      customerId: customer.id
    });

    if (fullCustomer) {
      toast.success(`Selected: ${fullCustomer.name}${fullCustomer.phone ? ` - ${fullCustomer.phone}` : ''}`);
    }
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || searchResults.length === 0) {
      if (e.key === 'Enter' && searchTerm.trim() && !value.customerId) {
        e.preventDefault();
        handleCreateNewCustomer();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < searchResults.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < searchResults.length) {
          handleSelectCustomer(searchResults[selectedIndex]);
        } else if (searchTerm.trim()) {
          handleCreateNewCustomer();
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSelectedIndex(-1);
        break;
    }
  };

  // Handle creating new customer
  const handleCreateNewCustomer = () => {
    const customerName = searchTerm.trim() || '';
    
    setNewCustomerData({
      name: customerName,
      phone: '',
      address: '',
      party_type: actionType === 'buy' ? 'seller' : actionType === 'sell' ? 'buyer' : 'both' as const
    });
    
    setShowNewCustomerDialog(true);
    setIsOpen(false); // Close the dropdown when opening the dialog
  };

  // Submit new customer
  const handleSubmitNewCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const trimmedName = newCustomerData.name.trim();
    if (!trimmedName) {
      toast.error('Customer name is required');
      return;
    }

    try {
      const customerToCreate = {
        ...newCustomerData,
        name: trimmedName,
        phone: newCustomerData.phone?.trim() || '',
        address: newCustomerData.address?.trim() || ''
      };
      
      const customer = await createCustomer(customerToCreate);
      
      if (customer) {
        // Update the form with new customer data
        onChange({
          name: customer.name,
          phone: customer.phone || '',
          address: customer.address || '',
          customerId: customer.id
        });
        
        setSearchTerm(customer.name);
        setShowNewCustomerDialog(false);
        setIsOpen(false);
        
        const customerInfo = customer.phone || customer.address 
          ? ` (${[customer.phone, customer.address].filter(Boolean).join(' - ')})`
          : '';
        
        toast.success(`New customer "${customer.name}"${customerInfo} added successfully!`);
      } else {
        toast.error('Failed to create customer. Please try again.');
      }
    } catch (error) {
      console.error('Error creating customer:', error);
      toast.error('Failed to create customer. Please try again.');
    }
  };

  // Auto-focus on dialog open
  useEffect(() => {
    if (showNewCustomerDialog) {
      // Small delay to ensure dialog is rendered
      const timer = setTimeout(() => {
        const nameInput = document.querySelector('input[placeholder="Enter customer name"]') as HTMLInputElement;
        if (nameInput) {
          nameInput.focus();
          // Pre-fill with search term if available and name field is empty
          if (searchTerm.trim() && !newCustomerData.name) {
            setNewCustomerData(prev => ({ ...prev, name: searchTerm.trim() }));
          }
        }
      }, 150);
      
      return () => clearTimeout(timer);
    }
  }, [showNewCustomerDialog, searchTerm, newCustomerData.name]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current && 
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSelectedIndex(-1);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <>
      <div className={`relative ${className}`}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            ref={inputRef}
            value={searchTerm}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              if (searchResults.length > 0 || searchTerm.trim().length >= 2) {
                setIsOpen(true);
              }
            }}
            placeholder={placeholder}
            required={required}
            className="pl-10 pr-20"
          />
          {value.customerId && (
            <Check className="absolute right-20 top-1/2 transform -translate-y-1/2 text-green-600 w-4 h-4" />
          )}
          {value.customerId ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                onChange({
                  name: '',
                  phone: undefined,
                  address: undefined,
                  customerId: undefined
                });
                setSearchTerm('');
              }}
              className="absolute right-12 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 text-red-600 hover:bg-red-50"
              title="Clear selection"
            >
              ×
            </Button>
          ) : null}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleCreateNewCustomer}
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 hover:bg-gray-100 z-10"
            title="Add new customer"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        {/* Search Results Dropdown */}
        {isOpen && (
          <div
            ref={dropdownRef}
            className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto"
          >
            {isLoading ? (
              <div className="p-3 text-center text-gray-500">
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  <span>Searching...</span>
                </div>
              </div>
            ) : searchResults.length > 0 ? (
              <>
                {searchResults.map((customer, index) => (
                  <div
                    key={customer.id}
                    className={`p-3 cursor-pointer border-b border-gray-100 last:border-b-0 hover:bg-blue-50 ${
                      index === selectedIndex ? 'bg-blue-50' : ''
                    }`}
                    onClick={() => handleSelectCustomer(customer)}
                  >
                    <div className="flex items-center space-x-2">
                      <User className="w-4 h-4 text-gray-500" />
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{customer.name}</div>
                        <div className="text-sm text-gray-500 flex items-center space-x-3">
                          {customer.phone && (
                            <span className="flex items-center space-x-1">
                              <Phone className="w-3 h-3" />
                              <span>{customer.phone}</span>
                            </span>
                          )}
                          {customer.address && (
                            <span className="flex items-center space-x-1">
                              <MapPin className="w-3 h-3" />
                              <span>{customer.address}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                
                {/* Add New Customer Option */}
                <div
                  className={`p-3 cursor-pointer border-t border-gray-200 hover:bg-green-50 ${
                    selectedIndex === searchResults.length ? 'bg-green-50' : ''
                  }`}
                  onClick={handleCreateNewCustomer}
                >
                  <div className="flex items-center space-x-2 text-green-600">
                    <Plus className="w-4 h-4" />
                    <span className="font-medium">Add &quot;{searchTerm}&quot; as new customer</span>
                  </div>
                </div>
              </>
            ) : searchTerm.trim().length >= 2 ? (
              <div className="p-3">
                <div className="text-center text-gray-500 mb-2">No customers found</div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCreateNewCustomer}
                  className="w-full text-green-600 border-green-600 hover:bg-green-50"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add &quot;{searchTerm}&quot; as new customer
                </Button>
              </div>
            ) : null}
          </div>
        )}

        {/* Customer Info Display */}
        {value.customerId && (value.phone || value.address) && (
          <Card className="mt-2 bg-green-50 border-green-200">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    Existing Customer
                  </Badge>
                  <span className="text-sm text-gray-600">
                    {value.phone && (
                      <span className="flex items-center space-x-1">
                        <Phone className="w-3 h-3" />
                        <span>{value.phone}</span>
                      </span>
                    )}
                  </span>
                </div>
              </div>
              {value.address && (
                <div className="mt-1 text-sm text-gray-600 flex items-center space-x-1">
                  <MapPin className="w-3 h-3" />
                  <span>{value.address}</span>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* New Customer Dialog */}
      <Dialog open={showNewCustomerDialog} onOpenChange={(open) => {
        setShowNewCustomerDialog(open);
        if (!open) {
          // Reset form when dialog closes
          setNewCustomerData({
            name: '',
            phone: '',
            address: '',
            party_type: 'both'
          });
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Customer</DialogTitle>
            <p className="text-sm text-gray-600">
              Fill in the customer details. Only name is required, other fields help identify the customer in future transactions.
            </p>
          </DialogHeader>
          
          <form onSubmit={handleSubmitNewCustomer} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Customer Name *</label>
              <Input
                value={newCustomerData.name}
                onChange={(e) => setNewCustomerData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter customer name"
                required
                autoFocus
                className="focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Phone Number</label>
              <Input
                value={newCustomerData.phone}
                onChange={(e) => setNewCustomerData(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="Enter phone number"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Address/Location</label>
              <Input
                value={newCustomerData.address}
                onChange={(e) => setNewCustomerData(prev => ({ ...prev, address: e.target.value }))}
                placeholder="e.g., Chak No 08, Village Name"
              />
            </div>

            <div className="flex space-x-2 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setShowNewCustomerDialog(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                className="flex-1"
                disabled={!newCustomerData.name.trim()}
              >
                Add Customer
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
