import { useState, useCallback } from 'react';
import { streamGenerateResponse } from '../services/geminiService';
import type { Message, CustomerProfile, FunctionCallData, FunctionResultData } from '../types';
import { Sender, MessageType } from '../types';
import type { Content } from '@google/genai';

export const useChat = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'initial-ai-message',
      sender: Sender.AI,
      type: MessageType.Text,
      content: "Hello! I'm Campaign Genius. Fill out the customer profile and click 'Generate Campaign' to send data to your workflow, or chat with me here to brainstorm ideas.",
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);

  const addMessage = useCallback((message: Message) => {
    setMessages(prev => [...prev, message]);
  }, []);

  const sendMessage = useCallback(async (text: string, profile: CustomerProfile) => {
    setIsLoading(true);

    const userMessage: Message = {
      id: Date.now().toString(),
      sender: Sender.User,
      type: MessageType.Text,
      content: text,
    };
    
    setMessages(prev => [...prev, userMessage]);

    // Convert our message format to Gemini's history format using the state *before* the new user message.
    const history: Content[] = messages
      .filter(msg => msg.type === MessageType.Text && msg.sender !== Sender.System)
      .map(msg => ({
        role: msg.sender === Sender.User ? 'user' : 'model',
        parts: [{ text: msg.content }],
    }));

    try {
      const responseGenerator = streamGenerateResponse(text, profile, history);
      
      let finalAiMessage: Message | null = null;

      for await (const responsePart of responseGenerator) {
        if (responsePart.type === 'function_call') {
            const functionCall: FunctionCallData = responsePart.data;
            const functionCallMessage: Message = {
                id: `${Date.now()}-fc`,
                sender: Sender.System,
                type: MessageType.FunctionCall,
                content: '',
                functionCall: functionCall,
            };
            addMessage(functionCallMessage);
        } else if (responsePart.type === 'function_result') {
            const functionResult: FunctionResultData = responsePart.data;
            const functionResultMessage: Message = {
                id: `${Date.now()}-fr`,
                sender: Sender.System,
                type: MessageType.FunctionResult,
                content: '',
                functionResult: functionResult,
            };
            addMessage(functionResultMessage);
        } else if (responsePart.type === 'text_stream') {
             if (finalAiMessage) {
                // Append to existing message content
                setMessages(prev => prev.map(msg => 
                    msg.id === finalAiMessage!.id 
                    ? { ...msg, content: msg.content + responsePart.data } 
                    : msg
                ));
             } else {
                // Create new message
                finalAiMessage = {
                    id: `${Date.now()}-ai`,
                    sender: Sender.AI,
                    type: MessageType.Text,
                    content: responsePart.data,
                };
                addMessage(finalAiMessage);
             }
        } else if (responsePart.type === 'text') {
            const aiMessage: Message = {
                id: `${Date.now()}-ai-full`,
                sender: Sender.AI,
                type: MessageType.Text,
                content: responsePart.data,
            };
            addMessage(aiMessage);
        }
      }

    } catch (error) {
      console.error("Error in sending message:", error);
      const errorMessage: Message = {
        id: `${Date.now()}-error`,
        sender: Sender.AI,
        type: MessageType.Text,
        content: "Sorry, something went wrong. Please check your API key and the console for details.",
      };
      addMessage(errorMessage);
    } finally {
      setIsLoading(false);
    }

  }, [messages, addMessage]);

  return { messages, sendMessage, isLoading, addMessage };
};