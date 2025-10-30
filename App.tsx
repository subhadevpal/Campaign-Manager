
import React, { useState } from 'react';
import { Header } from './components/Header';
import { ChatInput } from './components/ChatInput';
import { ChatWindow } from './components/ChatWindow';
import { CustomerProfileForm } from './components/CustomerProfileForm';
import { useChat } from './hooks/useChat';
import type { CampaignParameters, Message, Campaign } from './types';
import { sendDataToWebhook, analyzePromptWithAI, sendApprovalToWebhook, generateApprovalMessage, validateUserInput } from './services/geminiService';
import { Sender, MessageType } from './types';

const AGE_RANGE_REGEX = /"?\d+"?\s*(to|-)\s*"?\d+"?/i;
const HAS_NUMBER_REGEX = /\d+/;

const isValidAge = (age: string): boolean => {
  if (!age || age.trim() === '') {
    return true; // Empty is valid
  }
  const trimmedAge = age.trim();

  // If it contains a clear range, it's valid.
  if (AGE_RANGE_REGEX.test(trimmedAge)) {
    return true;
  }
  
  // If it contains numbers but NOT a range, it's invalid.
  if (HAS_NUMBER_REGEX.test(trimmedAge)) {
    return false;
  }
  
  // If it has no numbers, we treat it as not specifying an age and don't flag an error.
  return true;
};


function App() {
  const { messages, addMessage, isLoading, setIsLoading, updateMessage, createCheckpoint, restoreCheckpoint } = useChat();
  const [campaignParams, setCampaignParams] = useState<CampaignParameters>({
    segmentName: '',
    campaignType: '',
    merchantCategory: '',
    age: '',
    gender: '',
    userType: '',
    incomeBracket: '',
    daysOnboarded: '',
    specialFestiveSeason: '',
  });
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  
  const handleSendMessage = async (text: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      sender: Sender.User,
      type: MessageType.Text,
      content: text,
    };
    addMessage(userMessage);
    setIsLoading(true);

    try {
      if (!campaignParams.segmentName) {
        // STATE 1: WAITING FOR SEGMENT NAME
        const validation = await validateUserInput(text, 'segment_name');

        if (!validation.isValid) {
          const aiResponse: Message = {
            id: `${Date.now()}-invalid-segment`,
            sender: Sender.AI,
            type: MessageType.Text,
            content: validation.feedback || "I'm sorry, I'm not sure I understand. Could you please provide a name for your customer segment? For example, 'Frequent Travelers' or 'Young Professionals'.",
          };
          addMessage(aiResponse);
          return;
        }
        
        setCampaignParams(prev => ({ ...prev, segmentName: text }));
        const aiResponse: Message = {
          id: `${Date.now()}-segment-set`,
          sender: Sender.AI,
          type: MessageType.Text,
          content: `Great! The segment is named "${text}". Now, please specify if this is an 'activation' or a 'retention' campaign.`,
        };
        addMessage(aiResponse);

      } else if (!campaignParams.campaignType) {
        // STATE 2: WAITING FOR CAMPAIGN TYPE
        const lowercasedText = text.toLowerCase().trim();
        const extractedType = lowercasedText.includes('activation') 
            ? 'activation' 
            : lowercasedText.includes('retention') 
            ? 'retention' 
            : '';

        if (extractedType) {
            setCampaignParams(prev => ({ ...prev, campaignType: extractedType }));
            const aiResponse: Message = {
                id: `${Date.now()}-type-set`,
                sender: Sender.AI,
                type: MessageType.Text,
                content: `Perfect, this is an '${extractedType}' campaign. Now, please describe your marketing campaign, including details about your target audience, offers, or occasions. For example, 'a Diwali offer for shoppers' or 'cashback for movie lovers'.`
            };
            addMessage(aiResponse);
        } else {
            const aiResponse: Message = {
                id: `${Date.now()}-invalid-type`,
                sender: Sender.AI,
                type: MessageType.Text,
                content: "My apologies, that doesn't seem to be a valid campaign type. Please specify if this is an 'activation' or 'retention' campaign."
            };
            addMessage(aiResponse);
        }
      } else {
        // STATE 3: WAITING FOR CAMPAIGN DETAILS
        const validation = await validateUserInput(text, 'campaign_details');

        if (!validation.isValid) {
          const aiResponse: Message = {
            id: `${Date.now()}-invalid-details`,
            sender: Sender.AI,
            type: MessageType.Text,
            content: validation.feedback || "My apologies, that doesn't look like a campaign description. Could you tell me about the campaign you have in mind? For instance, 'A Diwali offer for new customers'.",
          };
          addMessage(aiResponse);
          return;
        }

        createCheckpoint();
        
        const extractedPartialParams = await analyzePromptWithAI(text);
        
        // Filter out empty/null values from AI extraction to prevent overwriting existing valid params
        const updatedParams = Object.fromEntries(
            Object.entries(extractedPartialParams).filter(([, v]) => v != null && v !== '')
        );
        const currentParams = { ...campaignParams, ...updatedParams };
        setCampaignParams(currentParams);


        const errors: string[] = [];
        
        if (currentParams.age && !isValidAge(String(currentParams.age))) {
          errors.push('Age format is invalid. Please use a range (e.g., "34 to 45"). Single numbers are not permitted.');
        }
        
        const validIncomes: Array<CampaignParameters['incomeBracket'] | undefined> = ['High', 'Low', 'Medium', ''];
        if (currentParams.incomeBracket && !validIncomes.includes(currentParams.incomeBracket)) {
          errors.push(`Income bracket is invalid. Please use "High", "Low", or "Medium".`);
        }

        const validCampaignTypes: Array<CampaignParameters['campaignType']> = ['activation', 'retention'];
        if (currentParams.campaignType && !validCampaignTypes.includes(currentParams.campaignType)) {
          errors.push(`Campaign Type is invalid. It must be 'activation' or 'retention'.`);
        }

        if (errors.length > 0) {
            const aiResponse: Message = {
              id: `${Date.now()}-invalid-params`,
              sender: Sender.AI,
              type: MessageType.Text,
              content: `I noticed some issues with the details you provided. Could you please correct them?\n\n- ${errors.join('\n- ')}`,
            };
            addMessage(aiResponse);
            return;
        }
        
        const webhookResponse = await sendDataToWebhook(currentParams);
        const aiResponse: Message = {
          id: `${Date.now()}-webhook-response`,
          sender: Sender.AI,
          type: MessageType.Text,
          content: typeof webhookResponse === 'object' 
                   ? JSON.stringify(webhookResponse, null, 2) 
                   : String(webhookResponse),
        };
        addMessage(aiResponse);
      }
    } catch (error) {
       const errorMessage: Message = {
        id: `${Date.now()}-error`,
        sender: Sender.System,
        type: MessageType.Text,
        content: `An error occurred: ${(error as Error).message}`,
      };
      addMessage(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleProfileSubmit = async () => {
    if (!campaignParams.segmentName.trim()) {
      const errorMessage: Message = {
        id: `${Date.now()}-validation-error`,
        sender: Sender.System,
        type: MessageType.Text,
        content: `Error: Segment Name is a required field.`,
      };
      addMessage(errorMessage);
      return;
    }
    
    if (!campaignParams.campaignType) {
      const errorMessage: Message = {
        id: `${Date.now()}-validation-error-campaign-type`,
        sender: Sender.System,
        type: MessageType.Text,
        content: `Error: Campaign Type is a required field.`,
      };
      addMessage(errorMessage);
      return;
    }

    if (campaignParams.age && !isValidAge(campaignParams.age)) {
      const errorMessage: Message = {
        id: `${Date.now()}-validation-error-age`,
        sender: Sender.System,
        type: MessageType.Text,
        content: `Error: Age format is invalid. Please use a range (e.g., "34 to 45") or leave it blank. Single numbers are not permitted.`,
      };
      addMessage(errorMessage);
      return;
    }

    createCheckpoint();
    setIsLoading(true);

    try {
      const webhookResponse = await sendDataToWebhook(campaignParams);
      const aiResponse: Message = {
        id: `${Date.now()}-webhook-response`,
        sender: Sender.AI,
        type: MessageType.Text,
        content: typeof webhookResponse === 'object' 
                 ? JSON.stringify(webhookResponse, null, 2) 
                 : String(webhookResponse),
      };
      addMessage(aiResponse);
      setIsProfileOpen(false); // Close sidebar on mobile after submission
    } catch (error) {
       const errorMessage: Message = {
        id: `${Date.now()}-webhook-error`,
        sender: Sender.System,
        type: MessageType.Text,
        content: `Error: ${(error as Error).message}`,
      };
      addMessage(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApproveCampaign = async (campaign: Campaign, messageId: string) => {
    setIsLoading(true);
    const approvingMessage: Message = {
      id: `${Date.now()}-approving`,
      sender: Sender.System,
      type: MessageType.Text,
      content: `Approving campaign "${campaign.Campaign_ID}"...`,
    };
    addMessage(approvingMessage);

    try {
      // Wait for the webhook to confirm the approval, sending both output and input data
      await sendApprovalToWebhook(campaign, campaignParams);

      // Generate the AI success message
      const successMessageContent = await generateApprovalMessage(campaign);

      // Display the AI-generated success message
      const successMessage: Message = {
        id: `${Date.now()}-approval-success`,
        sender: Sender.AI,
        type: MessageType.Text,
        content: successMessageContent,
      };
      addMessage(successMessage);

      // Mark the original campaign message as approved
      updateMessage(messageId, { isApproved: true });
    } catch (error) {
      const errorMessage: Message = {
        id: `${Date.now()}-approval-error`,
        sender: Sender.System,
        type: MessageType.Text,
        content: `Approval failed: ${(error as Error).message}`,
      };
      addMessage(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="flex flex-col h-screen font-sans bg-purple-deep text-text-primary">
        <div className="max-w-screen-2xl mx-auto w-full flex flex-col flex-1">
          <Header onMenuClick={() => setIsProfileOpen(true)} onRestore={restoreCheckpoint} />
          <div className="flex-1 flex overflow-hidden">
            {/* Sidebar Overlay */}
            <div className={`fixed inset-0 z-40 transition-opacity ${isProfileOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
              <div className="absolute inset-0 bg-black/60" onClick={() => setIsProfileOpen(false)}></div>
            </div>

            {/* Sidebar */}
            <aside className={`w-full max-w-sm p-4 md:p-6 lg:p-8 overflow-y-auto bg-purple-primary transition-transform transform ${isProfileOpen ? 'translate-x-0' : '-translate-x-full'} flex-shrink-0 fixed inset-y-0 left-0 z-50`}>
              <CustomerProfileForm 
                profile={campaignParams} 
                setProfile={setCampaignParams} 
                onClose={() => setIsProfileOpen(false)} 
                onSubmit={handleProfileSubmit}
                isLoading={isLoading}
              />
            </aside>

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col bg-purple-deep">
              <main className="flex-1 overflow-y-auto p-6 md:p-8 lg:p-12 flex flex-col justify-end">
                <ChatWindow 
                  messages={messages} 
                  isLoading={isLoading}
                  onApproveCampaign={handleApproveCampaign}
                />
              </main>
              <footer className="bg-purple-deep border-t border-purple-secondary/30 p-4 md:p-6">
                <ChatInput 
                  onSendMessage={handleSendMessage} 
                  isLoading={isLoading} 
                  isSegmentNameSet={!!campaignParams.segmentName}
                />
              </footer>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default App;
