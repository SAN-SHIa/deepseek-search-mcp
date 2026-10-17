#!/usr/bin/env node
// DeepSeek Search/Fetch MCP server (stdio, 零依赖)
// 文档: https://api-docs.deepseek.com/zh-cn/guides/search/
// 鉴权: 环境变量 DEEPSEEK_API_KEY

const API_BASE = "https://api.deepseek.com/v1/tools";
const API_KEY = process.env.DEEPSEEK_API_KEY || "";
const FETCH_MAX_CHARS = 60000;

const TOOLS = [
  {
    name: "deepseek_web_search",
    description:
      "使用 DeepSeek 自研搜索引擎搜索网页，返回结构化结果（标题、URL、日期、相关度、摘要）。" +
      "查询支持语法：site: 限定站点、-关键词 排除、\"精确短语\"、lang: 语言、after:/before: 日期。" +
      "计费：每 1000 次成功请求 5 元，失败不计费。",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "搜索词，1~128 个字符" },
        count: { type: "integer", description: "返回条数，1~50，默认 50", default: 50 },
        need_content: { type: "boolean", description: "是否返回网页正文，默认 false", default: false },
        ori_question: { type: "string", description: "触发搜索的原始用户问题（可选，帮助理解意图）" },
        localization: { type: "string", description: "用于本地化结果的 IP 地址（可选）" }
      },
      required: ["query"]
    }
  },
  {
    name: "deepseek_fetch",
    description:
      "用 DeepSeek Fetch 抓取单个网页，以 Markdown 正文返回。适合读取某条搜索结果或指定文章的全文。",
    inputSchema: {
      type: "object",
      properties: {
        url: { type: "string", description: "要抓取的 HTTP/HTTPS URL" }
      },
      required: ["url"]
    }
  }
];

function send(msg) {
  process.stdout.write(JSON.stringify(msg) + "\n");
}
const reply = (id, result) => send({ jsonrpc: "2.0", id, result });
const replyError = (id, code, message) => send({ jsonrpc: "2.0", id, error: { code, message } });

async function callApi(path, body) {
  if (!API_KEY) throw new Error("DEEPSEEK_API_KEY 未设置，请在 MCP 配置的 env 中提供");
  const res = await fetch(`${API_BASE}/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });
  const text = await res.text();
  if (!res.ok) {
    // 408/429/5xx 可重试；402 需充值；其它 4xx 是请求问题，不要重试
    throw new Error(`DeepSeek API HTTP ${res.status}: ${text.slice(0, 500)}`);
  }
  return JSON.parse(text);
}

function fmtSearch(r) {
  const items = r.results || [];
  const lines = [`共 ${items.length} 条结果：`];
  items.forEach((x, i) => {
    lines.push(`\n${i + 1}. ${x.title ?? "(无标题)"}${x.site_name ? ` — ${x.site_name}` : ""}`);
    if (x.date) lines.push(`   日期: ${x.date}`);
    lines.push(`   URL: ${x.url}`);
    if (x.rerank_score != null) lines.push(`   相关度: ${Number(x.rerank_score).toFixed(2)}`);
    if (x.summary) lines.push(`   摘要: ${x.summary}`);
    if (x.content) lines.push(`   正文: ${String(x.content).slice(0, 3000)}`);
  });
  return lines.join("\n");
}

async function onToolCall(name, args) {
  if (name === "deepseek_web_search") {
    const body = { query: String(args.query ?? "").slice(0, 128) };
    body.count = args.count != null ? Math.min(50, Math.max(1, Math.trunc(args.count))) : 50;
    if (args.need_content != null) body.need_content = Boolean(args.need_content);
    if (args.ori_question) body.ori_question = String(args.ori_question).slice(0, 128);
    if (args.localization) body.localization = String(args.localization);
    const r = await callApi("search", body);
    return { content: [{ type: "text", text: fmtSearch(r) }] };
  }
  if (name === "deepseek_fetch") {
    const r = await callApi("fetch", { url: String(args.url ?? "") });
    const content = String(r.content ?? "");
    const truncated = content.length > FETCH_MAX_CHARS;
    const text =
      `# ${r.title || "(无标题)"}\n\n` +
      (truncated ? content.slice(0, FETCH_MAX_CHARS) + `\n\n[已截断，全文共 ${content.length} 字符]` : content);
    return { content: [{ type: "text", text }] };
  }
  throw new Error(`未知工具: ${name}`);
}

async function handle(msg) {
  const { id, method, params } = msg;
  switch (method) {
    case "initialize":
      reply(id, {
        protocolVersion: params?.protocolVersion || "2024-11-05",
        capabilities: { tools: {} },
        serverInfo: { name: "deepseek-search", version: "1.0.0" }
      });
      break;
    case "notifications/initialized":
    case "notifications/cancelled":
      break;
    case "ping":
      reply(id, {});
      break;
    case "tools/list":
      reply(id, { tools: TOOLS });
      break;
    case "tools/call":
      try {
        reply(id, await onToolCall(params.name, params.arguments || {}));
      } catch (e) {
        reply(id, {
          content: [{ type: "text", text: `错误: ${e.message || e}` }],
          isError: true
        });
      }
      break;
    default:
      if (id != null) replyError(id, -32601, `方法不存在: ${method}`);
  }
}

let buf = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => {
  buf += chunk;
  let idx;
  while ((idx = buf.indexOf("\n")) >= 0) {
    const line = buf.slice(0, idx).trim();
    buf = buf.slice(idx + 1);
    if (!line) continue;
    let msg;
    try {
      msg = JSON.parse(line);
    } catch {
      continue;
    }
    handle(msg).catch((e) => {
      if (msg.id != null) replyError(msg.id, -32603, String(e.message || e));
    });
  }
});
// stdin 关闭后不立即退出，等待在途的异步 API 调用写完响应，由事件循环自然退出
