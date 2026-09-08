const chunks = [
  { choices: [{ index: 0, delta: { role: "assistant", content: "" } }] },
  { choices: [{ index: 0, delta: { reasoning_content: "正在思考" } }] },
  {
    choices: [{ index: 0, delta: { reasoning_content: "，准备回答" } }],
  },
  { choices: [] },
  {
    choices: [
      { index: 1, delta: { content: "这是另一个回答" } },
      { index: 0, delta: { content: "你好" } },
    ],
  },
  { choices: [{ index: 0, delta: { content: "，" } }] },
  { choices: [{ index: 0, delta: { content: "世界" } }] },
  { choices: [{ index: 0, delta: { content: "！" } }] },
  { choices: [{ index: 0, delta: {} }] },
];
/**
 * 要求只有两个：
- 从 chunks 中提取，不能直接写死答案。
- 没有 content 的消息不参与拼接。

输出：你好，世界！
 */
type Chunk = {
  choices: Choice[];
};
type Choice = {
  index: number;
  delta: Delta;
};
type Delta = {
  role?: string;
  reasoning_content?: string;
  content?: string;
};
type Response = {
  content: string;
  reasoning_content: string;
};

function outPut(list: Array<Chunk>): Response {
  let fullContent = "";
  let fullReasoningContent = "";
  list.forEach((item, index) => {
    const choices = item.choices || [];
    choices.forEach((choice) => {
      const { index, delta = {} } = choice;
      if (index !== 0) return;
      const content = delta.content || "";
      const reasoningContent = delta.reasoning_content || "";
      if (content !== "") {
        fullContent += content;
      }
      if (reasoningContent !== "") {
        fullReasoningContent += reasoningContent;
      }
    });
  });
  return {
    content: fullContent,
    reasoning_content: fullReasoningContent,
  };
}

const res = outPut(chunks);
console.log(res);
