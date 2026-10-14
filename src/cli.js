"use strict";

const auth = require("./auth");
const client = require("./client");
const { formatData } = require("./format");
const { helpText, VERSION } = require("./help");

const COMMAND_ALIASES = {
  list: "competitors",
  pricing: "pricing-changes",
  "action-plans": "action-plan",
  plans: "action-plan"
};

const TOOLS = {
  competitors: { tool: "outmano_get_competitor_seo", kind: "competitors" },
  battlecard: { tool: "outmano_get_competitor_battlecard", kind: "battlecard" },
  "pricing-changes": { tool: "outmano_list_competitor_pricing_changes", kind: "pricing" },
  reviews: { tool: "outmano_list_competitor_reviews", kind: "reviews" },
  news: { tool: "outmano_list_competitor_news_mentions", kind: "news" },
  "action-plan": { tool: "outmano_list_action_plans", kind: "action-plan" }
};

function parseArgv(argv) {
  const args = argv.slice(argv[0] === "node" || /node$/.test(argv[0] || "") ? 2 : 0);
  // When invoked as `node bin/outmano.js ...` drop node + script.
  // Tests may pass just the CLI tokens: parseArgv(["competitors", "--json"]).
  const start = args[0] && /outmano(\.js)?$/.test(args[0]) ? 1 : 0;
  const tokens = args.slice(start);

  const flags = { json: false, help: false, version: false, negative: false };
  const options = {};
  const positional = [];

  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];
    if (token === "--") {
      positional.push(...tokens.slice(i + 1));
      break;
    }
    if (token === "--json") {
      flags.json = true;
    } else if (token === "--help" || token === "-h") {
      flags.help = true;
    } else if (token === "--version" || token === "-v") {
      flags.version = true;
    } else if (token === "--negative" || token === "--negative-only") {
      flags.negative = true;
    } else if (token.startsWith("--") && token.includes("=")) {
      const eq = token.indexOf("=");
      options[token.slice(2, eq)] = token.slice(eq + 1);
    } else if (token.startsWith("--")) {
      const key = token.slice(2);
      const next = tokens[i + 1];
      if (next != null && !next.startsWith("-")) {
        options[key] = next;
        i += 1;
      } else {
        options[key] = true;
      }
    } else if (token.startsWith("-")) {
      const err = new Error(`Unknown flag: ${token}`);
      err.code = "USAGE";
      throw err;
    } else {
      positional.push(token);
    }
  }

  return { positional, flags, options };
}

function resolveCommand(positional) {
  let [command, ...rest] = positional;
  if (!command) return { command: null, rest: [] };
  if (command === "competitors" && rest[0] === "list") rest = rest.slice(1);
  command = COMMAND_ALIASES[command] || command;
  return { command, rest };
}

function intOption(value, name) {
  if (value == null || value === true) return undefined;
  const n = Number.parseInt(String(value), 10);
  if (Number.isNaN(n)) {
    const err = new Error(`Invalid --${name}: ${value}`);
    err.code = "USAGE";
    throw err;
  }
  return n;
}

function toolArgs(command, rest, flags, options) {
  if (command === "battlecard") {
    const domain = rest[0] || options.domain || options.competitor;
    if (!domain || domain === true) {
      const err = new Error("Usage: outmano battlecard <domain>");
      err.code = "USAGE";
      throw err;
    }
    return { domain };
  }

  const args = {};
  const limit = intOption(options.limit, "limit");
  const offset = intOption(options.offset, "offset");
  if (limit != null) args.limit = limit;
  if (offset != null) args.offset = offset;

  if (command === "pricing-changes" && options.significance && options.significance !== true) {
    args.significance = String(options.significance);
  }
  if (command === "reviews") {
    const competitor = rest[0] || options.competitor || options.domain;
    if (competitor && competitor !== true) args.competitor = String(competitor);
    if (options.source && options.source !== true) args.source = String(options.source);
    if (flags.negative) args.negative_only = true;
  }
  if (command === "news") {
    const competitor = rest[0] || options.competitor || options.domain;
    if (competitor && competitor !== true) args.competitor = String(competitor);
    if (options.category && options.category !== true) args.category = String(options.category);
  }
  if (command === "action-plan" && options.since && options.since !== true) {
    args.since = String(options.since);
  }
  return args;
}

function write(stream, text) {
  const out = text.endsWith("\n") ? text : `${text}\n`;
  stream.write(out);
}

async function main(argv = process.argv, io = {}) {
  const stdout = io.stdout || process.stdout;
  const stderr = io.stderr || process.stderr;
  const env = io.env || process.env;

  let parsed;
  try {
    parsed = parseArgv(argv);
  } catch (err) {
    write(stderr, err.message);
    return err.code === "USAGE" ? 2 : 1;
  }

  const { flags, options, positional } = parsed;
  if (flags.version && positional.length === 0) {
    write(stdout, VERSION);
    return 0;
  }

  let { command, rest } = resolveCommand(positional);

  if (flags.help && !command) {
    write(stdout, helpText());
    return 0;
  }
  if (!command || command === "help") {
    const topic = command === "help" ? COMMAND_ALIASES[rest[0]] || rest[0] : command;
    write(stdout, helpText(topic));
    return 0;
  }
  if (flags.help) {
    write(stdout, helpText(COMMAND_ALIASES[command] || command));
    return 0;
  }

  if (command === "login") {
    try {
      auth.login(rest[0], env);
    } catch (err) {
      write(stderr, err.message);
      return err.code === "USAGE" ? 2 : 1;
    }
    write(stdout, `Token saved to ${auth.configPath(env)}`);
    return 0;
  }

  if (command === "logout") {
    auth.logout(env);
    write(stdout, "Logged out.");
    return 0;
  }

  const spec = TOOLS[command];
  if (!spec) {
    write(stderr, `Unknown command: ${command}\n\n${helpText()}`);
    return 2;
  }

  let args;
  try {
    args = toolArgs(command, rest, flags, options);
  } catch (err) {
    write(stderr, err.message);
    return err.code === "USAGE" ? 2 : 1;
  }

  const token = auth.resolveToken(env);
  try {
    const data = await client.callTool(spec.tool, args, {
      token,
      env,
      fetchImpl: io.fetchImpl
    });
    write(stdout, formatData(spec.kind, data, flags.json));
    return 0;
  } catch (err) {
    write(stderr, err.message);
    if (err.code === "AUTH") return 2;
    return 1;
  }
}

module.exports = {
  main,
  parseArgv,
  resolveCommand,
  toolArgs,
  COMMAND_ALIASES,
  TOOLS
};
