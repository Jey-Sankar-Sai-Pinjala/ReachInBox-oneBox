import React from 'react';

interface FilterBarProps {
  filters: {
    query: string;
    account: string;
    folder: string;
    category: string;
  };
  onFilterChange: (filterType: string, value: string) => void;
  onApplyFilters: () => void;
}

const FilterBar: React.FC<FilterBarProps> = ({ filters, onFilterChange, onApplyFilters }) => {
  const categories = [
    'Interested',
    'Meeting Booked',
    'Not Interested',
    'Spam',
    'Out of Office',
    'Uncategorized'
  ];

  const folders = ['INBOX', 'Sent', 'Drafts', 'Trash'];
  const accounts = ['account1', 'account2'];

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
        <select
          value={filters.category}
          onChange={(e) => onFilterChange('category', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">All Categories</option>
          {categories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Account</label>
        <select
          value={filters.account}
          onChange={(e) => onFilterChange('account', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">All Accounts</option>
          {accounts.map((account) => (
            <option key={account} value={account}>
              {account}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Folder</label>
        <select
          value={filters.folder}
          onChange={(e) => onFilterChange('folder', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">All Folders</option>
          {folders.map((folder) => (
            <option key={folder} value={folder}>
              {folder}
            </option>
          ))}
        </select>
      </div>

      <button
        onClick={onApplyFilters}
        className="w-full bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"
      >
        Apply Filters
      </button>
    </div>
  );
};

export default FilterBar;

