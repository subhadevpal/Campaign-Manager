import React from 'react';
import type { Message, Campaign } from '../types';
import { Sender } from '../types';
import { UserIcon, AIIcon } from './Icons';
import { CampaignCard } from './CampaignCard';

interface MessageBubbleProps {
  message: Message;
  isLoading: boolean;
  onApproveCampaign: (campaign: Campaign, messageId: string) => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isLoading, onApproveCampaign }) => {
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
    <div className={`flex items-end gap-0 ${containerClasses}`}>
      <div className={`flex-shrink-0 ${iconClasses}`}>
        <div className="w-10 h-10 rounded-full bg-purple-secondary flex items-center justify-center shadow-md">
            <Icon className="w-6 h-6 text-text-secondary" />
        </div>
      </div>
      <div className={`max-w-2xl p-5 rounded-2xl shadow-lg ${bubbleClasses} ${textContainerClasses}`}>
        {campaignData ? (
          <CampaignCard 
            campaign={campaignData}
            onApprove={() => onApproveCampaign(campaignData!, message.id)}
            isApproved={message.isApproved}
            isLoading={isLoading}
          />
        ) : (
          <p className="whitespace-pre-wrap text-base">{message.content}</p>
        )}
      </div>
    </div>
  );
};
