'use client';

import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { HelpItem } from '../../data/help-content';

interface HelpAccordionProps {
  items: HelpItem[];
  searchTerm?: string;
}

export function HelpAccordion({ items, searchTerm }: HelpAccordionProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleItem = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const highlightText = (text: string, term: string) => {
    if (!term.trim()) return text;
    
    const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escapedTerm})`, 'gi');
    const parts = text.split(regex);
    
    // ✅ CORRIGIDO: Comparação simples sem .test() para evitar bug do lastIndex
    return parts.map((part, index) =>
      part.toLowerCase() === term.toLowerCase() ? (
        <mark
          key={index}
          className="bg-yellow-200 text-gray-900 px-0.5 rounded"
        >
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  if (items.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p className="text-sm">Nenhum resultado encontrado</p>
        <p className="text-xs mt-1">Tente outros termos de busca</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div
          key={item.id}
          className="border border-gray-200 rounded-lg overflow-hidden bg-white hover:border-gray-300 transition-colors"
        >
          <button
            onClick={() => toggleItem(item.id)}
            className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors"
            aria-expanded={expandedId === item.id}
          >
            <span className="text-sm font-medium text-gray-800 pr-4">
              {searchTerm ? highlightText(item.question, searchTerm) : item.question}
            </span>
            <ChevronDown
              size={18}
              className={`text-gray-400 flex-shrink-0 transition-transform duration-200 ${
                expandedId === item.id ? 'rotate-180' : ''
              }`}
            />
          </button>
          
          {expandedId === item.id && (
            <div className="px-4 pb-4">
              <div className="pt-3 border-t border-gray-100">
                <p className="text-sm text-gray-600 leading-relaxed">
                  {searchTerm ? highlightText(item.answer, searchTerm) : item.answer}
                </p>
                
                {item.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {item.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-block px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}