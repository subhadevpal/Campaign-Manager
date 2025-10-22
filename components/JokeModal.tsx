import React from 'react';
// FIX: Replaced MagicWandIcon with SparklesIcon as MagicWandIcon is not an exported member of './Icons'.
import { XIcon, SparklesIcon } from './Icons';

interface JokeModalProps {
  joke: string;
  sources: any[];
  onClose: () => void;
  isLoading: boolean;
}

export const JokeModal: React.FC<JokeModalProps> = ({ joke, sources, onClose, isLoading }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm transition-opacity animate-fade-in">
      <div 
        className="relative bg-purple-primary p-8 rounded-2xl shadow-2xl max-w-lg w-full m-4 border border-purple-secondary/50 transform transition-all animate-scale-in"
        role="dialog"
        aria-modal="true"
        aria-labelledby="joke-title"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-text-secondary hover:text-text-primary transition-colors rounded-full hover:bg-purple-light"
          aria-label="Close joke"
        >
          <XIcon className="w-6 h-6" />
        </button>

        <div className="flex items-center gap-4 mb-6">
          <div className="p-3 bg-accent-yellow/10 rounded-full">
            <SparklesIcon className="w-8 h-8 text-accent-yellow" />
          </div>
          <h2 id="joke-title" className="text-2xl font-bold text-white">Here's a little something!</h2>
        </div>

        <div className="min-h-[100px] flex items-center justify-center">
            {isLoading ? (
                <div className="flex items-center space-x-2" aria-label="Loading joke...">
                    <div className="w-3 h-3 bg-purple-secondary rounded-full animate-pulse"></div>
                    <div className="w-3 h-3 bg-purple-secondary rounded-full animate-pulse delay-75"></div>
                    <div className="w-3 h-3 bg-purple-secondary rounded-full animate-pulse delay-150"></div>
                </div>
            ) : (
                <p className="text-lg text-text-primary/90 leading-relaxed text-center">
                    {joke}
                </p>
            )}
        </div>
        {sources && sources.length > 0 && !isLoading && (
          <div className="mt-6 pt-4 border-t border-purple-secondary/30 text-xs text-text-secondary">
              <h4 className="font-semibold mb-2">Sources:</h4>
              <ul className="list-disc list-inside space-y-1">
                  {sources.map((source, index) => source.web && (
                      <li key={index}>
                          <a 
                              href={source.web.uri} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="hover:text-accent-yellow transition-colors break-all"
                          >
                              {source.web.title || new URL(source.web.uri).hostname}
                          </a>
                      </li>
                  ))}
              </ul>
          </div>
        )}
      </div>
    </div>
  );
};