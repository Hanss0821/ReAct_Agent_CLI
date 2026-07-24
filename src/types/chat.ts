// 请求
export type ChatCompletionRequest = {
  model: string;
  messages: ChatMessage[];
  tools?: ToolDefinition[];
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
