
import React, { useState } from 'react';
import { Header } from './components/Header';
import { ChatInput } from './components/ChatInput';
import { ChatWindow } from './components/ChatWindow';
import { CustomerProfileForm } from './components/CustomerProfileForm';
import { useChat } from './hooks/useChat';
import type { CampaignParameters, Message, Campaign } from './types';
import { sendDataToWebhook, analyzePromptWithAI, sendApprovalToWebhook, generateApprovalMessage, validateUserInput, generateCampaignImage, recommendCampaignIdea } from './services/geminiService';
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

const initialCampaignParams: CampaignParameters = {
  segmentName: '',
  merchantCategory: '',
  age: '',
  gender: '',
  userType: '',
  incomeBracket: '',
  daysOnboarded: '',
  specialFestiveSeason: '',
};

function App() {
  const { messages, addMessage, isLoading, setIsLoading, updateMessage, createCheckpoint, restoreCheckpoint, removeMessage, resetMessages } = useChat();
  const [campaignParams, setCampaignParams] = useState<CampaignParameters>(initialCampaignParams);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [hasConversationEnded, setHasConversationEnded] = useState(false);
  const [lastCampaignData, setLastCampaignData] = useState<Campaign | null>(null);
  const [lastCampaignMessageId, setLastCampaignMessageId] = useState<string | null>(null);
  const [suggestedDescription, setSuggestedDescription] = useState<string | null>(null);
  const [isWaitingForRecommendationInput, setIsWaitingForRecommendationInput] = useState(false);

  const resetConversation = () => {
    setCampaignParams(initialCampaignParams);
    setLastCampaignData(null);
    setLastCampaignMessageId(null);
    setSuggestedDescription(null);
    setIsWaitingForRecommendationInput(false);
    resetMessages();
  };
  
  const handleSendMessage = async (text: string) => {
    // Check if the user wants to restart the conversation (e.g. "Hi", "Hello")
    // This allows the user to interrupt and start from step 1 at any time.
    const isRestartCommand = /^(hi|hello|hey|start|restart|reset)(\s+there)?!?\.?$/i.test(text.trim());

    if (isRestartCommand) {
        const userMessage: Message = {
            id: Date.now().toString(),
            sender: Sender.User,
            type: MessageType.Text,
            content: text,
        };
        addMessage(userMessage);

        setIsLoading(true);
        // Use a timeout to make the reset feel more natural
        setTimeout(() => {
            resetConversation();
            setHasConversationEnded(false);
            setIsLoading(false);
        }, 600);
        return; // Stop further processing
    }

    // If the last turn ended in an error, any new user message will reset the conversation.
    if (hasConversationEnded) {
        const userMessage: Message = {
            id: Date.now().toString(),
            sender: Sender.User,
            type: MessageType.Text,
            content: text,
        };
        addMessage(userMessage);

        setIsLoading(true);
        // Use a timeout to make the reset feel more natural
        setTimeout(() => {
            resetConversation();
            setHasConversationEnded(false);
            setIsLoading(false);
        }, 500);
        return; // Stop further processing for this turn
    }

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
        
        // Skip asking for campaign type and go directly to options
        const aiResponse: Message = {
          id: `${Date.now()}-segment-set`,
          sender: Sender.AI,
          type: MessageType.Text,
          content: `Great! The segment is named "${text}".\n\nPlease choose how you'd like to proceed:`,
          options: [
            { label: "Describe Campaign", value: "I will describe the campaign myself." },
            { label: "Recommend Idea", value: "Help me with a campaign recommendation." }
          ]
        };
        addMessage(aiResponse);

      } else {
        // STATE 2: WAITING FOR CAMPAIGN DETAILS, IMAGE GENERATION, OR IDEA RECOMMENDATION
        
        // Handle Option Selection: "Describe Campaign"
        if (text === "I will describe the campaign myself.") {
           addMessage({
             id: `${Date.now()}-describe-ack`,
             sender: Sender.AI,
             type: MessageType.Text,
             content: "Please describe the campaign e.g. : Create Diwali Marketing campaign for high income males"
           });
           setIsLoading(false);
           return;
        }

        // Handle Option Selection: "Recommend Idea" - Start Flow
        if (text === "Help me with a campaign recommendation.") {
            setIsWaitingForRecommendationInput(true);
            addMessage({
                id: `${Date.now()}-recommend-start`,
                sender: Sender.AI,
                type: MessageType.Text,
                content: "Sure! Please specify the Merchant Category and Festive Season (e.g., 'Dining, Diwali') so I can suggest something relevant."
            });
            setIsLoading(false);
            return;
        }

        // Handle Input for Recommendation
        if (isWaitingForRecommendationInput) {
             try {
                 const idea = await recommendCampaignIdea(text);
                 setSuggestedDescription(idea);
                 addMessage({
                     id: `${Date.now()}-recommendation`,
                     sender: Sender.AI,
                     type: MessageType.Text,
                     content: `Here is a campaign idea based on your input:\n\n"${idea}"\n\nWould you like to proceed with generating the campaign for this idea?`
                 });
                 setIsWaitingForRecommendationInput(false);
                 setIsLoading(false);
                 return;
             } catch (error) {
                 console.error("Failed to recommend idea:", error);
                 addMessage({
                     id: `${Date.now()}-recommend-error`,
                     sender: Sender.AI,
                     type: MessageType.Text,
                     content: "I had trouble generating a recommendation. Could you please describe your campaign directly instead?"
                 });
                 setIsWaitingForRecommendationInput(false);
                 setIsLoading(false);
                 return;
             }
        }

        let textToProcess = text;
        let skipValidation = false;

        // Check if we are in the middle of a recommendation confirmation flow
        if (suggestedDescription) {
            // Check if the user's input looks like confirmation
            const isAffirmation = /^(yes|yeah|sure|ok|proceed|go ahead|correct|please do)/i.test(text.trim());
            
            if (isAffirmation) {
                textToProcess = suggestedDescription;
                skipValidation = true;
                addMessage({
                    id: `${Date.now()}-using-suggestion`,
                    sender: Sender.System,
                    type: MessageType.Text,
                    content: `Using idea: "${textToProcess}"`
                });
            } else {
                // User rejected or typed something else, so we use their input as the description or command
                // Fall through to normal processing
            }
            setSuggestedDescription(null);
        }
        
        if (!skipValidation) {
            // Check for Image Generation
            const isImageRequest = /generate.*(image|visual|creative)|show.*(image|visual|creative)|create.*(image|picture)/i.test(text);
            if (isImageRequest) {
                if (lastCampaignData && lastCampaignMessageId) {
                    const loadingMsgId = `${Date.now()}-generating-image`;
                    addMessage({
                        id: loadingMsgId,
                        sender: Sender.System,
                        type: MessageType.Text,
                        content: "Designing a creative image for your campaign..."
                    });

                    try {
                        const imageUrl = await generateCampaignImage(lastCampaignData, campaignParams);
                        const updatedCampaign = { ...lastCampaignData, imageUrl };
                        
                        // Update the last campaign state
                        setLastCampaignData(updatedCampaign);
                        
                        // Update the specific message in the chat history
                        updateMessage(lastCampaignMessageId, {
                            content: JSON.stringify({ output: [updatedCampaign] })
                        });
                        
                        removeMessage(loadingMsgId);
                        setIsLoading(false);
                        return; // Stop here after handling image generation
                    } catch (error) {
                        console.error(error);
                        removeMessage(loadingMsgId);
                        addMessage({
                            id: `${Date.now()}-image-error`,
                            sender: Sender.System,
                            type: MessageType.Text,
                            content: "I couldn't generate an image at this time. Please try again."
                        });
                        setIsLoading(false);
                        return;
                    }
                } else {
                    addMessage({
                        id: `${Date.now()}-image-no-campaign`,
                        sender: Sender.AI,
                        type: MessageType.Text,
                        content: "I'd love to generate an image, but please create a campaign first! Describe your campaign or ask for a recommendation to get started."
                    });
                    setIsLoading(false);
                    return;
                }
            }

            // Check for inline Recommendation Request (fallback if user ignores buttons)
            const isRecommendationRequest = /(recommend|suggest|give|idea|what should|can you).*idea/i.test(text) || /(recommend|suggest).*campaign/i.test(text);
            
            if (isRecommendationRequest) {
                 try {
                     const idea = await recommendCampaignIdea(text);
                     setSuggestedDescription(idea);
                     addMessage({
                         id: `${Date.now()}-recommendation`,
                         sender: Sender.AI,
                         type: MessageType.Text,
                         content: `Here is a campaign idea based on your request:\n\n"${idea}"\n\nWould you like to proceed with generating the campaign for this idea?`
                     });
                     setIsLoading(false);
                     return;
                 } catch (error) {
                     console.error("Failed to recommend idea:", error);
                     // Fall through to normal processing if recommendation fails
                 }
            }
        }

        if (!skipValidation) {
            const validation = await validateUserInput(textToProcess, 'campaign_details');

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
        }

        createCheckpoint();
        
        const extractedPartialParams = await analyzePromptWithAI(textToProcess);
        
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
        const aiResponseId = `${Date.now()}-webhook-response`;
        const aiResponse: Message = {
          id: aiResponseId,
          sender: Sender.AI,
          type: MessageType.Text,
          content: typeof webhookResponse === 'object' 
                   ? JSON.stringify(webhookResponse, null, 2) 
                   : String(webhookResponse),
        };
        addMessage(aiResponse);

        // Store the campaign data so we can generate images for it later
        if (typeof webhookResponse === 'object' && webhookResponse.output && webhookResponse.output[0]) {
            setLastCampaignData(webhookResponse.output[0]);
            setLastCampaignMessageId(aiResponseId);
        }
      }
    } catch (error) {
       const errorMessage: Message = {
        id: `${Date.now()}-error`,
        sender: Sender.System,
        type: MessageType.Text,
        content: `An error occurred: ${(error as Error).message}`,
      };
      addMessage(errorMessage);
      setHasConversationEnded(true);
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

    setIsLoading(true);
    setIsProfileOpen(false); // Close sidebar immediately to shift focus to chat
    createCheckpoint();
    
    // Add a system message to bridge the action and the result
    const systemMessage: Message = {
      id: `${Date.now()}-profile-submit`,
      sender: Sender.System,
      type: MessageType.Text,
      content: 'Generating campaign with the provided customer profile...',
    };
    addMessage(systemMessage);

    try {
      const webhookResponse = await sendDataToWebhook(campaignParams);
      const aiResponseId = `${Date.now()}-webhook-response`;
      const aiResponse: Message = {
        id: aiResponseId,
        sender: Sender.AI,
        type: MessageType.Text,
        content: typeof webhookResponse === 'object' 
                 ? JSON.stringify(webhookResponse, null, 2) 
                 : String(webhookResponse),
      };
      addMessage(aiResponse);

      // Store the campaign data so we can generate images for it later
      if (typeof webhookResponse === 'object' && webhookResponse.output && webhookResponse.output[0]) {
          setLastCampaignData(webhookResponse.output[0]);
          setLastCampaignMessageId(aiResponseId);
      }
    } catch (error) {
       const errorMessage: Message = {
        id: `${Date.now()}-webhook-error`,
        sender: Sender.System,
        type: MessageType.Text,
        content: `Error: ${(error as Error).message}`,
      };
      addMessage(errorMessage);
      setHasConversationEnded(true);
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
      const webhookResponse = await sendApprovalToWebhook(campaign, campaignParams);
      const responseString = typeof webhookResponse === 'object' ? JSON.stringify(webhookResponse) : String(webhookResponse);

      // Normalize whitespace to handle variations like double spaces and check for failure signature.
      const normalizedResponseString = responseString.replace(/\s\s+/g, ' ').trim();
      const failureSignature = "Your campaign has failed with Error Message";

      if (normalizedResponseString.includes(failureSignature)) {
        // The webhook reported a delivery failure.
        const failureMessage: Message = {
          id: `${Date.now()}-approval-failure`,
          sender: Sender.AI,
          type: MessageType.Text,
          // Show the original, un-normalized error message from the webhook
          content: responseString,
        };
        addMessage(failureMessage);
        setHasConversationEnded(true);
      } else {
        // The webhook reported success, proceed with the congratulatory message.
        const successMessageContent = await generateApprovalMessage(campaign);
        const successMessage: Message = {
          id: `${Date.now()}-approval-success`,
          sender: Sender.AI,
          type: MessageType.Text,
          content: successMessageContent,
        };
        addMessage(successMessage);
        updateMessage(messageId, { isApproved: true });
      }
    } catch (error) {
      const errorMessage: Message = {
        id: `${Date.now()}-approval-error`,
        sender: Sender.System,
        type: MessageType.Text,
        content: `Approval failed: ${(error as Error).message}`,
      };
      addMessage(errorMessage);
      setHasConversationEnded(true);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleRegenerateCampaign = async (messageId: string) => {
    setIsLoading(true);
    removeMessage(messageId);

    const regeneratingMessage: Message = {
      id: `${Date.now()}-regenerating`,
      sender: Sender.System,
      type: MessageType.Text,
      content: `Regenerating campaign with the same criteria...`,
    };
    addMessage(regeneratingMessage);

    try {
      const webhookResponse = await sendDataToWebhook(campaignParams);
      const aiResponseId = `${Date.now()}-webhook-response-regenerated`;
      const aiResponse: Message = {
        id: aiResponseId,
        sender: Sender.AI,
        type: MessageType.Text,
        content: typeof webhookResponse === 'object' 
                 ? JSON.stringify(webhookResponse, null, 2) 
                 : String(webhookResponse),
      };
      addMessage(aiResponse);
      
      // Store the campaign data so we can generate images for it later
      if (typeof webhookResponse === 'object' && webhookResponse.output && webhookResponse.output[0]) {
          setLastCampaignData(webhookResponse.output[0]);
          setLastCampaignMessageId(aiResponseId);
      }
    } catch (error) {
       const errorMessage: Message = {
        id: `${Date.now()}-webhook-error-regenerated`,
        sender: Sender.System,
        type: MessageType.Text,
        content: `Error during regeneration: ${(error as Error).message}`,
      };
      addMessage(errorMessage);
      setHasConversationEnded(true);
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
                  onRegenerateCampaign={handleRegenerateCampaign}
                  onSendMessage={handleSendMessage}
                />
              </main>
              <div className="p-4 md:p-6 lg:p-8 bg-purple-deep border-t border-purple-secondary/20">
                <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} isSegmentNameSet={!!campaignParams.segmentName} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default App;
