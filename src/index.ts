import type { ChatMessage, ToolMessage } from "./types/chat.js";
import { toolMaps, isToolName } from "./tools.js";
import { createChatCompletion } from "./client.js";

import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
const verbose = process.argv.includes("--verbose");
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
      const checkPoint = cacheMessage.length;
      cacheMessage.push({ role: "user", content: answer });
      try {
        // 工具可能会循环调用
        while (true) {
          verbose &&
            console.log(
              "[verbose] messages: ",
              JSON.stringify(cacheMessage, null, 2),
            );
          const res = await createChatCompletion(cacheMessage);
          cacheMessage.push(res.message);
          if (res.finish_reason === "tool_calls") {
            // 调用工具执行
            for (let tool of res.message.tool_calls) {
              const name = tool.function.name;
              const toolMessage: ToolMessage = {
                role: "tool",
                tool_call_id: tool.id,
                name,
                content: "",
              };
              try {
                const args = JSON.parse(tool.function.arguments);
                let fn;
                if (isToolName(name)) {
                  fn = toolMaps[name];
                }
                if (typeof fn === "function") {
                  const result = fn(args);
                  // 拿到工具执行结果，构建message，推送回大模型
                  toolMessage.content = result;
                } else {
                  toolMessage.content = `unknown Tool: ${name}`;
                }
              } catch (err) {
                if (err instanceof SyntaxError) {
                  // err.message更有利于模型做重试
                  toolMessage.content = `arguments parse error: ${err.message}`;
                } else {
                  toolMessage.content = `tool execution error: ${String(err)}`;
                }
              }
              cacheMessage.push(toolMessage);
            }
            continue;
          } else if (res.finish_reason === "stop") {
            console.log(res.message.content ?? "");
          } else {
            console.log("unknown finish_reason", res);
          }
          break;
        }
      } catch (err) {
        console.error(err);
        // 若询问失败，移除本次未成功请求的数据
        cacheMessage.length = checkPoint;
        continue;
      }
    }
  } catch (err) {
    // 处理ctrl+c的退出是进SIGINT监听，不是输入回调，这不是错误，需要处理
    if (err instanceof Error && err.name === "AbortError") return;
    console.error(err);
  }
}
