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
  if (!data.choices[0] || !data.choices[0].message) {
    throw new Error(`agent repeat fail`);
  }
  return data.choices[0].message;
}
