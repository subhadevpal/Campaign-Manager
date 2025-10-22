import React, { useEffect, useRef } from 'react';
import type { Message, Campaign } from '../types';
import { MessageBubble } from './MessageBubble';
import { FunctionCallBubble } from './FunctionCallBubble';
import { FunctionResultBubble } from './FunctionResultBubble';
import { MessageType } from '../types';

interface ChatWindowProps {
  messages: Message[];
  isLoading: boolean;
  onApproveCampaign: (campaign: Campaign, messageId: string) => void;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({ messages, isLoading, onApproveCampaign }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages, isLoading]);

  return (
    <div className="max-w-4xl mx-auto space-y-10">
      {messages.map((msg) => {
        switch (msg.type) {
          case MessageType.FunctionCall:
            return <FunctionCallBubble key={msg.id} functionCall={msg.functionCall!} />;
          case MessageType.FunctionResult:
            return <FunctionResultBubble key={msg.id} functionResult={msg.functionResult!} />;
          default:
            return (
              <MessageBubble 
                key={msg.id} 
                message={msg}
                isLoading={isLoading}
                onApproveCampaign={onApproveCampaign}
              />
            );
        }
      })}
      {isLoading && (
        <div className="flex justify-start">
            <div className="flex items-center space-x-2 pl-12">
                <div className="w-2.5 h-2.5 bg-purple-secondary rounded-full animate-pulse"></div>
                <div className="w-2.5 h-2.5 bg-purple-secondary rounded-full animate-pulse delay-75"></div>
                <div className="w-2.5 h-2.5 bg-purple-secondary rounded-full animate-pulse delay-150"></div>
            </div>
        </div>
      )}
      <div ref={messagesEndRef} />
    </div>
  );
};
