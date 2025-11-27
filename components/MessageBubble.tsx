
import React from 'react';
import type { Message, Campaign } from '../types';
import { Sender } from '../types';
import { UserIcon, AIIcon } from './Icons';
import { CampaignCard } from './CampaignCard';

interface MessageBubbleProps {
  message: Message;
  isLoading: boolean;
  onApproveCampaign: (campaign: Campaign, messageId: string) => void;
  onRegenerateCampaign: (messageId: string) => void;
  onSendMessage: (message: string) => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isLoading, onApproveCampaign, onRegenerateCampaign, onSendMessage }) => {
  const isUser = message.sender === Sender.User;
  const isAI = message.sender === Sender.AI;

  let campaignData: Campaign | null = null;
  
  if (isAI) {
    try {
      const parsed = JSON.parse(message.content);
      if (parsed.output && Array.isArray(parsed.output) && parsed.output.length > 0 && parsed.output[0].Campaign_ID) {
        campaignData = parsed.output[0];
      }
    } catch (e) {
      // Content is not a valid campaign JSON, treat as plain text.
    }
  }

  const bubbleClasses = isUser
    ? 'bg-gradient-to-br from-brand-gradient-start to-brand-gradient-end text-white rounded-2xl rounded-br-lg'
    : 'bg-purple-secondary text-text-primary rounded-2xl rounded-bl-lg';

  const containerClasses = isUser ? 'justify-end' : 'justify-start';
  
  const Icon = isUser ? UserIcon : AIIcon;
  const iconClasses = isUser ? 'order-2 ml-3' : 'order-1 mr-3';
  const textContainerClasses = isUser ? 'order-1' : 'order-2';

  return (
    <div className={`flex items-end gap-0 ${containerClasses} animate-fade-in-up`}>
      <div className={`flex-shrink-0 ${iconClasses}`}>
        <div className="w-10 h-10 rounded-full bg-purple-secondary flex items-center justify-center shadow-md">
            <Icon className="w-6 h-6 text-text-secondary" />
        </div>
      </div>
      <div className={`max-w-2xl ${textContainerClasses}`}>
        <div className={`p-5 rounded-2xl shadow-lg ${bubbleClasses}`}>
          {campaignData ? (
            <CampaignCard 
              campaign={campaignData}
              onApprove={() => onApproveCampaign(campaignData!, message.id)}
              onRegenerate={() => onRegenerateCampaign(message.id)}
              isApproved={message.isApproved}
              isLoading={isLoading}
            />
          ) : (
            <p className="whitespace-pre-wrap text-base">{message.content}</p>
          )}
        </div>
        
        {/* Render Options if available */}
        {message.options && message.options.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
            {message.options.map((option, index) => (
              <button
                key={index}
                onClick={() => onSendMessage(option.value)}
                disabled={isLoading}
                className="px-4 py-2 bg-purple-light border border-purple-secondary/50 rounded-full text-sm font-medium text-text-primary hover:bg-accent-yellow hover:text-purple-deep hover:border-accent-yellow transition-all duration-200 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {option.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};