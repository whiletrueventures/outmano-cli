"use strict";

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

function configPath(env = process.env) {
  if (env.OUTMANO_CONFIG_PATH) return env.OUTMANO_CONFIG_PATH;
  return path.join(os.homedir(), ".config", "outmano", "config.json");
}

function readConfig(env = process.env) {
  try {
    return JSON.parse(fs.readFileSync(configPath(env), "utf8"));
  } catch {
    return {};
  }
}

function writeConfig(data, env = process.env) {
  const file = configPath(env);
  fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`, { mode: 0o600 });
}

function resolveToken(env = process.env) {
  const fromEnv = env.OUTMANO_API_KEY && String(env.OUTMANO_API_KEY).trim();
  if (fromEnv) return fromEnv;
  const fromFile = readConfig(env).token;
  return fromFile ? String(fromFile).trim() : null;
}

function login(token, env = process.env) {
  const value = token == null ? "" : String(token).trim();
  if (!value) {
    const err = new Error("Token is required. Usage: outmano login <token>");
    err.code = "USAGE";
    throw err;
  }
  writeConfig({ ...readConfig(env), token: value }, env);
}

function logout(env = process.env) {
  const file = configPath(env);
  try {
    fs.unlinkSync(file);
  } catch (err) {
    if (err && err.code !== "ENOENT") throw err;
  }
}

module.exports = {
  configPath,
  readConfig,
  writeConfig,
  resolveToken,
  login,
  logout
};
