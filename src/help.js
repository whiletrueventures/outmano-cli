"use strict";

const VERSION = require("../package.json").version;

const USAGE = `outmano ${VERSION} — read your Outmano workspace from the terminal

Usage:
  outmano <command> [args] [--json]
  outmano login <token>
  outmano --help

Auth:
  OUTMANO_API_KEY env var, or \`outmano login <token>\` (saved under ~/.config/outmano/).
  Create a key in the app: Integrations → MCP. Same customer tokens the MCP uses.

Output:
  Plain text by default. Pass --json for the raw MCP payload.

Commands:
  competitors              List tracked competitors (via outmano_get_competitor_seo)
  battlecard <domain>      Sales battlecard for one competitor
  pricing-changes          Recent competitor pricing moves
  reviews                  Recent public reviews + rating summaries
  news                     Press mentions (funding, acquisitions, layoffs)
  action-plan              Latest weekly AI action plan
  login <token>            Save a customer API token locally
  logout                   Remove the saved token
  help [command]           This help, or help for one command

Examples:
  outmano competitors
  outmano battlecard acme.com
  outmano pricing-changes --json
  outmano reviews --competitor acme.com --negative
  outmano news --category funding --limit 10
  outmano action-plan --limit 1
  outmano login outmano_sk_...

This CLI calls the existing MCP at https://outmano.com/mcp (override with OUTMANO_MCP_URL).
Source: https://github.com/whiletrueventures/outmano-cli
`;

const COMMAND_HELP = {
  competitors: `List the competitors your workspace tracks.

Usage:
  outmano competitors [--json]

Maps to MCP tool outmano_get_competitor_seo (no dedicated list-competitors tool).

Example:
  outmano competitors
`,
  battlecard: `Show the AI sales battlecard for one tracked competitor.

Usage:
  outmano battlecard <domain> [--json]

Maps to MCP tool outmano_get_competitor_battlecard.

Example:
  outmano battlecard acme.com
`,
  "pricing-changes": `List recently detected competitor pricing changes.

Usage:
  outmano pricing-changes [--significance minor|moderate|major] [--limit N] [--offset N] [--json]

Maps to MCP tool outmano_list_competitor_pricing_changes.
Alias: pricing

Example:
  outmano pricing-changes --significance major --limit 10
`,
  reviews: `List recent public reviews and per-competitor rating summaries.

Usage:
  outmano reviews [--competitor domain] [--source trustpilot|g2] [--negative] [--limit N] [--offset N] [--json]

Maps to MCP tool outmano_list_competitor_reviews.

Example:
  outmano reviews --competitor acme.com --negative
`,
  news: `List recent press mentions of tracked competitors.

Usage:
  outmano news [--competitor domain] [--category funding|acquisition|layoffs|general] [--limit N] [--offset N] [--json]

Maps to MCP tool outmano_list_competitor_news_mentions.

Example:
  outmano news --category funding
`,
  "action-plan": `Show weekly AI action plans (newest first; --limit 1 is this week).

Usage:
  outmano action-plan [--since YYYY-MM-DD] [--limit N] [--offset N] [--json]

Maps to MCP tool outmano_list_action_plans.
Aliases: action-plans, plans

Example:
  outmano action-plan --limit 1
`,
  login: `Save a customer API token locally (~/.config/outmano/config.json).

Usage:
  outmano login <token>

OUTMANO_API_KEY still wins when set.

Example:
  outmano login outmano_sk_...
`,
  logout: `Remove the locally saved token.

Usage:
  outmano logout
`
};

function helpText(command) {
  if (!command) return USAGE.trim();
  return (COMMAND_HELP[command] || USAGE).trim();
}

module.exports = { USAGE, COMMAND_HELP, helpText, VERSION };
