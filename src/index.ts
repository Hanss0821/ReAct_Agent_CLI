import type {
  Message,
  ChoicesMessage,
  ResponseData,
  Model,
  FetchOptions,
} from "./types/model.js";

import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

const rl = readline.createInterface({ input, output });
// 监听ctrl+c退出的信号
process.on("SIGINT", () => {
  rl.close();
  process.exit(0);
});
const cacheMessage: (Message | ChoicesMessage)[] = [];
main();
async function main() {
  try {
    console.log("Welcome To Kimi Agent! (Press Ctrl+C to quit)");
    while (true) {
      const answer = await rl.question("input your question: ");
      // if (answer === ".quit") {
      //   rl.close();
      //   break;
      // }
      console.log("Thinking....");
      cacheMessage.push({ role: "user", content: answer });
      const data = await reqAgent(cacheMessage);
      if (data) {
        console.log(data.content);
        cacheMessage.push(data);
      }
    }
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") return;
    console.error(err);
  }
}

async function reqAgent(messages: ChoicesMessage[]) {
  const payload = {
    messages: messages,
    model: "kimi-k2.7-code",
  } satisfies Model;

  const body = JSON.stringify(payload);

  const options: FetchOptions = {
    method: "POST",
    headers: {
      Authorization: "Bearer " + process.env.MOONSHOT_API_KEY,
      "Content-Type": "application/json",
    },
    body,
  };

  try {
    const baseURL: string = process.env.MOONSHOT_BASE_API || "";
    if (!baseURL) throw new Error("api无效");
    const res = await fetch(`${baseURL}/v1/chat/completions`, options);
    if (!res.ok) {
      throw new Error(`${res.status}_${res.statusText}`);
    }
    const data = (await res.json()) as ResponseData;
    return data.choices[0].message;
  } catch (err) {
    console.error(err);
  }
}
