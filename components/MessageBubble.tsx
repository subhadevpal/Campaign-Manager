import React from 'react';
import type { Message, Campaign } from '../types';
import { Sender } from '../types';
import { UserIcon, AIIcon } from './Icons';
import { CampaignCard } from './CampaignCard';

interface MessageBubbleProps {
  message: Message;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
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
    ? 'bg-gradient-to-br from-brand-gradient-start to-brand-gradient-end text-white rounded-br-none'
    : 'bg-purple-secondary text-white/90 rounded-bl-none';

  const containerClasses = isUser ? 'justify-end' : 'justify-start';
  
  const Icon = isUser ? UserIcon : AIIcon;
  const iconClasses = isUser ? 'order-2' : 'order-1';
  const textContainerClasses = isUser ? 'order-1' : 'order-2';

  return (
    <div className={`flex items-start gap-3 ${containerClasses}`}>
      <div className={`flex-shrink-0 ${iconClasses}`}>
        <div className="w-8 h-8 rounded-full bg-purple-secondary flex items-center justify-center shadow-md">
            <Icon className="w-5 h-5 text-white/80" />
        </div>
      </div>
      <div className={`max-w-xl p-4 rounded-lg shadow-md ${bubbleClasses} ${textContainerClasses}`}>
        {campaignData ? (
          <CampaignCard campaign={campaignData} />
        ) : (
          <p className="whitespace-pre-wrap text-base">{message.content}</p>
        )}
      </div>
    </div>
  );
};
