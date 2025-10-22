import { GoogleGenAI, Type } from "@google/genai";
import type { CampaignParameters } from "../types";

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
