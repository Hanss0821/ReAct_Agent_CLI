import { request } from "./request.js";
import { tools } from "./tools.js";
import type {
  ChatCompletionRequest,
  ChatCompletionResponse,
  ChatCompletionOption,
  ChatMessage,
  Choice,
} from "./types/chat.js";

const maxRetries = 3; // 重试最大次数
const baseDelay = 600; // ms
const maxDelay = 8000;

export async function createChatCompletion(
  messages: ChatMessage[],
  { shouldRetry = false }: ChatCompletionOption = {},
): Promise<Choice> {
  const payload = {
    messages,
    model: "kimi-k2.7-code",
    tools: tools,
  } satisfies ChatCompletionRequest;
  let attempt = 0;
  while (true) {
    try {
      const data = await request<ChatCompletionResponse>(
        "/v1/chat/completions",
        {
          body: JSON.stringify(payload),
        },
      );
      if (!data.choices[0]) {
        throw new Error(`agent repeat fail`);
      }
      return data.choices[0];
    } catch (err) {
      if (shouldRetry && err instanceof Error) {
        // 是否超过限制
        if (attempt >= maxRetries) throw err;
        const expo = Math.min(maxDelay, baseDelay * 2 ** attempt);
        const jitter = Math.floor(Math.random() * 200); // 0～199ms 随机扰动
        const wait = expo + jitter;
        // 超时/网络
        if (
          err.message.includes("Connect Timeout") ||
          err.message.includes("fetch failed")
        ) {
          attempt += 1;
          // 等重试时间
          console.log("network error/timeout retry");
          await sleep(wait);
          continue;
        }
        // 5xx/429
        const matchCode = err.message.match(/status_(\d{3})/);
        if (matchCode) {
          const statusCode = Number(matchCode[1]);
          if (statusCode === 429 || (statusCode >= 500 && statusCode < 600)) {
            console.log(`${statusCode} retry`);
            await sleep(wait);
            attempt += 1;
            continue;
          }
        }
      }
      // 不重试走原逻辑，抛出错误
      throw err;
    }
  }
}

function sleep(ms: number) {
  return new Promise((resolve, rejected) => {
    setTimeout(() => {
      resolve("continue");
    }, ms);
  });
}
