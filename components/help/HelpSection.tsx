'use client';

import React from 'react';
import type { HelpCategory, HelpItem } from '../../data/help-content';

interface HelpSectionProps {
  category: HelpCategory;
  items: HelpItem[];
  children: React.ReactNode;
}

export function HelpSection({ category, items, children }: HelpSectionProps) {
  // ✅ CORRIGIDO: Não retorna null, permite renderizar categorias vazias
  const isEmpty = items.length === 0;

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
        <span className="text-xl" role="img" aria-label={category.title}>
          {category.icon}
        </span>
        <div>
          <h2 className="text-base font-semibold text-gray-800">
            {category.title}
          </h2>
          <p className="text-xs text-gray-500">
            {category.description}
          </p>
        </div>
        {/* ✅ CORRIGIDO: Mostra "Em breve" para categorias vazias */}
        <span className="ml-auto text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
          {isEmpty ? 'Em breve' : `${items.length} ${items.length === 1 ? 'item' : 'itens'}`}
        </span>
      </div>
      
      {children}
    </section>
  );
}