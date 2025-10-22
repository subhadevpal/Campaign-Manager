import React, { useState } from 'react';
import { Header } from './components/Header';
import { ChatInput } from './components/ChatInput';
import { ChatWindow } from './components/ChatWindow';
import { CustomerProfileForm } from './components/CustomerProfileForm';
import { useChat } from './hooks/useChat';
import type { CampaignParameters, Message } from './types';
import { sendDataToWebhook, analyzePromptWithAI } from './services/geminiService';
import { Sender, MessageType } from './types';


function App() {
  const { messages, addMessage, isLoading, setIsLoading } = useChat();
  const [campaignParams, setCampaignParams] = useState<CampaignParameters>({
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
      // Step 1: Show AI is analyzing
      const analyzingMessage: Message = {
        id: `${Date.now()}-analyzing`,
        sender: Sender.System,
        type: MessageType.FunctionCall,
        content: '',
        functionCall: { name: 'analyzePrompt', args: { prompt: text } },
      };
      addMessage(analyzingMessage);

      // Step 2: Call AI to extract data
      const extractedParams = await analyzePromptWithAI(text);
      const analysisResult: Message = {
        id: `${Date.now()}-analysis-result`,
        sender: Sender.System,
        type: MessageType.FunctionResult,
        content: '',
        functionResult: { name: 'analyzePrompt', result: extractedParams },
      };
      addMessage(analysisResult);

      // Step 3: Send extracted data to webhook
      await sendDataToWebhook(extractedParams);
      const successMessage: Message = {
        id: `${Date.now()}-webhook-success`,
        sender: Sender.System,
        type: MessageType.FunctionResult,
        content: '',
        functionResult: {
          name: 'sendToWorkflow',
          result: { status: 'Success', message: 'Extracted data sent to workflow.' },
        },
      };
      addMessage(successMessage);

    } catch (error) {
       const errorMessage: Message = {
        id: `${Date.now()}-error`,
        sender: Sender.System,
        type: MessageType.Text,
        content: `An error occurred: ${(error as Error).message}. Please check the console for details.`,
      };
      addMessage(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleProfileSubmit = async () => {
    setIsLoading(true);
    try {
      await sendDataToWebhook(campaignParams);
      const successMessage: Message = {
        id: `${Date.now()}-webhook-success`,
        sender: Sender.System,
        type: MessageType.FunctionResult,
        content: '',
        functionResult: {
          name: 'Campaign Webhook',
          result: { status: 'Success', message: 'Profile sent to workflow.' },
        },
      };
      addMessage(successMessage);
      setIsProfileOpen(false); // Close sidebar on mobile after submission
    } catch (error) {
       const errorMessage: Message = {
        id: `${Date.now()}-webhook-error`,
        sender: Sender.System,
        type: MessageType.Text,
        content: `Webhook Error: Failed to send profile data. Please check the console for details.`,
      };
      addMessage(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen font-sans bg-purple-deep">
      <Header onMenuClick={() => setIsProfileOpen(true)} />
      <div className="flex-1 flex overflow-hidden">
        {/* Mobile Sidebar Overlay */}
        <div className={`fixed inset-0 z-40 md:hidden transition-opacity ${isProfileOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
          <div className="absolute inset-0 bg-black/60" onClick={() => setIsProfileOpen(false)}></div>
        </div>

        {/* Sidebar */}
        <aside className={`w-full max-w-sm p-4 md:p-6 lg:p-8 overflow-y-auto bg-purple-primary transition-transform transform ${isProfileOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 md:relative md:w-1/3 fixed inset-y-0 left-0 z-50 md:z-auto`}>
          <CustomerProfileForm 
            profile={campaignParams} 
            setProfile={setCampaignParams} 
            onClose={() => setIsProfileOpen(false)} 
            onSubmit={handleProfileSubmit}
            isLoading={isLoading}
          />
        </aside>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col">
          <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
            <ChatWindow messages={messages} isLoading={isLoading} />
          </main>
          <footer className="bg-purple-primary/50 backdrop-blur-sm border-t border-purple-secondary/30 p-4">
            <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />
          </footer>
        </div>
      </div>
    </div>
  );
}

export default App;
