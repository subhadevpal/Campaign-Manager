import { useState, useCallback } from 'react';
import type { Message } from '../types';
import { Sender, MessageType } from '../types';

export const useChat = () => {
  const initialMessages: Message[] = [
    {
      id: 'initial-ai-message',
      sender: Sender.AI,
      type: MessageType.Text,
      content: "Hello! I'm Pixel Pulse. To get started, please provide a name for your customer segment.",
    }
  ];
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [messagesCheckpoint, setMessagesCheckpoint] = useState<Message[]>(initialMessages);
  const [isLoading, setIsLoading] = useState(false);

  const addMessage = useCallback((message: Message) => {
    setMessages(prev => [...prev, message]);
  }, []);

  const createCheckpoint = useCallback(() => {
    setMessages(prevMessages => {
      setMessagesCheckpoint(prevMessages);
      return prevMessages;
    });
  }, []);

  const restoreCheckpoint = useCallback(() => {
    setMessages(messagesCheckpoint);
  }, [messagesCheckpoint]);


  const updateMessage = useCallback((messageId: string, updates: Partial<Message>) => {
    setMessages(prev => 
      prev.map(msg => 
        msg.id === messageId ? { ...msg, ...updates } : msg
      )
    );
  }, []);

  return { messages, addMessage, isLoading, setIsLoading, updateMessage, createCheckpoint, restoreCheckpoint };
};