// 请求
export type ChatCompletionRequest = {
  model: string;
  messages: ChatMessage[];
  tools?: ToolDefinition[];
  stream?: boolean;
};

export type ChatCompletionOption = {
  shouldRetry?: boolean;
};
// 联合类型会做自动分发
export type ChatMessage = SystemUserMessage | ToolMessage | AssistantMessage;
// 对massage做进一步拆分
type SystemUserMessage = {
  role: "system" | "user";
  content: string;
};
type AssistantMessage = {
  role: "assistant";
  content: string | null;
  reasoning_content?: string | null;
  tool_calls?: ToolCall[];
};
export type ToolMessage = {
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

// 单条流式 JSON 消息
export type ChatCompletionChunk = {
  id: string;
  object: "chat.completion.chunk";
  created: number;
  model: string;
  choices: ChunkChoice[];
};

// 这一条消息，对某个回答新增了什么
export type ChunkChoice = {
  index: number;
  delta: ChatCompletionDelta;
  finish_reason: "stop" | "length" | "tool_calls" | null;
};

// 新增内容：可能只有正文，也可能只有工具参数，甚至是空对象
export type ChatCompletionDelta = {
  role?: "assistant";
  content?: string | null;
  reasoning_content?: string | null;
  tool_calls?: ToolCallDelta[];
};

// 一次工具调用的局部信息
export type ToolCallDelta = {
  index: number;
  id?: string;
  type?: "function";
  function?: {
    name?: string;
    arguments?: string;
  };
};
export type Choice = {
  index: number;
} & (
  | { finish_reason: "stop"; message: AssistantMessage }
  | {
      finish_reason: "tool_calls";
      message: AssistantMessage & { tool_calls: ToolCall[] };
    }
);

export type ToolCall = {
  id: string;
  type: "function";
  function: { name: string; arguments: string }; // arguments 是 string！
};

// 搜索工具参数
export type SearchCallResponse = {
  query: string;
  responseTime: number;
  results: SearchCall[];
};
// 工具结果
export type SearchCall = {
  title: string;
  url: string;
  content: string;
};
// 工具类型
export type ReadFileArgs = { path: string };
export type ExecShellArgs = { command: string };
export type WebSearchArgs = { query: string };

export type ToolMap = {
  read_file: (args: ReadFileArgs) => Promise<string>;
  shell_tool: (args: ExecShellArgs) => Promise<string>;
  web_search: (args: WebSearchArgs) => Promise<string>;
};
