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

export async function analyzePromptWithAI(prompt: string): Promise<CampaignParameters> {
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
    
    // Ensure all keys are present, even if empty
    const fullParams: CampaignParameters = {
        merchantCategory: '',
        age: '',
        gender: '',
        userType: '',
        incomeBracket: '',
        daysOnboarded: '',
        specialFestiveSeason: '',
        ...parsedJson
    };

    return fullParams;

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

export async function sendApprovalToWebhook(payload: Campaign) {
  const webhookUrl = 'https://subhadevp.app.n8n.cloud/webhook-test/4e00e3d9-587c-4e17-a287-56d77ee0d684';
  
  // Transform the payload to the format expected by the webhook
  const webhookPayload = [
    {
      "Campaign ID": payload.Campaign_ID,
      "Campaign Date": payload.Campaign_Date,
      "Channel": payload.Channel,
      "Header": payload.Header,
      "Body": payload.Body,
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
