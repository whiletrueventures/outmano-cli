"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const { main, parseArgv, resolveCommand, toolArgs, TOOLS } = require("../src/cli");
const auth = require("../src/auth");
const { parseRpcBody, requestBody, mcpUrl, DEFAULT_URL } = require("../src/client");
const {
  formatCompetitors,
  formatBattlecard,
  formatPricingChanges,
  formatReviews,
  formatNews,
  formatActionPlans,
  formatData
} = require("../src/format");
const { helpText } = require("../src/help");

function collect() {
  let text = "";
  return {
    stream: { write(chunk) { text += chunk; } },
    get text() { return text; }
  };
}

function tempEnv(overrides = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "outmano-cli-"));
  return {
    env: {
      ...overrides,
      OUTMANO_CONFIG_PATH: path.join(dir, "config.json")
    },
    dir
  };
}

function mcpResult(payload, { isError = false } = {}) {
  return {
    jsonrpc: "2.0",
    id: 1,
    result: {
      isError,
      content: [{ type: "text", text: typeof payload === "string" ? payload : JSON.stringify(payload) }]
    }
  };
}

function fakeFetch(handler) {
  return async (url, init) => handler(url, init);
}

describe("parseArgv", () => {
  it("reads flags anywhere and keeps positionals", () => {
    const parsed = parseArgv(["node", "outmano.js", "--json", "reviews", "acme.com", "--limit", "5"]);
    assert.equal(parsed.flags.json, true);
    assert.deepEqual(parsed.positional, ["reviews", "acme.com"]);
    assert.equal(parsed.options.limit, "5");
  });

  it("accepts --key=value", () => {
    const parsed = parseArgv(["news", "--category=funding"]);
    assert.equal(parsed.options.category, "funding");
  });

  it("rejects unknown short flags", () => {
    assert.throws(() => parseArgv(["competitors", "-z"]), /Unknown flag/);
  });
});

describe("resolveCommand", () => {
  it("treats competitors list as competitors", () => {
    const { command, rest } = resolveCommand(["competitors", "list"]);
    assert.equal(command, "competitors");
    assert.deepEqual(rest, []);
  });

  it("aliases pricing and plans", () => {
    assert.equal(resolveCommand(["pricing"]).command, "pricing-changes");
    assert.equal(resolveCommand(["plans"]).command, "action-plan");
  });
});

describe("toolArgs", () => {
  it("requires a battlecard domain", () => {
    assert.throws(() => toolArgs("battlecard", [], {}, {}), /battlecard <domain>/);
    assert.deepEqual(toolArgs("battlecard", ["acme.com"], {}, {}), { domain: "acme.com" });
  });

  it("maps review and news filters", () => {
    assert.deepEqual(
      toolArgs("reviews", [], { negative: true }, { competitor: "acme.com", source: "g2", limit: "10" }),
      { competitor: "acme.com", source: "g2", negative_only: true, limit: 10 }
    );
    assert.deepEqual(
      toolArgs("news", [], {}, { category: "funding", offset: "25" }),
      { category: "funding", offset: 25 }
    );
  });
});

describe("auth", () => {
  it("prefers OUTMANO_API_KEY over the saved file", () => {
    const { env } = tempEnv({ OUTMANO_API_KEY: " from-env " });
    auth.login("from-file", env);
    assert.equal(auth.resolveToken(env), "from-env");
  });

  it("saves and clears a login token", () => {
    const { env } = tempEnv();
    auth.login("  outmano_sk_test  ", env);
    assert.equal(auth.resolveToken(env), "outmano_sk_test");
    assert.ok(fs.existsSync(auth.configPath(env)));
    auth.logout(env);
    assert.equal(auth.resolveToken(env), null);
    assert.equal(fs.existsSync(auth.configPath(env)), false);
  });
});

describe("client", () => {
  it("builds the same tools/call body the Rails MCP specs use", () => {
    assert.deepEqual(requestBody("outmano_list_action_plans", { limit: 1 }), {
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: { name: "outmano_list_action_plans", arguments: { limit: 1 } }
    });
    assert.equal(mcpUrl({}), DEFAULT_URL);
    assert.equal(mcpUrl({ OUTMANO_MCP_URL: "http://127.0.0.1:3000/mcp" }), "http://127.0.0.1:3000/mcp");
  });

  it("parses JSON and SSE bodies", () => {
    const payload = mcpResult({ ok: true });
    assert.deepEqual(parseRpcBody(JSON.stringify(payload)), payload);
    assert.deepEqual(
      parseRpcBody(`event: message\ndata: ${JSON.stringify(payload)}\n\n`),
      payload
    );
  });
});

describe("format", () => {
  it("renders competitors and empty states", () => {
    const text = formatCompetitors({
      count: 2,
      competitors: [
        { competitor: "Watchtower", domain: "watchtower.com", is_own: true, seo: { domain_rating: 42 } },
        { competitor: "Rivalio", domain: "rivalio.com", is_own: false, seo: { organic_keywords: 280 } }
      ]
    });
    assert.match(text, /Watchtower/);
    assert.match(text, /you/);
    assert.match(text, /Rivalio/);
    assert.match(text, /280/);
    assert.equal(formatCompetitors({ competitors: [] }), "No tracked competitors.");
  });

  it("renders a battlecard", () => {
    const text = formatBattlecard({
      competitor: "Statusgator",
      domain: "statusgator.com",
      generated_at: "2026-07-16T00:00:00Z",
      battlecard: {
        overview: "Uptime monitoring.",
        strengths: [{ point: "Reviews", evidence: "120 on Trustpilot" }],
        how_we_win: [{ differentiator: "Speed", talk_track: "Five minutes." }],
        objection_handling: [{ objection: "More history.", response: "History is not freshness." }],
        pricing_talk_track: { their_pricing: "$29", our_position: "Below Pro", guidance: "Anchor on Business." },
        landmines: ["Ask about alert latency."]
      }
    });
    assert.match(text, /Statusgator/);
    assert.match(text, /How you win/);
    assert.match(text, /They say/);
    assert.match(text, /Landmines/);
  });

  it("renders list payloads and --json", () => {
    assert.match(
      formatPricingChanges({ total: 1, changes: [{ competitor: "Rivalio", significance: "major", summary: "Raised Starter" }] }),
      /Raised Starter/
    );
    assert.match(
      formatReviews({
        summary: [{ competitor: "Rivalio", source: "trustpilot", average_rating: 4.2, review_count: 120 }],
        reviews: [{ competitor: "Rivalio", rating: 2, title: "Slow", body: "Took weeks." }]
      }),
      /4\.2\/5/
    );
    assert.match(
      formatNews({ total: 1, mentions: [{ competitor: "Rivalio", category: "funding", title: "Raises $20M" }] }),
      /Raises \$20M/
    );
    assert.match(
      formatActionPlans({
        plans: [{
          generated_at: "2026-10-13",
          summary: "Focus on SSO.",
          action_items: [{ title: "Update SSO page", urgency: "high", status: "active", next_step_30_min: "Draft copy" }]
        }]
      }),
      /Current plan/
    );
    const json = formatData("news", { mentions: [] }, true);
    assert.equal(JSON.parse(json).mentions.length, 0);
  });
});

describe("main", () => {
  it("prints help and version without calling the API", async () => {
    const out = collect();
    assert.equal(await main(["node", "outmano.js", "--help"], { stdout: out.stream, stderr: collect().stream }), 0);
    assert.match(out.text, /outmano login/);
    assert.match(helpText("battlecard"), /acme\.com/);

    const ver = collect();
    assert.equal(await main(["node", "outmano.js", "--version"], { stdout: ver.stream, stderr: collect().stream }), 0);
    assert.match(ver.text, /\d+\.\d+\.\d+/);
  });

  it("saves a token on login and refuses unauthenticated calls", async () => {
    const { env } = tempEnv();
    const out = collect();
    assert.equal(await main(["node", "outmano.js", "login", "outmano_sk_abc"], {
      stdout: out.stream, stderr: collect().stream, env
    }), 0);
    assert.match(out.text, /Token saved/);
    assert.equal(auth.resolveToken(env), "outmano_sk_abc");

    const unauth = collect();
    const unauthCode = await main(["node", "outmano.js", "competitors"], {
      stdout: collect().stream, stderr: unauth.stream, env: tempEnv().env
    });
    assert.equal(unauthCode, 2);
    assert.match(unauth.text, /Not authenticated/);
  });

  it("calls the existing MCP tool and prints text or json", async () => {
    const { env } = tempEnv({ OUTMANO_API_KEY: "outmano_sk_live" });
    const payload = {
      count: 1,
      competitors: [{ competitor: "Rivalio", domain: "rivalio.com", is_own: false }]
    };
    let captured;
    const fetchImpl = fakeFetch(async (url, init) => {
      captured = { url, init };
      return {
        status: 200,
        ok: true,
        text: async () => JSON.stringify(mcpResult(payload))
      };
    });

    const out = collect();
    const code = await main(["node", "outmano.js", "competitors"], {
      stdout: out.stream, stderr: collect().stream, env, fetchImpl
    });
    assert.equal(code, 0);
    assert.match(out.text, /Rivalio/);
    assert.equal(captured.url, DEFAULT_URL);
    assert.equal(captured.init.headers.Authorization, "Bearer outmano_sk_live");
    assert.deepEqual(JSON.parse(captured.init.body), requestBody("outmano_get_competitor_seo", {}));

    const jsonOut = collect();
    await main(["node", "outmano.js", "competitors", "--json"], {
      stdout: jsonOut.stream, stderr: collect().stream, env, fetchImpl
    });
    assert.equal(JSON.parse(jsonOut.text).count, 1);
  });

  it("surfaces tool errors and unknown commands", async () => {
    const { env } = tempEnv({ OUTMANO_API_KEY: "k" });
    const fetchImpl = fakeFetch(async () => ({
      status: 200,
      ok: true,
      text: async () => JSON.stringify(mcpResult("No battlecard generated yet for Acme.", { isError: true }))
    }));
    const err = collect();
    const code = await main(["node", "outmano.js", "battlecard", "acme.com"], {
      stdout: collect().stream, stderr: err.stream, env, fetchImpl
    });
    assert.equal(code, 1);
    assert.match(err.text, /No battlecard generated/);

    const unknown = collect();
    assert.equal(await main(["node", "outmano.js", "explode"], {
      stdout: collect().stream, stderr: unknown.stream, env
    }), 2);
    assert.match(unknown.text, /Unknown command/);
  });

  it("maps every advertised command to an existing customer tool", () => {
    assert.deepEqual(
      Object.values(TOOLS).map((t) => t.tool).sort(),
      [
        "outmano_get_competitor_battlecard",
        "outmano_get_competitor_seo",
        "outmano_list_action_plans",
        "outmano_list_competitor_news_mentions",
        "outmano_list_competitor_pricing_changes",
        "outmano_list_competitor_reviews"
      ]
    );
  });
});

describe("bin", () => {
  it("runs --help via the executable entry", () => {
    const bin = path.join(__dirname, "..", "bin", "outmano.js");
    const result = spawnSync(process.execPath, [bin, "--help"], { encoding: "utf8" });
    assert.equal(result.status, 0);
    assert.match(result.stdout, /outmano login/);
  });
});
