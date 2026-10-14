"use strict";

const DEFAULT_URL = "https://outmano.com/mcp";

function mcpUrl(env = process.env) {
  return env.OUTMANO_MCP_URL || DEFAULT_URL;
}

function parseRpcBody(text) {
  if (text == null) return null;
  const trimmed = String(text).trim();
  if (!trimmed) return null;

  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      return JSON.parse(trimmed);
    } catch {
      return null;
    }
  }

  const lines = trimmed.split(/\r?\n/).filter((line) => line.startsWith("data:"));
  const last = lines[lines.length - 1];
  if (!last) return null;
  try {
    return JSON.parse(last.slice(5).trim());
  } catch {
    return null;
  }
}

function authError() {
  const err = new Error(
    "Not authenticated. Set OUTMANO_API_KEY or run `outmano login <token>`.\nCreate a key in Outmano under Integrations → MCP."
  );
  err.code = "AUTH";
  return err;
}

async function callTool(name, args = {}, options = {}) {
  const env = options.env || process.env;
  const token = options.token != null ? options.token : null;
  if (!token) throw authError();

  const fetchFn = options.fetchImpl || globalThis.fetch;
  if (typeof fetchFn !== "function") {
    throw new Error("fetch is not available. Use Node 18+.");
  }

  const res = await fetchFn(mcpUrl(env), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: { name, arguments: args }
    })
  });

  const text = await res.text();
  const body = parseRpcBody(text);

  if (!body) {
    const err = new Error(`MCP request failed (${res.status}): ${String(text).slice(0, 400)}`);
    err.code = "HTTP";
    throw err;
  }

  if (body.error) {
    const err = new Error(body.error.message || JSON.stringify(body.error));
    err.code = "RPC";
    throw err;
  }

  const result = body.result;
  if (!result) {
    const err = new Error(`Unexpected MCP response (${res.status}): ${String(text).slice(0, 400)}`);
    err.code = "HTTP";
    throw err;
  }

  const payload = result.content && result.content[0] ? result.content[0].text : "";
  if (result.isError) {
    const err = new Error(payload || "Tool returned an error.");
    err.code = "TOOL";
    throw err;
  }

  if (payload == null || payload === "") return payload;
  try {
    return JSON.parse(payload);
  } catch {
    return payload;
  }
}

function requestBody(name, args = {}) {
  return {
    jsonrpc: "2.0",
    id: 1,
    method: "tools/call",
    params: { name, arguments: args }
  };
}

module.exports = {
  DEFAULT_URL,
  mcpUrl,
  parseRpcBody,
  callTool,
  requestBody,
  authError
};
