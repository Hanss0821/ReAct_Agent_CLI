export type Message = {
  role: string;
  content: string;
};

export type Model = {
  messages: Message[];
  model: string;
};

export type FetchOptions = {
  method: string;
  headers: Record<string, string>;
  body: string;
};

export interface ChoicesMessage {
  role: string;
  content: string;
  tool_calss?: object[];
}

export interface choicesType {
  index: number;
  message: ChoicesMessage;
  finish_reason: string;
}

export type ResponseData = {
  id: string;
  created: number;
  model: string;
  choices: choicesType[];
};
