import type { ChatMessage } from "./types/chat.js";
import { createChatCompletion } from "./client.js";

import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

const rl = readline.createInterface({ input, output });
// 监听ctrl+c退出的信号
process.on("SIGINT", () => {
  rl.close();
  process.exit(0);
});

const cacheMessage: ChatMessage[] = [];
main();

async function main() {
  try {
    console.log("Welcome To Kimi Agent! (Press Ctrl+C to quit)");
    while (true) {
      const answer = await rl.question("input your question: ");
      if (answer.trim() === "") {
        console.log("invalid input try again");
        continue;
      }
      console.log("Thinking....");
      cacheMessage.push({ role: "user", content: answer });
      let data: ChatMessage;
      try {
        // 内层只包住请求：失败时才撤回刚 push 的 user
        data = await createChatCompletion(cacheMessage);
      } catch (err) {
        console.error(err);
        // 若询问失败，移除本次未成功请求的数据
        cacheMessage.pop();
        continue;
      }
      cacheMessage.push(data);
      console.log(data.content);
    }
  } catch (err) {
    // AbortError 兜底（SIGINT 通常已直接 exit）
    if (err instanceof Error && err.name === "AbortError") return;
    console.error(err);
  }
}
