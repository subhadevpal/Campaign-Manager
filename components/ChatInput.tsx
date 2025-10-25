import React, { useState } from 'react';
import { SendIcon } from './Icons';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  isLoading: boolean;
  isSegmentNameSet: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage, isLoading, isSegmentNameSet }) => {
  const [input, setInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      const textarea = (e.currentTarget as HTMLFormElement).querySelector('textarea');
      onSendMessage(input.trim());
      setInput('');
      if (textarea) {
        textarea.style.height = 'auto';
        textarea.style.overflowY = 'hidden';
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as unknown as React.FormEvent);
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    // Auto-grow logic
    e.target.style.height = 'auto';
    const maxHeight = 200; // 200px max-height
    const scrollHeight = e.target.scrollHeight;

    if (scrollHeight > maxHeight) {
      e.target.style.height = `${maxHeight}px`;
      e.target.style.overflowY = 'auto';
    } else {
      e.target.style.height = `${scrollHeight}px`;
      e.target.style.overflowY = 'hidden';
    }
  };

  const placeholderText = isSegmentNameSet
    ? "Generate a Diwali campaign for young professionals..."
    : "Enter segment name...";


  return (
    <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
      <div className="relative">
        <textarea
          value={input}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder={placeholderText}
          className="w-full p-4 pr-16 bg-purple-light border border-purple-secondary/50 rounded-xl focus:ring-2 focus:ring-accent-yellow focus:border-accent-yellow focus:outline-none resize-none text-text-primary placeholder-text-secondary transition-colors text-base"
          rows={1}
          style={{ overflowY: 'hidden' }}
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="absolute bottom-3.5 right-4 p-2.5 rounded-full bg-accent-yellow text-purple-deep hover:opacity-90 disabled:bg-purple-secondary/50 disabled:cursor-not-allowed transition-all"
          aria-label="Send message"
        >
          <SendIcon className="w-5 h-5" />
        </button>
      </div>
    </form>
  );
};
