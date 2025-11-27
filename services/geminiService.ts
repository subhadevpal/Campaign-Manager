
import { GoogleGenAI, Type } from "@google/genai";
import type { CampaignParameters, Campaign } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const campaignSchema = {
  type: Type.OBJECT,
  properties: {
    merchantCategory: {
      type: Type.STRING,
      description: "The category of merchant, e.g., Dining, Entertainment, Food, Grocery, Travel, Shopping."
    },
    age: {
      type: Type.STRING,
      description: "The age or age range of the target customer (e.g., '25-30', '40s', 'over 50', '34 to 45'). Extract exactly as provided."
    },
    gender: {
      type: Type.STRING,
      description: "The gender of the target customer (e.g., Male, Female)."
    },
    userType: {
      type: Type.STRING,
      description: "The type of user. Map terms like 'frequent', 'heavy' to 'Power'. Map 'normal', 'standard' to 'Regular'. Map 'churning', 'leaving' to 'At Risk'."
    },
    incomeBracket: {
      type: Type.STRING,
      description: "The income bracket. Map terms like 'wealthy', 'rich', 'high earner' to 'High'. Map 'average' to 'Medium'. Map 'budget', 'economical' to 'Low'. If a specific amount is given, extract it verbatim."
    },
    daysOnboarded: {
      type: Type.STRING,
      description: "The number of days the user has been onboarded (e.g. '90', '30')."
    },
    specialFestiveSeason: {
      type: Type.STRING,
      description: "The special festive season or occasion mentioned (e.g., Diwali, Christmas, New Year, Holi, Eid)."
    },
  },
};

const validationSchema = {
    type: Type.OBJECT,
    properties: {
        isValid: {
            type: Type.BOOLEAN,
            description: "Whether the user input is valid for the given context."
        },
        feedback: {
            type: Type.STRING,
            description: "A helpful message to the user if the input is invalid, explaining what is expected. This should be null if the input is valid."
        }
    }
};

export async function validateUserInput(
  input: string, 
  context: 'segment_name' | 'campaign_details'
): Promise<{ isValid: boolean; feedback: string | null }> {
  let prompt = '';
  if (context === 'segment_name') {
    prompt = `You are a helpful AI assistant for a marketing tool. The user has been prompted to provide a name for a customer segment. 

A valid segment name can be a descriptive phrase (e.g., 'Young Professionals') or a single keyword used for categorization or testing (e.g., 'Test', 'QA_Users', 'Pixel', 'Pulse').

However, simple greetings (e.g., 'Hi', 'Hello'), questions, or generic conversational filler are NOT valid segment names.

Please analyze the user's input: "${input}"

Is this a valid segment name based on these rules? Respond with JSON following the specified schema. If it's invalid, provide a brief, friendly, and professional feedback message that gently guides the user to provide a proper segment name.`;
  } else { // campaign_details
    prompt = `You are a helpful AI assistant for a marketing tool. The user has been asked to describe a marketing campaign. A valid description should include some details about the target audience, offers, or occasions (e.g., 'a Diwali offer for shoppers' or 'cashback for movie lovers'). Simple greetings, questions, or conversational filler are not valid campaign descriptions.
    
    Please analyze the user's input: "${input}"
    
    Does this input appear to be a description of a campaign? Respond with JSON following the specified schema. If it's invalid, provide a brief, friendly, and professional feedback message that gently guides the user to describe their campaign.`;
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: validationSchema,
      },
    });
    
    const jsonText = response.text.trim();
    const parsedJson = JSON.parse(jsonText);
    return parsedJson;

  } catch (error) {
    console.error("Error validating user input with AI:", error);
    // Fail safe: assume the input is valid if the validation service fails, to not block the user.
    return { isValid: true, feedback: null };
  }
}

export async function analyzePromptWithAI(prompt: string): Promise<Partial<CampaignParameters>> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Analyze the user's request and intelligently extract the campaign parameters based on the provided schema. 
      
      The user is describing a marketing campaign. Your goal is to identify values for:
      1. Merchant Category (e.g. Dining)
      2. Age (e.g. 34 to 45)
      3. Gender (e.g. Male)
      4. User Type (e.g. Power)
      5. Income Bracket (e.g. High)
      6. Days Onboarded (e.g. 90)
      7. Special Festive Season (e.g. Diwali)

      Only fill in the values that are explicitly mentioned or strongly implied by keywords in the request. 
      
      For 'Income Bracket', map terms like 'wealthy', 'high net worth' to 'High'.
      For 'User Type', map terms like 'loyal', 'frequent' to 'Power'.
      For 'Age', extract the exact number or range mentioned.
      
      The user's request is: "${prompt}"`,
      config: {
        responseMimeType: "application/json",
        responseSchema: campaignSchema,
      },
    });

    const jsonText = response.text.trim();
    const parsedJson = JSON.parse(jsonText);

    return parsedJson;

  } catch (error) {
    console.error("Error analyzing prompt with AI:", error);
    throw new Error("Failed to analyze the prompt with AI.");
  }
}

export async function recommendCampaignIdea(userInput: string): Promise<string> {
  const prompt = `The user is asking for a marketing campaign idea.
  User Input: "${userInput}"
  
  Please extract any Merchant Category (e.g., Dining, Travel) and Festive Season (e.g., Diwali, Christmas) mentioned. If not mentioned, assume generic.
  
  Based on this, generate a single, creative, 1-2 sentence marketing campaign description suitable for a credit card product. 
  Example Output: "Earn 10% cashback on all dining spends during the Diwali weekend."
  
  Return ONLY the campaign description text.`;

  try {
     const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });
    return response.text.trim();
  } catch (error) {
    console.error("Error recommending campaign:", error);
    throw new Error("Could not generate a recommendation.");
  }
}

export async function generateCampaignImage(campaign: Campaign, params: CampaignParameters): Promise<string> {
  const prompt = `Create a high-quality, professional advertisement image for the following marketing campaign:
  
  Headline: ${campaign.Header}
  Copy: ${campaign.Body}
  
  Target Audience: ${params.segmentName}
  Demographics: ${params.age || 'General'}, ${params.gender || 'All'}, ${params.incomeBracket || 'All Income'}
  Context: ${params.specialFestiveSeason || 'General Promotion'}
  Merchant Category: ${params.merchantCategory || 'General'}
  
  The image should be visually striking, suitable for a mobile app feed or email header. No text on image is preferred, but if necessary, only the headline should be visible in a modern font.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: prompt }],
      },
      config: {
        imageConfig: {
            aspectRatio: "16:9"
        }
      },
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
    throw new Error("No image data found in response");
  } catch (error) {
    console.error("Error generating campaign image:", error);
    throw error;
  }
}

export async function sendDataToWebhook(payload: CampaignParameters) {
  const webhookUrl = 'https://subhadevp.app.n8n.cloud/webhook-test/09e1de49-2634-424d-a0d3-52deaa861da6';
  
  // Create a structured payload with all collected customer data
  const webhookPayload = {
      "Segment Name": payload.segmentName,
      "Favourite Merchant Category": payload.merchantCategory,
      "Age": payload.age,
      "Gender": payload.gender,
      "Type of User": payload.userType,
      "Income Bracket": payload.incomeBracket,
      "Days Onboarded": payload.daysOnboarded,
      "Special Festive Season": payload.specialFestiveSeason,
  };

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(webhookPayload),
    });

    const responseText = await response.text();

    if (!response.ok) {
      console.error('Webhook response error:', responseText);
      try {
          const errorJson = JSON.parse(responseText);
          if (errorJson.message) {
              throw new Error(`Workflow Error: ${errorJson.message} (Status: ${response.status})`);
          }
      } catch (e) {
          // Fallback if error body is not json or doesn't have a message field
          throw new Error(`Webhook failed with status: ${response.status}. Response: ${responseText}`);
      }
      // This line is a fallback, should not be reached if above logic works
      throw new Error(`Webhook failed with status: ${response.status}.`);
    }

    console.log('Webhook call successful');
    try {
        // Assume the successful response is JSON
        return JSON.parse(responseText);
    } catch (e) {
        // If not, return it as plain text
        return responseText;
    }
  } catch (error) {
    console.error('Error calling webhook:', error);
    if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        throw new Error('Network Error: Failed to fetch. This may be a CORS issue. Please ensure the webhook server allows requests from this origin.');
    }
    // Re-throw custom errors from the try block or other unexpected errors
    throw error;
  }
}

export async function sendApprovalToWebhook(campaign: Campaign, campaignParams: CampaignParameters) {
  const webhookUrl = 'https://subhadevp.app.n8n.cloud/webhook-test/4e00e3d9-587c-4e17-a287-56d77ee0d684';
  
  // Combine the campaign output data with the campaign input parameters
  const webhookPayload = [
    {
      // Campaign Output Data
      "Campaign ID": campaign.Campaign_ID,
      "Campaign Date": campaign.Campaign_Date,
      "Channel": campaign.Channel,
      "Header": campaign.Header,
      "Body": campaign.Body,
      // Campaign Input Data
      "Segment Name": campaignParams.segmentName,
      "Merchant Category": campaignParams.merchantCategory,
      "Age": campaignParams.age,
      "Gender": campaignParams.gender,
      "User Type": campaignParams.userType,
      "Income": campaignParams.incomeBracket,
      "Days Onboarded": campaignParams.daysOnboarded,
      "Festive season": campaignParams.specialFestiveSeason,
    },
  ];

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(webhookPayload),
    });

    const responseText = await response.text();

    if (!response.ok) {
      console.error('Approval webhook response error:', responseText);
      try {
          const errorJson = JSON.parse(responseText);
          if (errorJson.message) {
              throw new Error(`Approval Workflow Error: ${errorJson.message} (Status: ${response.status})`);
          }
      } catch (e) {
          throw new Error(`Approval webhook failed with status: ${response.status}. Response: ${responseText}`);
      }
      throw new Error(`Approval webhook failed with status: ${response.status}.`);
    }

    console.log('Approval webhook call successful');
    try {
        return JSON.parse(responseText);
    } catch (e) {
        return responseText;
    }
  } catch (error) {
    console.error('Error calling approval webhook:', error);
    if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        throw new Error('Network Error: Failed to fetch approval webhook. This may be a CORS issue.');
    }
    throw error;
  }
}

export async function generateApprovalMessage(campaign: Campaign): Promise<string> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `A marketing campaign has been successfully approved and created. Your task is to generate a short, cheerful, and highly conversational success message for the user, who is a campaign manager. Make them feel great about their work!

Guidelines:
- Congratulate them enthusiastically.
- Compliment them on their skill (e.g., "you're an awesome campaign manager").
- Mention the campaign header, which is "${campaign.Header}".
- Keep it concise and professional, but with a friendly and celebratory tone.
- **Crucially, DO NOT use any placeholders like [Product Manager's Name] or [Your Name]. Address the user directly without using a name.**`,
      config: {},
    });

    const text = response.text;
    if (!text) {
        throw new Error("Received empty response from AI.");
    }
    return text.trim();
  } catch (error) {
    console.error("Error generating approval message with AI:", error);
    // Provide a good fallback message
    return `Congratulations! The campaign "${campaign.Header}" has been successfully approved and created. You're an awesome campaign manager!`;
  }
}
