import React from 'react';
import type { FunctionCallData } from '../types';
import { CodeIcon } from './Icons';

interface FunctionCallBubbleProps {
  functionCall: FunctionCallData;
}

export const FunctionCallBubble: React.FC<FunctionCallBubbleProps> = ({ functionCall }) => {
  return (
    <div className="flex justify-center items-center my-4">
      <div className="flex items-center gap-3 p-3 bg-accent-yellow/10 border border-accent-yellow/30 text-accent-yellow/90 rounded-lg text-sm shadow-sm">
        <CodeIcon className="w-5 h-5 flex-shrink-0" />
        <div>
          <p className="font-semibold">Calling API: <code className="font-mono">{functionCall.name}</code></p>
          <pre className="text-xs mt-1 bg-accent-yellow/5 p-2 rounded">
            {JSON.stringify(functionCall.args, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
};