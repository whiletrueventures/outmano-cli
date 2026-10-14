---
name: outmano
description: Query Outmano competitive intelligence from the terminal via the existing customer MCP. Use when the user asks about tracked competitors, a sales battlecard, pricing changes, reviews, press/news mentions, or the weekly action plan, or wants to run `outmano` / `npx outmano`.
---

# Outmano CLI

Thin Node CLI over `https://outmano.com/mcp`. Same customer API tokens as the MCP (`Authorization: Bearer`). No new endpoints.

## When to use

- The user wants competitor intel in a terminal or agent shell
- MCP is unavailable in this client but a customer API key is
- You need a one-shot read: list rivals, a battlecard, pricing moves, reviews, news, or this week’s plan

Do not use this for admin tools or writes. The CLI is read-only.

## Auth

```bash
export OUTMANO_API_KEY=outmano_sk_...
# or
outmano login outmano_sk_...
```

Create a key in Outmano under Integrations → MCP. `OUTMANO_API_KEY` wins over the saved file.

## Commands

Plain text by default. Add `--json` for the raw MCP payload.

### competitors

List tracked competitors (maps to `outmano_get_competitor_seo`; there is no list-competitors tool).

```bash
outmano competitors
```

### battlecard

Sales battlecard for one tracked domain.

```bash
outmano battlecard acme.com
```

### pricing-changes

Recent competitor pricing moves.

```bash
outmano pricing-changes --significance major
```

### reviews

Public reviews plus rating summaries.

```bash
outmano reviews --competitor acme.com --negative
```

### news

Press mentions (funding, acquisitions, layoffs, general).

```bash
outmano news --category funding
```

### action-plan

Weekly AI action plan. `--limit 1` is the current plan.

```bash
outmano action-plan --limit 1
```

## Notes

- Run `outmano --help` or `outmano help <command>` to learn flags.
- Override the MCP URL with `OUTMANO_MCP_URL` (tests / staging).
- Install with `npm install -g outmano`, or run one-shot with `npx outmano <command>`.
