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
export async function requestStream<T>(
  url: string,
  options?: Omit<RequestInit, "headers">,
): Promise<void> {
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
    try {
      while (true) {
        // 获取字节码内容
        const { value, done } = await reader.read();
        if (done) {
          // 正文结束，完成解码器的收尾
          const remainingText = decoder.decode();
          if (remainingText) {
            console.log("最后剩余的文字：", remainingText);
          }
          console.log("响应正文已全部读完");
          break;
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
          const endIndex = boundary.index; // 到分隔符前的长度
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
          if (dataText === "[DONE]") {
            process.stdout.write("\n");
            return;
          }
          const chunk = JSON.parse(dataText);
          const content = chunk.choices[0]?.delta?.content;
          if (typeof content === "string" && content !== "") {
            fullContent += content;
            process.stdout.write(content);
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
