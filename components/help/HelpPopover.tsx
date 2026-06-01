'use client';

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { HelpCircle, X, ExternalLink } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface HelpPopoverProps {
  title: string;
  items: string[];
}

// Deve permanecer sincronizado com Tailwind w-72 (18rem = 288px)
const POPOVER_WIDTH = 288;
const VIEWPORT_MARGIN = 16; // margem mínima das bordas

export function HelpPopover({ title, items }: HelpPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const popoverRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const router = useRouter();

  // Calcular posição do popover com proteção de viewport
  const updatePosition = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      
      // Centro ideal do popover (alinhado com o centro do botão)
      const idealCenter = rect.left + rect.width / 2;
      
      // Proteção contra bordas: garante margem mínima de 16px
      const minLeft = POPOVER_WIDTH / 2 + VIEWPORT_MARGIN;
      const maxLeft = viewportWidth - POPOVER_WIDTH / 2 - VIEWPORT_MARGIN;
      
      const left = Math.min(maxLeft, Math.max(minLeft, idealCenter));
      
      setPosition({
        top: rect.bottom + 8, // 8px de margem abaixo do botão
        left,
      });
    }
  };

  // Atualizar posição ao abrir, redimensionar e scrollar
  useEffect(() => {
    if (isOpen) {
      updatePosition();

      window.addEventListener('resize', updatePosition);
      window.addEventListener('scroll', updatePosition, true);
    }

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isOpen]);

  // Fechar ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Fechar com tecla ESC
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
    }

    return () => {
      document.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen]);

  const handleNavigateToHelp = () => {
    setIsOpen(false);
    router.push('/dashboard/ajuda');
  };

  return (
    <div className="relative inline-flex">
      <button
        ref={buttonRef}
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="p-1 rounded-full text-slate-400 hover:text-orange-500 hover:bg-orange-50 transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500/20"
        aria-label={`Ajuda: ${title}`}
        title={`Dicas sobre ${title}`}
      >
        <HelpCircle size={16} />
      </button>

      {isOpen && createPortal(
        <div
          ref={popoverRef}
          style={{
            position: 'fixed',
            top: `${position.top}px`,
            left: `${position.left}px`,
            transform: 'translateX(-50%)',
          }}
          className="z-[9999] w-72 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        >
          {/* Seta indicadora */}
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 rotate-45 bg-white border-l border-t border-slate-200" />

          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b border-slate-100 bg-gradient-to-r from-orange-50 to-white">
            <div className="flex items-center gap-2">
              <HelpCircle size={16} className="text-orange-500" />
              <h3 className="text-sm font-bold text-slate-700">{title}</h3>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(false);
              }}
              className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              aria-label="Fechar ajuda"
            >
              <X size={14} />
            </button>
          </div>

          {/* Items */}
          <div className="p-3 space-y-2">
            {items.map((item, index) => (
              <div key={index} className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-orange-400 mt-1.5 flex-shrink-0" />
                <p className="text-xs text-slate-600 leading-relaxed">{item}</p>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="border-t border-slate-100 p-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleNavigateToHelp();
              }}
              className="w-full flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-medium text-orange-600 hover:text-orange-700 hover:bg-orange-50 rounded-lg transition-colors"
            >
              <ExternalLink size={12} />
              Abrir Central de Ajuda
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}