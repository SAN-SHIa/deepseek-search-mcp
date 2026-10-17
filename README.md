# DeepSeek Search MCP

一个零依赖的 Node.js MCP Server，为支持 MCP 的客户端提供 DeepSeek Web Search 与网页 Fetch 工具。

## 提供的工具

- `deepseek_web_search`：搜索网页，返回标题、URL、日期、相关度和摘要。
- `deepseek_fetch`：抓取指定 HTTP/HTTPS 网页并返回 Markdown 正文。

## 前置条件

- Node.js >= 18
- DeepSeek API Key（环境变量 `DEEPSEEK_API_KEY`）

## 在 Codex 中配置

```bash
codex mcp add deepseek-search \
  --env DEEPSEEK_API_KEY=你的DeepSeekAPIKey \
  -- npx -y @ythirty/deepseek-search-mcp
```

## 在 Claude Desktop / Cursor 等客户端中配置

```json
{
  "mcpServers": {
    "deepseek-search": {
      "command": "npx",
      "args": ["-y", "@ythirty/deepseek-search-mcp"],
      "env": {
        "DEEPSEEK_API_KEY": "你的DeepSeekAPIKey"
      }
    }
  }
}
```

## 本地运行

```bash
DEEPSEEK_API_KEY=你的DeepSeekAPIKey node server.mjs
```

服务使用 stdio 传输，不要把 API Key 写入源代码、提交到 Git 或发布到 npm。

## 许可证

MIT
