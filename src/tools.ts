import type { ToolDefinition } from "./types/chat.js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { execFileSync } from "node:child_process";
import type { ToolMap, ReadFileArgs, ExecShellArgs } from "./types/chat.js";

export const toolMaps: ToolMap = {
  read_file,
  shell_tool,
};
export function isToolName(name: string): name is keyof ToolMap {
  return name in toolMaps;
}
export const tools: ToolDefinition[] = [
  {
    type: "function", // 约定的字段 type，目前支持 function 作为值
    function: {
      // 当 type 为 function 时，使用 function 字段定义具体的函数内容
      name: "read_file", // 函数的名称，请使用英文大小写字母、数据加上减号和下划线作为函数名称
      description:
        "通过path检索文件路径，并读取文件的内容，返回UTF-8格式的结果，当用户明确文件名或提供路径时，调用此工具进行检索",
      parameters: {
        // 使用 parameters 字段来定义函数接收的参数
        type: "object", // 固定使用 type: object 来使 Kimi 大模型生成一个 JSON Object 参数
        required: ["path"], // 使用 required 字段告诉 Kimi 大模型哪些参数是必填项
        properties: {
          // properties 中是具体的参数定义，你可以定义多个参数
          path: {
            // 在这里，key 是参数名称，value 是参数的具体定义
            type: "string", // 使用 type 定义参数类型
            description: "用于查询的文件路径",
          },
        },
      },
    },
  },
  {
    type: "function", // 约定的字段 type，目前支持 function 作为值
    function: {
      // 当 type 为 function 时，使用 function 字段定义具体的函数内容
      name: "shell_tool", // 函数的名称，请使用英文大小写字母、数据加上减号和下划线作为函数名称
      description:
        "通过白名单所提供的shell命令，执行shell操作(只能跑白名单里的 git 只读子命令，列文件用 git ls-files)",
      parameters: {
        // 使用 parameters 字段来定义函数接收的参数
        type: "object", // 固定使用 type: object 来使 Kimi 大模型生成一个 JSON Object 参数
        required: ["command"], // 使用 required 字段告诉 Kimi 大模型哪些参数是必填项
        properties: {
          // properties 中是具体的参数定义，你可以定义多个参数
          command: {
            // 在这里，key 是参数名称，value 是参数的具体定义
            type: "string", // 使用 type 定义参数类型
            description: "用于执行的shell命令",
          },
        },
      },
    },
  },
];

// const __dirname = new URL(".", import.meta.url).pathname; // windows下/D:/Project/会被当成路径，拼接变成D: + /D:/Project/
// 当前文件完整路径 fileURLToPath
// 当前文件所在目录 dirname
// const __dirname = dirname(fileURLToPath(import.meta.url));
export function read_file({ path }: ReadFileArgs) {
  // __dirname 在 CommonJS (require/module.exports) 中是内置变量，
  // 但在 ES module (import/export) 中并不是，需要自己定义。
  const resolvePath = resolve(path);
  return new Promise<string>((res, rej) => {
    try {
      res(readFileSync(resolvePath, "utf-8"));
    } catch (err) {
      if (err instanceof Error) {
        rej(err.message);
        return;
      }
      rej(String(err)); // 失败当观察结果
    }
  });
}

const ALLOWED_COMMANDS = ["git"];
const ALLOWED_GIT_SUBCOMMANDS = ["status", "log", "diff", "ls-files"];

// shell命令工具
export function shell_tool({ command }: ExecShellArgs) {
  const parts = command.split(" "); // 按空格拆成数组
  const cmd = parts[0];
  const args = parts.slice(1); // 剩余部分
  return new Promise<string>((res, rej) => {
    // 不符合白名单的命令不能抛错，错误和业务逻辑应该逻辑清晰，不要混淆，不允许是业务期望结果，不是错误
    if (!ALLOWED_COMMANDS.includes(cmd)) {
      res(`command rejected: ${cmd} is not allowed`);
      return;
    }
    if (cmd === "git") {
      const sub = args[0];
      if (!sub) {
        res(`command rejected: git undefined is not allowed `);
        return;
      }
      if (!ALLOWED_GIT_SUBCOMMANDS.includes(args[0])) {
        res(`command rejected: git ${args[0]} is not allowed`);
        return;
      }
    }
    try {
      res(execFileSync(cmd, args, { encoding: "utf-8" }));
    } catch (err) {
      if (err instanceof Error) {
        rej(err.message);
        return;
      }
      rej(String(err));
    }
  });
}

// 判断工具调用是否超时
export function withTimeout<T>(promise: Promise<T>, ms: number) {
  // 返回值回拿各工具联合类型的结果
  return Promise.race([promise, sleepThenReject(ms, "tool timeout....")]);
}

// 工具函数：超时请求
export function sleepThenReject(ms: number, message: string) {
  // 只有reject的情况用never 成功时……不存在（永远不会成功落成某个值）
  return new Promise<never>((res, rej) => {
    setTimeout(() => {
      rej(message);
    }, ms);
  });
}
