'use client';

import React, { useState, useMemo } from 'react';
import { HelpAccordion } from '../../../components/help/HelpAccordion';
import { HelpSearch } from '../../../components/help/HelpSearch';
import { HelpSection } from '../../../components/help/HelpSection';
import { helpItems, helpCategories } from '../../../data/help-content';
import { CircleHelp, MessageCircle, BookOpen, Calendar } from 'lucide-react';

export default function AjudaPage() {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredItems = useMemo(() => {
    if (!searchTerm.trim()) return helpItems;

    const term = searchTerm.toLowerCase().trim();
    return helpItems.filter(
      (item) =>
        item.question.toLowerCase().includes(term) ||
        item.answer.toLowerCase().includes(term) ||
        item.tags.some((tag) => tag.toLowerCase().includes(term)) ||
        item.category.toLowerCase().includes(term)
    );
  }, [searchTerm]);

  const getItemsByCategory = (categoryId: string) => {
    return filteredItems.filter((item) => item.category === categoryId);
  };

  const hasResults = filteredItems.length > 0;

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header - Adaptado para mobile */}
      <div className="mb-6 md:mb-8">
        <div className="flex items-center gap-2.5 md:gap-3 mb-2 md:mb-3">
          <div className="bg-orange-100 p-2 md:p-2.5 rounded-xl">
            <CircleHelp className="w-6 h-6 text-orange-600 md:w-7 md:h-7" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-800">
              Central de Ajuda
            </h1>
            <p className="text-xs md:text-sm text-gray-500">
              Encontre respostas para suas dúvidas
            </p>
          </div>
        </div>
        
        {/* Metadados */}
        <div className="flex flex-wrap items-center gap-3 mt-2">
          {/* Contador de artigos */}
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <BookOpen className="w-3.5 h-3.5" />
            <span>{helpItems.length} artigos disponíveis</span>
          </div>
          
          {/* Data de atualização */}
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <Calendar className="w-3.5 h-3.5" />
            <span>Atualizado em Junho/2026</span>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6 md:mb-8">
        <HelpSearch onSearch={setSearchTerm} />
      </div>

      {/* Content */}
      {!hasResults ? (
        <div className="text-center py-8 md:py-12">
          <MessageCircle className="w-10 h-10 text-gray-300 mx-auto mb-3 md:w-12 md:h-12 md:mb-4" />
          <h3 className="text-base md:text-lg font-medium text-gray-600 mb-1.5 md:mb-2">
            Nenhum resultado encontrado
          </h3>
          <p className="text-xs md:text-sm text-gray-500">
            Tente usar palavras-chave diferentes ou navegue pelas categorias abaixo
          </p>
        </div>
      ) : searchTerm ? (
        // Modo busca: mostra todos os resultados
        <div className="space-y-4 md:space-y-6">
          {/* ✅ CORRIGIDO: ESLint react/no-unescaped-entities */}
          <p className="text-xs md:text-sm text-gray-500">
            {filteredItems.length}{' '}
            {filteredItems.length === 1
              ? 'resultado encontrado'
              : 'resultados encontrados'}{' '}
            para <span className="font-medium">{searchTerm}</span>
          </p>
          <HelpAccordion items={filteredItems} searchTerm={searchTerm} />
        </div>
      ) : (
        // Modo normal: agrupado por categorias
        <div className="space-y-6 md:space-y-8">
          {helpCategories.map((category) => {
            const categoryItems = getItemsByCategory(category.id);
            
            return (
              <HelpSection
                key={category.id}
                category={category}
                items={categoryItems}
              >
                {categoryItems.length > 0 ? (
                  <HelpAccordion items={categoryItems} />
                ) : (
                  <div className="text-center py-4 md:py-6 text-gray-400 bg-gray-50 rounded-lg">
                    <p className="text-xs md:text-sm">Conteúdo em desenvolvimento</p>
                    <p className="text-[10px] md:text-xs mt-1">
                      Em breve teremos artigos sobre {category.title.toLowerCase()}
                    </p>
                  </div>
                )}
              </HelpSection>
            );
          })}
        </div>
      )}

      {/* Footer - Espaçamento reduzido no mobile */}
      <div className="mt-8 md:mt-12 pt-4 md:pt-6 border-t border-gray-200">
        <div className="bg-orange-50 rounded-lg p-3 md:p-4">
          <div className="flex items-start gap-2.5 md:gap-3">
            <MessageCircle className="w-[18px] h-[18px] text-orange-600 mt-0.5 md:w-5 md:h-5" />
            <div>
              <h4 className="text-xs md:text-sm font-medium text-orange-800">
                Não encontrou o que procurava?
              </h4>
              <p className="text-[10px] md:text-xs text-orange-600 mt-0.5 md:mt-1">
                Se a dúvida não estiver nesta Central de Ajuda, procure o 
                Coordenador de Farmácia ou a Coordenação do Encontro.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}