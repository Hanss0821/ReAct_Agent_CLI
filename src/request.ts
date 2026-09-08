import type {
  ChatCompletionChunk,
  ChatCompletionResponse,
  ChunkChoice,
  ToolCall,
} from "./types/chat.js";
const baseURL: string = process.env.MOONSHOT_BASE_API || "";

// 调试用：下一次 request 模拟网络失败，触发后自动复位
let simulateOfflineOnce = false;

export function armSimulateOfflineOnce() {
  simulateOfflineOnce = true;
}

export async function request<T>(
  url: string,
  options?: Omit<RequestInit, "headers">,
): Promise<T> {
  const params = {
    method: "POST",
    headers: {
      Authorization: "Bearer " + process.env.MOONSHOT_API_KEY,
      "Content-Type": "application/json",
    },
    ...options,
  };

  try {
    if (!baseURL) throw new Error("api inVaild");
    if (simulateOfflineOnce) {
      simulateOfflineOnce = false;
      throw new Error("Connect Timeout Error (simulated)", {
        cause: new Error("UND_ERR_CONNECT_TIMEOUT"),
      });
    }
    const res = await fetch(`${baseURL}${url}`, params);
    if (!res.ok) {
      throw new Error(`status_${res.status}_${res.statusText}`);
    }
    return (await res.json()) as T;
  } catch (err) {
    // 保留原始错误，在 message 中附带请求路径
    if (err instanceof Error) {
      throw new Error(`[${url}] ${err.message}`, { cause: err });
    }
    throw err;
  }
}

// 流式请求单独处理
export async function requestStream(
  url: string,
  options?: Omit<RequestInit, "headers">,
): Promise<ChatCompletionResponse> {
  const params = {
    method: "POST",
    headers: {
      Authorization: "Bearer " + process.env.MOONSHOT_API_KEY,
      "Content-Type": "application/json",
    },
    ...options,
  };

  try {
    if (!baseURL) throw new Error("api inVaild");
    if (simulateOfflineOnce) {
      simulateOfflineOnce = false;
      throw new Error("Connect Timeout Error (simulated)", {
        cause: new Error("UND_ERR_CONNECT_TIMEOUT"),
      });
    }
    const res = await fetch(`${baseURL}${url}`, params);
    if (!res.ok) {
      throw new Error(`status_${res.status}_${await res.text()}`);
    }
    if (!res.body) {
      throw new Error("响应正文为空");
    }
    // 创建阅读器
    const reader = res.body.getReader();
    // 创建解码器：默认按 UTF-8 将字节还原成文字
    const decoder = new TextDecoder();
    let pendingText = "";
    let fullContent = "";
    let fullReasoningContent = "";
    const toolCalls = new Map<number, ToolCall>();
    // 保存响应的基本信息，收到第一条 chunk 后再赋值
    let metadata:
      | {
          id: string;
          created: number;
          model: string;
        }
      | undefined;

    // 保存服务端报告的结束原因
    let finishReason: ChunkChoice["finish_reason"] = null;
    try {
      while (true) {
        // 获取字节码内容
        const { value, done } = await reader.read();
        if (done) {
          throw new Error("流式响应中断：尚未收到 [DONE]");
        }
        let text = decoder.decode(value, { stream: true }); // 流读取，因为一次读取未必是单字节
        // 原样保存：这里不去掉 data:，也不 trim
        pendingText += text;
        while (true) {
          // 同时识别 \n\n 和 \r\n\r\n
          const boundary = /\r?\n\r?\n/.exec(pendingText);
          if (boundary === null) {
            // 没有完整事件，保留文字，等下一次网络读取
            break;
          }
          const endIndex = boundary.index; // 分隔符从哪里开始
          const separatorLength = boundary[0].length; // 分隔符内容的长度
          // 取出一条事件
          const eventText = pendingText.slice(0, endIndex);
          // 删除已取出的事件和分隔符，保留剩余部分
          pendingText = pendingText.slice(endIndex + separatorLength);
          if (!eventText.startsWith("data:")) {
            continue;
          }
          // 从第 5 个位置开始取，跳过 data:
          const dataText = eventText.slice(5).trim();
          // 标识流式输出结束
          if (dataText === "[DONE]") {
            process.stdout.write("\n");
            if (!metadata || finishReason === null) {
              throw new Error("流式响应不完整：缺少基本信息或结束原因");
            }
            if (finishReason === "tool_calls") {
              // 按调用编号排序，再取出累计好的工具调用
              const completedTools = [...toolCalls.entries()]
                .sort(([leftIndex], [rightIndex]) => leftIndex - rightIndex)
                .map(([, tool]) => tool);

              if (
                completedTools.length === 0 ||
                completedTools.some((tool) => !tool.id || !tool.function.name)
              ) {
                throw new Error("工具调用不完整：缺少调用信息");
              }
              return {
                id: metadata.id,
                created: metadata.created,
                model: metadata.model,
                choices: [
                  {
                    index: 0,
                    finish_reason: "tool_calls",
                    message: {
                      role: "assistant",
                      content: fullContent || null,
                      reasoning_content: fullReasoningContent,
                      tool_calls: completedTools,
                    },
                  },
                ],
              };
            }
            if (finishReason !== "stop") {
              throw new Error(`当前尚未处理此结束原因：${finishReason}`);
            }
            return {
              id: metadata.id,
              created: metadata.created,
              model: metadata.model,
              choices: [
                {
                  index: 0,
                  finish_reason: finishReason,
                  message: {
                    role: "assistant",
                    content: fullContent,
                    reasoning_content: fullReasoningContent,
                  },
                },
              ],
            };
          }
          const chunk: ChatCompletionChunk = JSON.parse(dataText);
          // 第一条消息到达时，保存基本信息
          if (!metadata) {
            metadata = {
              id: chunk.id,
              created: chunk.created,
              model: chunk.model,
            };
          }
          const choice = chunk.choices[0];

          // 某些用量统计消息的 choices 是空数组
          if (!choice) {
            continue;
          }

          // 记录结束原因；中途的 null 不覆盖已有结果
          if (choice.finish_reason !== null) {
            finishReason = choice.finish_reason;
          }

          const reasoning = choice.delta.reasoning_content;
          if (typeof reasoning === "string") {
            fullReasoningContent += reasoning;
          }

          const content = choice.delta.content;
          if (typeof content === "string" && content !== "") {
            fullContent += content;
            process.stdout.write(content);
          }
          // 处理工具调用
          for (const fragment of choice.delta.tool_calls ?? []) {
            // 找到这个编号之前累计的工具调用
            let current = toolCalls.get(fragment.index);

            // 首次遇到这个编号，创建一个存放位置
            if (!current) {
              current = {
                id: "",
                type: "function",
                function: {
                  name: "",
                  arguments: "",
                },
              };

              toolCalls.set(fragment.index, current);
            }

            // id 和名称通常在首个片段提供，后面缺失时不要覆盖
            if (fragment.id) {
              current.id = fragment.id;
            }

            if (fragment.function?.name) {
              current.function.name = fragment.function.name;
            }

            // 参数会分段到达，需要追加
            if (typeof fragment.function?.arguments === "string") {
              current.function.arguments += fragment.function.arguments;
            }
          }
        }
      }
    } finally {
      try {
        await reader.cancel();
      } finally {
        reader.releaseLock();
      }
    }
  } catch (err) {
    // 保留原始错误，在 message 中附带请求路径
    if (err instanceof Error) {
      throw new Error(`[${url}] ${err.message}`, { cause: err });
    }
    throw err;
  }
}
