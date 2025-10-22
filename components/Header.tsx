import React from 'react';
import { SparklesIcon, MenuIcon } from './Icons';

interface HeaderProps {
    onMenuClick: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  return (
    <header className="bg-purple-primary shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-br from-brand-gradient-start to-brand-gradient-end p-2 rounded-lg shadow-md">
              <SparklesIcon className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-xl font-bold text-white tracking-wide">Campaign Genius</h1>
          </div>
          <button onClick={onMenuClick} className="md:hidden p-2 text-white/80 hover:text-white transition-colors" aria-label="Open customer profile menu">
            <MenuIcon className="h-6 w-6" />
          </button>
        </div>
      </div>
    </header>
  );
};