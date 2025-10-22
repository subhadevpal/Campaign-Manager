import React from 'react';
import type { Campaign } from '../types';

interface CampaignCardProps {
  campaign: Campaign;
}

export const CampaignCard: React.FC<CampaignCardProps> = ({ campaign }) => {
  return (
    <div className="space-y-4 text-white">
      <h3 className="text-xl font-bold text-accent-yellow">{campaign.Header}</h3>
      <p className="text-base text-white/90">{campaign.Body}</p>
      
      <div className="border-t border-purple-light/50 pt-3 space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="font-semibold text-white/70">Campaign ID:</span>
          <code className="text-accent-teal">{campaign.Campaign_ID}</code>
        </div>
        <div className="flex justify-between">
          <span className="font-semibold text-white/70">Campaign Date:</span>
          <span className="text-white/90">{campaign.Campaign_Date}</span>
        </div>
      </div>
      
      <div>
        <h4 className="font-semibold text-white/70 mb-2">Channels:</h4>
        <div className="flex flex-wrap gap-2">
          {campaign.Channel.map((channel) => (
            <span key={channel} className="px-2.5 py-1 text-xs font-medium bg-purple-light rounded-full text-white/80">
              {channel}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};
