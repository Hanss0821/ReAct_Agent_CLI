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
      console.log("Thinking....");
      cacheMessage.push({ role: "user", content: answer });
      const data = await createChatCompletion(cacheMessage);
      console.log(data.content);
      cacheMessage.push(data);
    }
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") return;
    console.error(err);
  }
}
