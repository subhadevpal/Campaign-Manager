import { useState, useCallback } from 'react';
import type { Message } from '../types';
import { Sender, MessageType } from '../types';

export const useChat = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'initial-ai-message',
      sender: Sender.AI,
      type: MessageType.Text,
      content: "Hello! I'm Campaign Genius. Describe the campaign you'd like to create in the chat, and I'll structure the data for your workflow. Or, use the form to enter details directly.",
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);

  const addMessage = useCallback((message: Message) => {
    setMessages(prev => [...prev, message]);
  }, []);

  return { messages, addMessage, isLoading, setIsLoading };
};
