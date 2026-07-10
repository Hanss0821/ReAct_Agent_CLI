type ChatRole = "system" | "user" | "assistant";
type ChatContentPart =
  | {
      type: "text";
      text: string;
    }
  | {
      type: "image_url";
      image_url: {
        url: string;
      };
    }
  | {
      type: "video_url";
      video_url: {
        url: string;
      };
    };

// 请求
export type ChatCompletionRequest = {
  model: string;
  messages: ChatMessage[];
};

export type ChatMessage = {
  role: ChatRole;
  content: string | ChatContentPart[];
};

// 响应
export type ChatCompletionResponse = {
  id: string;
  created: number;
  model: string;
  choices: Choice[];
};

type Choice = {
  index: number;
  message: ChatMessage; // Week1：与历史消息同形
  finish_reason: string; // "stop" | null 或文档里的联合类型
};
