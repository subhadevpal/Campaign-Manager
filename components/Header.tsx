import React from 'react';
import { PixelPulseLogo, MenuIcon, RestoreIcon } from './Icons';

interface HeaderProps {
    onMenuClick: () => void;
    onRestore: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onMenuClick, onRestore }) => {
  return (
    <header className="bg-purple-deep/70 backdrop-blur-lg sticky top-0 z-30 border-b border-purple-secondary/20">
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          <div className="flex items-center gap-4">
            <button onClick={onMenuClick} className="p-2 text-text-secondary hover:text-text-primary transition-colors rounded-lg hover:bg-purple-light/50" aria-label="Open customer profile menu">
                <MenuIcon className="h-6 w-6" />
            </button>
            <PixelPulseLogo />
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onRestore} className="p-2 text-text-secondary hover:text-text-primary transition-colors rounded-lg hover:bg-purple-light/50" aria-label="Restore last checkpoint">
                <RestoreIcon className="h-6 w-6" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};