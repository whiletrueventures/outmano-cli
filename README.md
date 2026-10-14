# Outmano CLI

Command-line client for [Outmano](https://outmano.com) competitor monitoring. Battlecards, pricing changes, reviews, news and weekly action plans from your terminal or AI agent.

The CLI is a thin client over the Outmano customer MCP at `https://outmano.com/mcp`. It uses the same API keys you create in the app under **Integrations → MCP**. It is read-only and has no runtime dependencies.

## Install

Node 18 or newer.

```bash
npm install -g outmano
outmano --help
```

Or run one command without installing:

```bash
npx outmano competitors
```

## Auth

Create a customer key in the Outmano app under **Integrations → MCP**. The token is resolved in this order:

1. `OUTMANO_API_KEY`
2. A token saved by `outmano login <token>` at `~/.config/outmano/config.json`

```bash
export OUTMANO_API_KEY=outmano_sk_...
# or
outmano login outmano_sk_...
outmano logout
```

`OUTMANO_MCP_URL` overrides the MCP URL (default `https://outmano.com/mcp`). `OUTMANO_CONFIG_PATH` overrides where the saved token is stored.

## Commands

Plain text by default. Add `--json` for the raw MCP payload.

| Command | MCP tool | Example |
|---|---|---|
| `outmano competitors` | `outmano_get_competitor_seo` | `outmano competitors` |
| `outmano battlecard <domain>` | `outmano_get_competitor_battlecard` | `outmano battlecard acme.com` |
| `outmano pricing-changes` | `outmano_list_competitor_pricing_changes` | `outmano pricing-changes --significance major` |
| `outmano reviews` | `outmano_list_competitor_reviews` | `outmano reviews --competitor acme.com --negative` |
| `outmano news` | `outmano_list_competitor_news_mentions` | `outmano news --category funding` |
| `outmano action-plan` | `outmano_list_action_plans` | `outmano action-plan --limit 1` |

There is no dedicated "list competitors" MCP tool. `competitors` uses the SEO snapshot tool, which already returns every tracked competitor (name, domain, `is_own`, SEO stats).

Shared flags: `--json`, `--help`, `--limit`, `--offset`. See `outmano help <command>` for the rest.

## Agent skill

[SKILL.md](./SKILL.md) is the agent-facing command list. Point your agent at it, or install the package and let the agent run `outmano --help`.

## Development

```bash
git clone https://github.com/whiletrueventures/outmano-cli.git
cd outmano-cli
npm test
node bin/outmano.js --help
```

Tests use Node's built-in runner and mock `fetch`. No network access is needed.

## License

[MIT](./LICENSE)
