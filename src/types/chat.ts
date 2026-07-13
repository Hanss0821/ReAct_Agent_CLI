// 请求
export type ChatCompletionRequest = {
  model: string;
  messages: ChatMessage[];
  tools?: ToolDefinition[];
};

export type ChatMessage =
  | {
      role: "system" | "user";
      content: string;
    }
  | {
      role: "assistant";
      content: string | null;
      tool_calls?: ToolCall[];
    }
  | {
      role: "tool";
      content: string;
      tool_call_id: string;
      name: string;
    };

export interface ToolDefinition {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

// 响应
export type ChatCompletionResponse = {
  id: string;
  created: number;
  model: string;
  choices: Choice[];
};

type Choice = {
  index: number;
  message: ChatMessage;
  finish_reason: "stop" | "tool_calls"; // "stop" | null 或文档里的联合类型
};

export type ToolCall = {
  id: string;
  type: "function";
  function: { name: string; arguments: string }; // arguments 是 string！
};
