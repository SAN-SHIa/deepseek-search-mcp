# DeepSeek Search MCP

一个零依赖的 Node.js MCP Server，为支持 MCP 的客户端提供 **DeepSeek Web Search** 和**网页 Fetch**工具。

## 功能

- `deepseek_web_search`：搜索网页，返回标题、URL、日期、相关度和摘要。
- `deepseek_fetch`：抓取指定 HTTP/HTTPS 网页，并以 Markdown 正文返回。

## 准备工作

### 1. 获取 DeepSeek API Key

在 DeepSeek 控制台创建 API Key：

<https://platform.deepseek.com/api_keys>

API Key 只应通过环境变量或客户端配置注入。不要把真实 Key 写进源代码、提交到 Git，或发布到 npm。

### 2. 环境要求

- Node.js >= 18（需要原生 `fetch`）
- 一个支持 MCP 的客户端

## 在 Codex / ZCode 中配置

### 推荐：使用命令配置

先在当前终端设置 API Key，再执行：

```bash
export DEEPSEEK_API_KEY="你的 DeepSeek API Key"
codex mcp add deepseek-search \
  --env DEEPSEEK_API_KEY="$DEEPSEEK_API_KEY" \
  -- npx -y @ythirty/deepseek-search-mcp
```

如果使用本地源码：

```bash
export DEEPSEEK_API_KEY="你的 DeepSeek API Key"
codex mcp add deepseek-search \
  --env DEEPSEEK_API_KEY="$DEEPSEEK_API_KEY" \
  -- node /绝对路径/deepseek-search-mcp/server.mjs
```

查看是否添加成功：

```bash
codex mcp list
```

删除配置：

```bash
codex mcp remove deepseek-search
```

ZCode 如果使用 Codex 的 MCP 配置，也可以直接执行以上命令。

### 手动编辑配置文件

Codex 使用 TOML 配置文件：

```text
~/.codex/config.toml
```

ZCode 如果兼容 Codex 的 MCP 配置，也使用同一文件。加入：

```toml
[mcp_servers.deepseek-search]
command = "npx"
args = ["-y", "@ythirty/deepseek-search-mcp"]

[mcp_servers.deepseek-search.env]
DEEPSEEK_API_KEY = "你的 DeepSeek API Key"
```

也可以直接运行本地源码：

```toml
[mcp_servers.deepseek-search]
command = "node"
args = ["/绝对路径/deepseek-search-mcp/server.mjs"]

[mcp_servers.deepseek-search.env]
DEEPSEEK_API_KEY = "你的 DeepSeek API Key"
```

修改配置后，重启客户端或重新建立会话。

## 在 Claude Code 中配置

Claude Code 支持直接使用命令配置 MCP：

```bash
export DEEPSEEK_API_KEY="你的 DeepSeek API Key"
claude mcp add deepseek-search \
  --transport stdio \
  --env DEEPSEEK_API_KEY="$DEEPSEEK_API_KEY" \
  -- npx -y @ythirty/deepseek-search-mcp
```

查看已配置的 MCP 服务：

```bash
claude mcp list
```

删除配置：

```bash
claude mcp remove deepseek-search
```

Claude Code 的用户级 MCP 配置通常保存在：

```text
~/.claude.json
```

也可以使用本地源码：

```bash
claude mcp add deepseek-search \
  --transport stdio \
  --env DEEPSEEK_API_KEY="$DEEPSEEK_API_KEY" \
  -- node /绝对路径/deepseek-search-mcp/server.mjs
```

## 本地运行

```bash
DEEPSEEK_API_KEY="你的 DeepSeek API Key" node server.mjs
```

服务使用 **stdio** 传输。客户端启动服务后，会通过 MCP 的 `tools/list` 获取工具定义，再根据用户请求调用对应工具。

## 搜索参数

`deepseek_web_search` 支持：

- `query`：必填，最多 128 个字符；支持 `site:`、`-关键词`、精确短语、`lang:`、`after:` 和 `before:`。
- `count`：返回条数，1–50，默认 50。
- `need_content`：是否返回网页正文。
- `ori_question`：原始用户问题，可帮助搜索引擎理解意图。
- `localization`：用于本地化结果的 IP 地址。

## 故障排查

1. 确认 Node.js 版本不低于 18：`node --version`
2. 确认 API Key 有效且账户余额充足。
3. 确认客户端配置中的 `command`、`args` 和 `env` 格式正确。
4. 修改配置后重启客户端。
5. 若使用本地路径，`args` 中必须填写 `server.mjs` 的绝对路径。

## 许可证

MIT
