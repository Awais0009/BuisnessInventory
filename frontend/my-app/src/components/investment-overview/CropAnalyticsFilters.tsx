import React, { useRef, useState } from 'react';

export interface CropAnalyticsFiltersProps {
  crops: string[];
  selectedCrops: string[];
  onCropsChange: (crops: string[]) => void;
  dateRange: { start: Date|null; end: Date|null };
  onDateRangeChange: (range: { start: Date|null; end: Date|null }) => void;
  transactionType: 'both' | 'buy' | 'sell';
  onTransactionTypeChange: (type: 'both' | 'buy' | 'sell') => void;
  cropSearch: string;
  onCropSearchChange: (val: string) => void;
  onClear: () => void;
}

export const CropAnalyticsFilters: React.FC<CropAnalyticsFiltersProps> = ({
  crops,
  selectedCrops,
  onCropsChange,
  dateRange,
  onDateRangeChange,
  transactionType,
  onTransactionTypeChange,
  cropSearch,
  onCropSearchChange,
  onClear,
}) => {
  const searchRef = useRef<HTMLInputElement>(null);
  const [inputValue, setInputValue] = useState(cropSearch);
  const [inputError, setInputError] = useState('');
  const [activeQuick, setActiveQuick] = useState<string | null>(null);

  // Case-insensitive crop add
  const handleAddCrop = () => {
    const crop = inputValue.trim();
    if (!crop) return;
    const foundCrop = crops.find(c => c.toLowerCase() === crop.toLowerCase());
    if (!foundCrop) {
      setInputError('Crop not found');
      return;
    }
    if (selectedCrops.includes(foundCrop)) {
      setInputError('Already selected');
      return;
    }
    onCropsChange([...selectedCrops, foundCrop]);
    setInputValue('');
    setInputError('');
    onCropSearchChange('');
    if (searchRef.current) searchRef.current.focus();
  };

  // Handle Enter key
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddCrop();
    }
  };

  // Add all crops
  const handleAddAll = () => {
    onCropsChange([...crops]);
    setInputValue('');
    setInputError('');
    onCropSearchChange('');
  };

  // Handle crop remove
  const handleRemoveCrop = (crop: string) => {
    onCropsChange(selectedCrops.filter(c => c !== crop));
  };

  // Quick date range buttons
  const today = new Date();
  const setQuickRange = (months: number) => {
    const end = new Date(today);
    const start = new Date(today);
    start.setMonth(start.getMonth() - months);
    onDateRangeChange({ start, end });
    setActiveQuick(months === 1 ? '1m' : '2m');
  };
  const setYearRange = () => {
    const end = new Date(today);
    const start = new Date(today);
    start.setFullYear(start.getFullYear() - 1);
    onDateRangeChange({ start, end });
    setActiveQuick('y');
  };

  return (
    <div className="p-4 bg-white rounded shadow mb-6 flex flex-wrap gap-4 items-end min-h-[120px]">
      {/* Crop Multi-select with Chips, no dropdown */}
      <div className="min-w-[320px]">
        <label className="block text-xs font-medium mb-1">Crops</label>
        <div className="flex gap-2 items-center mb-2">
          <input
            ref={searchRef}
            type="text"
            value={inputValue}
            onChange={e => {
              setInputValue(e.target.value);
              setInputError('');
              onCropSearchChange(e.target.value);
            }}
            onKeyDown={handleKeyDown}
            className="border px-2 py-2 rounded w-full text-base"
            placeholder="Type crop name and press Enter..."
            autoComplete="off"
          />
          <button
            type="button"
            className="bg-green-500 text-white px-4 py-2 rounded text-base hover:bg-green-600"
            onClick={handleAddCrop}
            tabIndex={-1}
          >
            Add
          </button>
          <button
            type="button"
            className="bg-blue-500 text-white px-6 py-2 rounded text-base hover:bg-blue-600"
            onClick={handleAddAll}
            tabIndex={-1}
            style={{ minWidth: '110px', height: '40px', lineHeight: '1' }}
          >
            Add All
          </button>
        </div>
        {inputError && <div className="text-xs text-red-500 mt-1">{inputError}</div>}
        <div className="flex flex-wrap gap-1 min-h-[32px] mt-2">
          {selectedCrops.map(crop => (
            <span key={crop} className="flex items-center bg-green-100 text-green-800 rounded-full px-2 py-0.5 text-xs font-medium mr-1 mb-1">
              {crop}
              <button
                type="button"
                className="ml-1 text-green-600 hover:text-red-500 focus:outline-none"
                onClick={() => handleRemoveCrop(crop)}
                aria-label={`Remove ${crop}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      </div>
      {/* Date Picker + Quick Range */}
      <div>
        <label className="block text-xs font-medium mb-1">Date Range</label>
        <div className="flex gap-1 items-center mb-1">
          <input type="date" value={dateRange.start ? dateRange.start.toISOString().slice(0,10) : ''} onChange={e => {onDateRangeChange({ ...dateRange, start: e.target.value ? new Date(e.target.value) : null }); setActiveQuick(null);}} className="border px-2 py-1 rounded" />
          <span>-</span>
          <input type="date" value={dateRange.end ? dateRange.end.toISOString().slice(0,10) : ''} onChange={e => {onDateRangeChange({ ...dateRange, end: e.target.value ? new Date(e.target.value) : null }); setActiveQuick(null);}} className="border px-2 py-1 rounded" />
        </div>
        <div className="flex gap-1">
          <button type="button" className={`px-2 py-1 rounded text-xs ${activeQuick === '1m' ? 'bg-blue-500 text-white' : 'bg-gray-200 hover:bg-gray-300'}`} onClick={() => setQuickRange(1)}>1 Month</button>
          <button type="button" className={`px-2 py-1 rounded text-xs ${activeQuick === '2m' ? 'bg-blue-500 text-white' : 'bg-gray-200 hover:bg-gray-300'}`} onClick={() => setQuickRange(2)}>2 Months</button>
          <button type="button" className={`px-2 py-1 rounded text-xs ${activeQuick === 'y' ? 'bg-blue-500 text-white' : 'bg-gray-200 hover:bg-gray-300'}`} onClick={setYearRange}>Year</button>
        </div>
      </div>
      {/* Transaction Type */}
      <div>
        <label className="block text-xs font-medium mb-1">Type</label>
        <select value={transactionType} onChange={e => onTransactionTypeChange(e.target.value as any)} className="border px-2 py-1 rounded">
          <option value="both">Both</option>
          <option value="buy">Buy</option>
          <option value="sell">Sell</option>
        </select>
      </div>
      {/* Clear All */}
      <div>
        <button type="button" onClick={() => { onClear(); onCropsChange([]); }} className="bg-gray-200 px-4 py-2 rounded text-base hover:bg-gray-300">Clear All</button>
      </div>
    </div>
  );
}; 