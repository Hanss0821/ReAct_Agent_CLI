import { request } from "./request.js";
import type {
  ChatCompletionRequest,
  ChatCompletionResponse,
  ChatMessage,
} from "./types/chat.js";

export async function createChatCompletion(
  messages: ChatMessage[],
): Promise<ChatMessage> {
  const payload = {
    messages,
    model: "kimi-k2.7-code",
  } satisfies ChatCompletionRequest;

  const data = await request<ChatCompletionResponse>("/v1/chat/completions", {
    body: JSON.stringify(payload),
  });
  return data.choices[0].message;
}
