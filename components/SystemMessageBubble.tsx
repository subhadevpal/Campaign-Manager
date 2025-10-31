import React from 'react';

interface SystemMessageBubbleProps {
  content: string;
}

export const SystemMessageBubble: React.FC<SystemMessageBubbleProps> = ({ content }) => {
  return (
    <div className="flex justify-center items-center my-4 animate-fade-in-up">
      <div className="text-center text-sm text-text-secondary px-4 py-1.5 bg-purple-light/40 rounded-full shadow-inner">
        <p>{content}</p>
      </div>
    </div>
  );
};
