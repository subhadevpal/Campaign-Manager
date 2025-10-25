
import React, { useState } from 'react';
import { Header } from './components/Header';
import { ChatInput } from './components/ChatInput';
import { ChatWindow } from './components/ChatWindow';
import { CustomerProfileForm } from './components/CustomerProfileForm';
import { useChat } from './hooks/useChat';
import type { CampaignParameters, Message, Campaign } from './types';
import { sendDataToWebhook, analyzePromptWithAI, sendApprovalToWebhook, generateApprovalMessage, validateUserInput } from './services/geminiService';
import { Sender, MessageType } from './types';


function App() {
  const { messages, addMessage, isLoading, setIsLoading, updateMessage, createCheckpoint, restoreCheckpoint } = useChat();
  const [campaignParams, setCampaignParams] = useState<CampaignParameters>({
    segmentName: '',
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
        // CONTEXT: Expecting a segment name
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
        
        // It's a valid segment name, proceed
        setCampaignParams(prev => ({ ...prev, segmentName: text }));
        const aiResponse: Message = {
          id: `${Date.now()}-segment-set`,
          sender: Sender.AI,
          type: MessageType.Text,
          content: `Great! The segment is named "${text}". Now, please describe the customers in this segment. For example, you can mention their age, income, interests, or spending habits.`,
        };
        addMessage(aiResponse);

      } else {
        // CONTEXT: Expecting campaign details
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

        // It's valid campaign details, proceed with the full flow
        createCheckpoint();
        
        const analyzingMessage: Message = {
          id: `${Date.now()}-analyzing`,
          sender: Sender.System,
          type: MessageType.FunctionCall,
          content: '',
          functionCall: { name: 'analyzePrompt', args: { prompt: text } },
        };
        addMessage(analyzingMessage);

        const extractedPartialParams = await analyzePromptWithAI(text);
        const fullExtractedParams: CampaignParameters = {
          ...campaignParams,
          ...extractedPartialParams,
        };
        setCampaignParams(fullExtractedParams);

        const analysisResult: Message = {
          id: `${Date.now()}-analysis-result`,
          sender: Sender.System,
          type: MessageType.FunctionResult,
          content: '',
          functionResult: { name: 'analyzePrompt', result: fullExtractedParams },
        };
        addMessage(analysisResult);

        const sendingMessage: Message = {
          id: `${Date.now()}-sending-webhook`,
          sender: Sender.System,
          type: MessageType.FunctionCall,
          content: '',
          functionCall: { name: 'sendToWorkflow', args: fullExtractedParams },
        };
        addMessage(sendingMessage);

        const webhookResponse = await sendDataToWebhook(fullExtractedParams);
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

    createCheckpoint();
    setIsLoading(true);
    const sendingMessage: Message = {
      id: `${Date.now()}-sending-webhook`,
      sender: Sender.System,
      type: MessageType.FunctionCall,
      content: '',
      functionCall: { name: 'sendToWorkflow', args: campaignParams },
    };
    addMessage(sendingMessage);

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
