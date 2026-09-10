type MessageSchema = {
  text: string;
};
const message = 'data: {"text":"你好"}';
const res = parseTextMessage(message);
console.log(res);
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
