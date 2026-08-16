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

/** 一段 SSE 事件的句号：连续两个换行 */
const SSE_BLANK_LINE = "\n\n";
const SSE_DATA_PREFIX = "data:";
const SSE_STREAM_END = "[DONE]";

type SseCutResult = {
  /** 已经写完、可以交给业务层的 JSON */
  payloads: unknown[];
  /** 还没写完的半截，留给下一轮拼接 */
  pendingText: string;
  /** 服务器发来了结束标记 */
  streamFinished: boolean;
};

/**
 * 只负责「剪纸条」：把已经出现空行的完整段剪出来。
 * 半截句子原样放回 pendingText，不在这里等网络。
 */
function cutCompleteSsePayloads(pendingText: string): SseCutResult {
  const payloads: unknown[] = [];

  while (true) {
    const blankLineAt = pendingText.indexOf(SSE_BLANK_LINE);
    // 还没有句号：整段都是半截，等邮差再送字
    if (blankLineAt === -1) {
      return { payloads, pendingText, streamFinished: false };
    }

    const eventBlock = pendingText.slice(0, blankLineAt);
    pendingText = pendingText.slice(blankLineAt + SSE_BLANK_LINE.length);

    const dataPrefixAt = eventBlock.indexOf(SSE_DATA_PREFIX);
    // 空段或心跳（: ping）不是业务数据，看下一段
    if (dataPrefixAt === -1 || eventBlock.trim() === "") {
      continue;
    }

    const dataText = eventBlock
      .slice(dataPrefixAt + SSE_DATA_PREFIX.length)
      .trim();

    if (dataText.includes(SSE_STREAM_END)) {
      return { payloads, pendingText: "", streamFinished: true };
    }

    payloads.push(JSON.parse(dataText));
  }
}

/** 流式请求：外层只读网络，剪事件交给 cutCompleteSsePayloads */
export async function* streamRequest(
  url: string,
  options?: Omit<RequestInit, "headers">,
) {
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
      const errorBody = await res.text();
      throw new Error(`status_${res.status}_${errorBody}`);
    }
    if (!res.body) {
      throw new Error(`Response has no body (stream not supported or error)`);
    }

    let pendingText = "";
    const reader = res.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { value: bytes, done: streamClosed } = await reader.read();
      // 流结束时无参 decode，把藏在 decoder 里的半个汉字吐出来
      pendingText += streamClosed
        ? decoder.decode()
        : decoder.decode(bytes, { stream: true });

      const cut = cutCompleteSsePayloads(pendingText);
      pendingText = cut.pendingText;
      for (const payload of cut.payloads) {
        yield payload;
      }

      if (cut.streamFinished || streamClosed) {
        return;
      }
    }
  } catch (err) {
    if (err instanceof Error) {
      throw new Error(`[${url}] ${err.message}`, { cause: err });
    }
    throw err;
  }
}