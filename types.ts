export enum Sender {
  User = 'user',
  AI = 'ai',
  System = 'system',
}

export enum MessageType {
  Text = 'text',
  FunctionCall = 'function_call',
  FunctionResult = 'function_result',
}

export interface FunctionCallData {
  name: string;
  args: any;
}

export interface FunctionResultData {
  name: string;
  result: any;
}

export interface Message {
  id: string;
  sender: Sender;
  type: MessageType;
  content: string;
  functionCall?: FunctionCallData;
  functionResult?: FunctionResultData;
  isApproved?: boolean;
}

export interface CampaignParameters {
  segmentName: string;
  merchantCategory: string;
  age: string;
  gender: string;
  userType: 'Power' | 'Regular' | 'At Risk' | '';
  incomeBracket: string;
  daysOnboarded: string;
  specialFestiveSeason: string;
}

export interface Campaign {
  Campaign_Date: string;
  Body: string;
  Campaign_ID: string;
  Header: string;
  Channel: string[];
}
