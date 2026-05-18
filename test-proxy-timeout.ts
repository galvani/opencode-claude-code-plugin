import assert from "node:assert/strict"
import { test } from "node:test"
import {
  DEFAULT_PROXY_CALL_TIMEOUT_MS,
  DEFAULT_PROXY_CALL_TIMEOUT_MS_BY_TOOL,
  resolveProxyCallTimeoutMs,
} from "./src/proxy-mcp.js"

test("built-in defaults: generic tools get 10 min, task gets 60 min", () => {
  assert.equal(DEFAULT_PROXY_CALL_TIMEOUT_MS, 10 * 60 * 1000)
  assert.equal(DEFAULT_PROXY_CALL_TIMEOUT_MS_BY_TOOL.task, 60 * 60 * 1000)
  assert.equal(resolveProxyCallTimeoutMs("bash"), 10 * 60 * 1000)
  assert.equal(resolveProxyCallTimeoutMs("edit"), 10 * 60 * 1000)
  assert.equal(resolveProxyCallTimeoutMs("task"), 60 * 60 * 1000)
})

test("tool name is normalised (case + mcp__opencode_proxy__ prefix)", () => {
  assert.equal(resolveProxyCallTimeoutMs("TASK"), 60 * 60 * 1000)
  assert.equal(
    resolveProxyCallTimeoutMs("mcp__opencode_proxy__task"),
    60 * 60 * 1000,
  )
  assert.equal(
    resolveProxyCallTimeoutMs("mcp__opencode_proxy__Bash"),
    10 * 60 * 1000,
  )
})

test("global defaultMs overrides every built-in default, including task", () => {
  const cfg = { defaultMs: 1234 }
  assert.equal(resolveProxyCallTimeoutMs("bash", cfg), 1234)
  assert.equal(resolveProxyCallTimeoutMs("task", cfg), 1234)
})

test("per-tool override beats global and built-in", () => {
  const cfg = { defaultMs: 1234, byToolMs: { bash: 999, task: 0 } }
  assert.equal(resolveProxyCallTimeoutMs("bash", cfg), 999)
  // task explicitly uncapped — caller treats <= 0 as "no timer"
  assert.equal(resolveProxyCallTimeoutMs("task", cfg), 0)
  // a tool with no per-tool entry falls back to the global override
  assert.equal(resolveProxyCallTimeoutMs("webfetch", cfg), 1234)
})

test("per-tool key matching is case-insensitive", () => {
  assert.equal(
    resolveProxyCallTimeoutMs("task", { byToolMs: { TASK: 42 } }),
    42,
  )
})

test("0 / negative pass through unclamped (no-cap sentinel)", () => {
  assert.equal(resolveProxyCallTimeoutMs("task", { byToolMs: { task: 0 } }), 0)
  assert.equal(resolveProxyCallTimeoutMs("bash", { defaultMs: -1 }), -1)
})

test("empty / missing tool name degrades to the generic default", () => {
  assert.equal(resolveProxyCallTimeoutMs(""), 10 * 60 * 1000)
  assert.equal(
    resolveProxyCallTimeoutMs("", { defaultMs: 5000 }),
    5000,
  )
})
