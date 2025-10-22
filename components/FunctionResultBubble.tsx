import React from 'react';
import type { FunctionResultData } from '../types';
import { CheckCircleIcon } from './Icons';

interface FunctionResultBubbleProps {
  functionResult: FunctionResultData;
}

export const FunctionResultBubble: React.FC<FunctionResultBubbleProps> = ({ functionResult }) => {
  return (
    <div className="flex justify-center items-center my-4">
      <div className="flex items-center gap-3 p-3 bg-purple-light/50 border border-purple-secondary/50 text-text-secondary rounded-lg text-sm shadow-sm w-full max-w-2xl">
        <CheckCircleIcon className="w-5 h-5 flex-shrink-0 text-accent-teal" />
        <div className="overflow-x-auto">
          <p className="font-semibold text-text-primary">API Response from <code className="font-mono text-accent-teal">{functionResult.name}</code></p>
          <pre className="text-xs mt-1 bg-purple-deep/50 p-2 rounded custom-scrollbar">
            {JSON.stringify(functionResult.result, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
};
