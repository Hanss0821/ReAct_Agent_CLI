type SplitResult = {
  messages: string[];
  remainder: string;
};

const chunks = ["A\n\nB\n\n"];

/**
   * 
   * @param chunks 
   * // 期望返回
  {
    messages: [
      'data: {"text":"你好"}',
      'data: {"text":"世界"}',
    ],
    remainder: '',
  }
   */
const res = splitMessages(chunks);
console.log(res);
function splitMessages(chunks: string[]): SplitResult {
  if (chunks.length === 0) {
    return {
      messages: [],
      remainder: "",
    };
  }
  let pendingText = "";
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
      messages.push(event);
    }
  }
  return {
    messages,
    remainder: pendingText,
  };
}
type ToolConfig = {
  name: string;
  description: string;
  enabled: boolean;
};

{
  type ToolSummary = Pick<ToolConfig, "name" | "description">;
  const a: ToolSummary = {
    name: "read_file",
    description: "读取文件",
  };

  const b: ToolSummary = {
    name: "search",
    description: "",
  };

  const c: ToolSummary = {
    name: "read_file",
  }; // 应报错：缺少 description

  const d: ToolSummary = {
    name: "read_file",
    description: 123,
  }; // 应报错：description 类型错误
  type ToolPatch = Partial<ToolConfig>;
  const original: ToolConfig = {
    name: "read_file",
    description: "读取文件",
    enabled: true,
  };

  updateTool(original, { enabled: false });
  // 返回：
  // {
  //   name: "read_file",
  //   description: "读取文件",
  //   enabled: false,
  // }

  updateTool(original, {}); // 合法，返回内容与原配置一致

  updateTool(original, { enabled: "否" }); // 应有类型错误

  function updateTool(config: ToolConfig, patch: ToolPatch) {
    return {
      ...config,
      ...patch,
    };
  }
}
