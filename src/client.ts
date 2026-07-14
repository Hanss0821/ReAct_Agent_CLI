import { request } from "./request.js";
import { tool as readFileTool } from "./tools.js";
import type {
  ChatCompletionRequest,
  ChatCompletionResponse,
  ChatMessage,
  Choice,
} from "./types/chat.js";

export async function createChatCompletion(
  messages: ChatMessage[],
): Promise<Choice> {
  const payload = {
    messages,
    model: "kimi-k2.7-code",
    tools: [readFileTool],
  } satisfies ChatCompletionRequest;

  const data = await request<ChatCompletionResponse>("/v1/chat/completions", {
    body: JSON.stringify(payload),
  });
  if (!data.choices[0]) {
    throw new Error(`agent repeat fail`);
  }
  return data.choices[0];
}
