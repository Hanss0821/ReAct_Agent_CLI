type Fragment = {
  index: number;
  id?: string;
  function: {
    name?: string;
    arguments: string;
  };
};

type Tool = {
  index: number;
  id: string;
  name: string;
  arguments: Record<string, unknown>;
};

function isArgumentsObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
const fragments = [
  {
    index: 0,
    id: "call_a",
    function: {
      name: "read_file",
      arguments: '{"pa',
    },
  },
  {
    index: 1,
    id: "call_b",
    function: {
      name: "read_file",
      arguments: '{"path":"ts',
    },
  },
  {
    index: 0,
    function: {
      arguments: 'th":"package.json"}',
    },
  },
  {
    index: 1,
    function: {
      arguments: 'config.json"}',
    },
  },
];

const res = spliceFragments(fragments);
console.log(res);

function spliceFragments(fragments: Fragment[]): Tool[] {
  // 存放工具，index作为key的标识
  const toolMap = new Map<number, Fragment[]>();
  const fullToolList: Tool[] = [];
  for (let item of fragments) {
    // 先找出同个工具片段
    const { index } = item;
    if (!toolMap.has(index)) {
      toolMap.set(index, []);
    }
    const toolList = toolMap.get(index) || [];
    toolList.push(item);
  }

  for (const [index, group] of toolMap) {
    let id: string | undefined;
    let name: string | undefined;
    let parsedArguments: unknown;
    let content = "";
    for (const fragment of group) {
      if (id === undefined && fragment.id !== undefined) {
        id = fragment.id;
      }
      if (name === undefined && fragment.function.name !== undefined) {
        name = fragment.function.name;
      }
      content += fragment.function.arguments;
    }
    try {
      // 完整句
      parsedArguments = JSON.parse(content);
    } catch (err) {
      throw new Error(`工具 index=${index} 的参数不是合法 JSON`);
    }
    // 先检查：字段有没有收齐
    if (index === undefined || id === undefined || name === undefined) {
      throw new Error(`工具 index=${index} 的字段不完整`);
    }
    if (!isArgumentsObject(parsedArguments)) {
      throw new Error(`工具 index=${index} 的参数必须是对象`);
    }

    fullToolList.push({
      index: index,
      id: id,
      name: name,
      arguments: parsedArguments,
    });
  }
  return fullToolList;
}
