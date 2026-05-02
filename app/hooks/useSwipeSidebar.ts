'use client';

import { useEffect } from 'react';

type Props = {
  onOpen: () => void;
  onClose: () => void;
  isOpen: boolean;
};

export function useSwipeSidebar({ onOpen, onClose, isOpen }: Props) {
  useEffect(() => {
    let startX = 0;
    let currentX = 0;
    let touching = false;

    const threshold = 80;

    const handleTouchStart = (e: TouchEvent) => {
      startX = e.touches[0].clientX;
      touching = true;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!touching) return;
      currentX = e.touches[0].clientX;
    };

    const handleTouchEnd = () => {
      if (!touching) return;

      const delta = currentX - startX;

      // swipe direita (abrir) - apenas se começou muito perto da borda esquerda
      if (!isOpen && startX < 40 && delta > threshold) {
        onOpen();
      }

      // swipe esquerda (fechar)
      if (isOpen && delta < -threshold) {
        onClose();
      }

      touching = false;
      startX = 0;
      currentX = 0;
    };

    window.addEventListener('touchstart', handleTouchStart);
    window.addEventListener('touchmove', handleTouchMove);
    window.addEventListener('touchend', handleTouchEnd);

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isOpen, onOpen, onClose]);
}