
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
      description: "The age of the target customer."
    },
    gender: {
      type: Type.STRING,
      description: "The gender of the target customer (e.g., Male, Female)."
    },
    userType: {
      type: Type.STRING,
      description: "The type of user (Power, Regular, At Risk)."
    },
    incomeBracket: {
      type: Type.STRING,
      description: "The annual income bracket of the user, e.g., 10-15 LPA."
    },
    daysOnboarded: {
      type: Type.STRING,
      description: "The number of days the user has been onboarded."
    },
    specialFestiveSeason: {
      type: Type.STRING,
      description: "Any special festive season mentioned, e.g., Diwali, Eid, Holi, Christmas."
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
      contents: `Analyze the user's request and extract the campaign parameters based on the provided schema. Only fill in the values that are explicitly mentioned in the request. The user's request is: "${prompt}"`,
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

export async function sendDataToWebhook(payload: Record<string, any>) {
  const webhookUrl = 'https://subhadevp.app.n8n.cloud/webhook-test/09e1de49-2634-424d-a0d3-52deaa861da6';
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
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
      contents: `A marketing campaign has been successfully approved and created. Generate a short, cheerful, and professional congratulatory success message for the product manager. Mention the campaign header which is "${campaign.Header}".`,
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
    return `Congratulations! The campaign "${campaign.Header}" has been successfully approved and created.`;
  }
}
