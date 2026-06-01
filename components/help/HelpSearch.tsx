'use client';

import React, { useState } from 'react';
import { Search, X } from 'lucide-react';

interface HelpSearchProps {
  onSearch: (term: string) => void;
}

export function HelpSearch({ onSearch }: HelpSearchProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const handleChange = (value: string) => {
    setSearchTerm(value);
    onSearch(value);
  };

  const clearSearch = () => {
    setSearchTerm('');
    onSearch('');
  };

  return (
    <div className="relative">
      <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
        <Search size={18} className="text-gray-400" />
      </div>
      
      <input
        type="text"
        value={searchTerm}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="Buscar na Central de Ajuda..."
        className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg text-sm
                  text-gray-800
                  focus:ring-2 focus:ring-orange-500 focus:border-orange-500
                  placeholder-gray-400 bg-white transition-shadow
                  hover:shadow-sm focus:shadow-md"
        aria-label="Buscar na Central de Ajuda"
      />
      
      {searchTerm && (
        <button
          onClick={clearSearch}
          className="absolute inset-y-0 right-3 flex items-center"
          aria-label="Limpar busca"
        >
          <X size={18} className="text-gray-400 hover:text-gray-600 transition-colors" />
        </button>
      )}
    </div>
  );
}