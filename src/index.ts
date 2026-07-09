import type {
  Message,
  choicesMessage,
  ResponseData,
  Model,
  FetchOptions,
} from "./types/model.js";

const payload = {
  messages: [{ role: "user", content: "你好" }],
  model: "kimi-k2.7-code",
} satisfies Model;
const body = JSON.stringify(payload);

const options: FetchOptions = {
  method: "POST",
  headers: {
    Authorization: "Bearer " + process.env.MOONSHOT_API_KEY,
    "Content-Type": "application/json",
  },
  body,
};

main();

async function main() {
  try {
    const baseURL: string = process.env.MOONSHOT_BASE_API || "";
    if (!baseURL) throw new Error("api无效");
    const cacheMessage: (Message | choicesMessage)[] = [];
    const res = await fetch(`${baseURL}/v1/chat/completions`, options);
    if (!res.ok) {
      throw new Error(`${res.status}_${res.statusText}`);
    }
    const data = (await res.json()) as ResponseData;
    console.log(data.choices[0].message.content);
  } catch (err) {
    console.error(err);
  }
}
