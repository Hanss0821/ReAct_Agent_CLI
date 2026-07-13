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
      if (answer === "") {
        console.log("invalid input try again");
        continue;
      }
      console.log("Thinking....");
      cacheMessage.push({ role: "user", content: answer });
      let data: ChatMessage;
      try {
        data = await createChatCompletion(cacheMessage);
      } catch (err) {
        console.error(err);
        // 若询问失败，移除本次未成功请求的数据
        cacheMessage.pop();
        continue;
      }
      console.log(data.content);
      cacheMessage.push(data);
    }
  } catch (err) {
    // 处理ctrl+c的退出是进SIGINT监听，不是输入回调，这不是错误，需要处理
    if (err instanceof Error && err.name === "AbortError") return;
    console.error(err);
  }
}
