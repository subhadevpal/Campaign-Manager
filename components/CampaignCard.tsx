import React from 'react';
import type { Campaign } from '../types';
import { CheckCircleIcon } from './Icons';

interface CampaignCardProps {
  campaign: Campaign;
  onApprove: () => void;
  isApproved?: boolean;
  isLoading: boolean;
}

export const CampaignCard: React.FC<CampaignCardProps> = ({ campaign, onApprove, isApproved, isLoading }) => {
  return (
    <div className="space-y-4 text-text-primary">
      <h3 className="text-xl font-bold text-accent-yellow">{campaign.Header}</h3>
      <p className="text-base text-text-primary/90">{campaign.Body}</p>
      
      <div className="border-t border-purple-light/50 pt-3 space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="font-semibold text-text-secondary">Campaign ID:</span>
          <code className="text-accent-teal">{campaign.Campaign_ID}</code>
        </div>
        <div className="flex justify-between">
          <span className="font-semibold text-text-secondary">Campaign Date:</span>
          <span className="text-text-primary/90">{campaign.Campaign_Date}</span>
        </div>
      </div>
      
      <div>
        <h4 className="font-semibold text-text-secondary mb-2">Channels:</h4>
        <div className="flex flex-wrap gap-2">
          {campaign.Channel.map((channel) => (
            <span key={channel} className="px-2.5 py-1 text-xs font-medium bg-purple-light rounded-full text-text-secondary">
              {channel}
            </span>
          ))}
        </div>
      </div>

      <div className="border-t border-purple-light/50 pt-4 mt-4">
        <button
          onClick={onApprove}
          disabled={isApproved || isLoading}
          className={`w-full flex items-center justify-center gap-2 p-2.5 font-bold rounded-lg transition-all shadow-md
            ${isApproved 
              ? 'bg-accent-teal/80 text-white cursor-default' 
              : 'bg-accent-yellow text-purple-deep hover:opacity-90 disabled:bg-accent-yellow/50 disabled:cursor-not-allowed'
            }`}
        >
          <CheckCircleIcon className="w-5 h-5" />
          {isApproved ? 'Approved' : 'Approve'}
        </button>
      </div>
    </div>
  );
};
