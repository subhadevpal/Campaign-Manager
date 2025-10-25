import React from 'react';
import type { FunctionCallData } from '../types';
import { CodeIcon } from './Icons';

interface FunctionCallBubbleProps {
  functionCall: FunctionCallData;
}

export const FunctionCallBubble: React.FC<FunctionCallBubbleProps> = ({ functionCall }) => {
  return (
    <div className="flex justify-center items-center my-4 animate-fade-in-up">
      <div className="flex items-center gap-3 p-3 bg-purple-light/50 border border-purple-secondary/50 text-text-secondary rounded-lg text-sm shadow-sm w-full max-w-2xl">
        <CodeIcon className="w-5 h-5 flex-shrink-0 text-accent-yellow" />
        <div className="overflow-x-auto">
          <p className="font-semibold text-text-primary">Calling API: <code className="font-mono text-accent-yellow">{functionCall.name}</code></p>
          <pre className="text-xs mt-1 bg-purple-deep/50 p-2 rounded custom-scrollbar">
            {JSON.stringify(functionCall.args, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
};