type SplitResult = {
  messages: string[];
  text: string;
  remainder: string;
};
type MessageSchema = {
  text: string;
};
function isObject(data: unknown): data is Record<string, unknown> {
  return typeof data === "object" && data !== null && !(data instanceof Array);
}
function isMessageSchema(data: unknown): data is MessageSchema {
  return isObject(data) && "text" in data && typeof data.text === "string";
}

function parseTextMessage(message: string): string {
  const startIndex = message.indexOf("data:");
  if (startIndex !== 0) {
    throw new Error("缺少前缀");
  }
  const text = message.slice(startIndex + 5);
  try {
    const data: unknown = JSON.parse(text);
    if (!isObject(data)) {
      throw new Error("结构不合要求");
    }
    if (!isMessageSchema(data)) {
      throw new Error("字段不合要求");
    }
    return data.text;
  } catch (err) {
    throw new Error("非法JSON");
  }
}

function splitMessages(chunks: string[]): SplitResult {
  if (chunks.length === 0) {
    return {
      messages: [],
      text: "",
      remainder: "",
    };
  }
  let pendingText = "";
  let text = "";
  let messages: string[] = [];
  for (let chunk of chunks) {
    pendingText += chunk;
    while (true) {
      // 一条消息中可能存在多个\n\n
      const endIndex = pendingText.indexOf("\n\n");
      // 非完整句，跳过
      if (endIndex === -1) {
        break;
      }
      // 取出一条事件
      const event = pendingText.slice(0, endIndex);
      // 剩余内容加入下一轮
      pendingText = pendingText.slice(endIndex + 2);
      try {
        text += parseTextMessage(event);
        messages.push(event);
      } catch (err) {
        throw err;
      }
    }
  }
  return {
    messages,
    text,
    remainder: pendingText,
  };
}

const chunks = [
  'data: {"text":"你',
  '好"}\n\ndata: {"text":"，"}\n\ndata: {"text":"世',
  '界"}\n\ndata: {"text":"未完',
];

const res = splitMessages(chunks);
console.log(res);
