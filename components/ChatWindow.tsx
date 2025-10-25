import React, { useEffect, useRef } from 'react';
import type { Message, Campaign } from '../types';
import { MessageBubble } from './MessageBubble';
import { FunctionCallBubble } from './FunctionCallBubble';
import { FunctionResultBubble } from './FunctionResultBubble';
import { MessageType, Sender } from '../types';
import { AIIcon } from './Icons';

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
         <div className="flex items-end gap-0 justify-start animate-fade-in-up">
            <div className="flex-shrink-0 order-1 mr-3">
                <div className="w-10 h-10 rounded-full bg-purple-secondary flex items-center justify-center shadow-md">
                    <AIIcon className="w-6 h-6 text-text-secondary" />
                </div>
            </div>
            <div className="max-w-2xl p-5 rounded-2xl shadow-lg bg-purple-secondary text-text-primary rounded-bl-lg order-2">
                <div className="flex items-center space-x-2">
                    <div className="w-2.5 h-2.5 bg-purple-light rounded-full animate-pulse-bubble"></div>
                    <div className="w-2.5 h-2.5 bg-purple-light rounded-full animate-pulse-bubble" style={{animationDelay: '0.2s'}}></div>
                    <div className="w-2.5 h-2.5 bg-purple-light rounded-full animate-pulse-bubble" style={{animationDelay: '0.4s'}}></div>
                </div>
            </div>
        </div>
      )}
      <div ref={messagesEndRef} />
    </div>
  );
};