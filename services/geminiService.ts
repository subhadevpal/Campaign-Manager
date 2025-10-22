import { GoogleGenAI, FunctionDeclaration, Type, GenerateContentResponse, Content } from '@google/genai';
import type { CustomerProfile } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

export async function sendProfileToWebhook(profile: CustomerProfile) {
  const webhookUrl = 'https://subhadevp.app.n8n.cloud/webhook-test/09e1de49-2634-424d-a0d3-52deaa861da6';
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(profile),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('Webhook response error:', errorBody);
      throw new Error(`Webhook failed with status: ${response.status}`);
    }

    console.log('Webhook call successful');
    return await response.json();
  } catch (error) {
    console.error('Error calling webhook:', error);
    throw error;
  }
}

const getRecentMarketingTrends: FunctionDeclaration = {
    name: 'getRecentMarketingTrends',
    description: 'Gets recent marketing trends for a specific industry or merchant category.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        category: {
          type: Type.STRING,
          description: 'The merchant category to get trends for, e.g., "Online Shopping", "Food & Beverage".',
        },
      },
      required: ['category'],
    },
};

const tools = [{ functionDeclarations: [getRecentMarketingTrends] }];

function getSystemInstruction(profile: CustomerProfile): string {
  let instruction = `You are "Campaign Genius", an expert AI marketing assistant. Your goal is to generate creative and effective marketing campaign ideas.`;
  
  const profileDetails = Object.entries(profile)
    .filter(([, value]) => value && value.toString().trim() !== '')
    .map(([key, value]) => {
        const formattedKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase());
        return `${formattedKey}: ${value}`;
    })
    .join(', ');

  if (profileDetails) {
    instruction += `\n\nYou are currently brainstorming for a customer with the following profile: ${profileDetails}.`;
  }

  instruction += `\n\nTailor your suggestions to this profile. You can use the available tools to get more information if needed. Be creative, concise, and actionable. When you suggest a campaign, format it nicely using markdown.`;
  return instruction;
}

const executeGetRecentMarketingTrends = async (args: { category: string }) => {
    console.log('Executing getRecentMarketingTrends with:', args);
    await new Promise(resolve => setTimeout(resolve, 500)); 
    
    if (args.category && args.category.toLowerCase().includes('shopping')) {
        return {
            trends: [
                "Live stream shopping events on social media.",
                "Personalized recommendations using AI.",
                "Gamified loyalty programs.",
                "Sustainable and eco-friendly product promotions."
            ]
        };
    }
    return { trends: ["No specific trends found. Generic trends include influencer marketing and short-form video content."] };
};

const availableFunctions: { [key: string]: Function } = {
  getRecentMarketingTrends: executeGetRecentMarketingTrends,
};

export async function* streamGenerateResponse(message: string, profile: CustomerProfile, history: Content[]) {
    try {
        const systemInstruction = getSystemInstruction(profile);
        const chat = ai.chats.create({
            model: 'gemini-2.5-flash',
            config: {
                systemInstruction,
                tools,
            },
            history: history,
        });
        
        const result = await chat.sendMessageStream({ message });
        
        let fullText = '';

        for await (const chunk of result) {
            if (chunk.functionCalls && chunk.functionCalls.length > 0) {
                 const fc = chunk.functionCalls[0];
                 yield { type: 'function_call', data: fc };
            
                const apiToCall = availableFunctions[fc.name];
                let functionResponse;

                if (apiToCall) {
                    const result = await apiToCall(fc.args);
                    yield { type: 'function_result', data: { name: fc.name, result } };
                    functionResponse = { functionResponse: { id: fc.id, name: fc.name, response: { result } } };
                } else {
                    const errorResult = { error: `Function ${fc.name} not found.` };
                    yield { type: 'function_result', data: { name: fc.name, result: errorResult } };
                    functionResponse = { functionResponse: { id: fc.id, name: fc.name, response: errorResult } };
                }
                
                // This part is tricky with streaming, sending function response back might need a separate non-stream call or a more complex stream handler.
                // For now, let's assume the subsequent generation will handle this.
                const followupResult = await chat.sendMessageStream({ message: functionResponse });
                for await (const followupChunk of followupResult) {
                     if (followupChunk.text) {
                        yield { type: 'text_stream', data: followupChunk.text };
                        fullText += followupChunk.text;
                    }
                }
                continue; // Move to next part of the stream
            }

            if (chunk.text) {
                yield { type: 'text_stream', data: chunk.text };
                fullText += chunk.text;
            }
        }

    } catch (error) {
        console.error("Error generating response:", error);
        yield { type: 'text', data: 'Sorry, I encountered an error. Please try again.' };
    }
};