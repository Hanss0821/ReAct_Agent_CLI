const baseURL: string = process.env.MOONSHOT_BASE_API || "";

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
    if (!baseURL) throw new Error("api无效");
    const res = await fetch(`${baseURL}${url}`, params);
    if (!res.ok) {
      throw new Error(`${res.status}_${res.statusText}`);
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
