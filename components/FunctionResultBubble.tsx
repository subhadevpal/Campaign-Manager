import React from 'react';
import type { FunctionResultData } from '../types';
import { CheckCircleIcon } from './Icons';

interface FunctionResultBubbleProps {
  functionResult: FunctionResultData;
}

export const FunctionResultBubble: React.FC<FunctionResultBubbleProps> = ({ functionResult }) => {
  return (
    <div className="flex justify-center items-center my-4">
      <div className="flex items-center gap-3 p-3 bg-accent-teal/10 border border-accent-teal/30 text-accent-teal/90 rounded-lg text-sm shadow-sm max-w-xl overflow-x-auto">
        <CheckCircleIcon className="w-5 h-5 flex-shrink-0" />
        <div>
          <p className="font-semibold">API Response from <code className="font-mono">{functionResult.name}</code></p>
          <pre className="text-xs mt-1 bg-accent-teal/5 p-2 rounded">
            {JSON.stringify(functionResult.result, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
};