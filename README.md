<!-- docs: sync from coderbuzz/codex@46af4b9 -->

# Velox WireClient &mdash; `@coderbuzz/velox-ws-wire-client`

> **Fault-tolerant WebSocket client with binary Wire Protocol.** Auto-reconnect, heartbeat, pub/sub, request-response correlation.
> AI agents: see [AI_KNOWLEDGE.md](https://github.com/coderbuzz/velox-ws-wire-client/blob/main/AI_KNOWLEDGE.md) for expert context.
<p align="center">
  <a href="https://www.npmjs.com/package/@coderbuzz/velox-ws-wire-client"><img src="https://img.shields.io/npm/v/@coderbuzz/velox-ws-wire-client.svg?style=flat-square" alt="npm version" /></a>
  <a href="https://www.npmjs.com/package/@coderbuzz/velox-ws-wire-client"><img src="https://img.shields.io/npm/dm/@coderbuzz/velox-ws-wire-client.svg?style=flat-square" alt="npm downloads" /></a>
  <a href="https://github.com/coderbuzz/velox-ws-wire-client/blob/main/LICENSE"><img src="https://img.shields.io/github/license/coderbuzz/velox-ws-wire-client.svg?style=flat-square" alt="MIT License" /></a>
  <a href="https://github.com/coderbuzz/velox-ws-wire-client"><img src="https://img.shields.io/github/stars/coderbuzz/velox-ws-wire-client.svg?style=flat-square" alt="GitHub Stars" /></a>
</p>

WireClient is a standalone WebSocket client using the compact Wire binary framing protocol. It handles reconnection, heartbeats, message correlation, auth, and pub/sub — you just handle messages.

---

**Compatible with** `@coderbuzz/velox-ws-wire-server` — connect to any Velox-based server using the Wire Protocol, or implement your own server using `@coderbuzz/velox-ws-wire` codec.

---

## Features

- **Binary protocol** — 80-93% bandwidth reduction vs JSON
- **Auto-reconnect** — exponential backoff, configurable max retries
- **Heartbeat** — configurable ping/pong interval
- **Request-response** — `sendWait()` with correlation ID and timeout
- **Pub/Sub** — topic-based subscribe/publish/unsubscribe
- **Auth** — token-based, sent as first message or query param
- **Zero dependencies** beyond `@coderbuzz/velox-ws-wire`

---

## Installation

```sh
npm install @coderbuzz/velox-ws-wire @coderbuzz/velox-ws-wire-client
```

`@coderbuzz/velox-ws-wire` is required as a peer (binary codec).

---

## Quick Start

```ts
import { WireClient } from "@coderbuzz/velox-ws-wire-client";

const client = new WireClient("wss://api.example.com/ws", {
  token: "my-auth-token",
  heartbeatInterval: 30_000,
});

await client.connect();

// Fire-and-forget
client.send("hello");

// Request-response
const result = await client.sendWait({ type: "getData" }, 10_000);

// Pub/sub
client.subscribe("events", (data) => console.log("Event:", data));
client.publish("events", { action: "click" });

await client.close();
```

---

## API

### `new WireClient(url, options)`

| Option | Type | Default | Description |
|---|---|---|---|
| `url` | `string` | required | WebSocket URL |
| `token?` | `string` | — | Auth token |
| `authMode?` | `'message' \| 'query'` | `'message'` | Auth delivery method |
| `authTimeout?` | `number` | `10_000` | Auth timeout ms |
| `maxRetries?` | `number` | `Infinity` | Max reconnect attempts |
| `backoffBase?` | `number` | `500` | Initial backoff ms |
| `backoffMax?` | `number` | `30_000` | Max backoff ms |
| `backoffFactor?` | `number` | `2` | Backoff multiplier |
| `heartbeatInterval?` | `number` | `30_000` | Ping interval ms |
| `requestTimeout?` | `number` | `10_000` | `sendWait` timeout ms |
| `onConnect?` | `() => void` | — | Connected callback |
| `onDisconnect?` | `(code, reason) => void` | — | Disconnected callback |
| `onReconnectAttempt?` | `(attempt, delay) => void` | — | Reconnect attempt callback |

### Methods

| Method | Description |
|---|---|
| `client.connect()` | Connect to server |
| `client.close()` | Disconnect |
| `client.send(data)` | Fire-and-forget send |
| `client.sendWait(payload, timeout?)` | Send + wait for response |
| `client.subscribe(topic, cb)` | Subscribe to topic |
| `client.publish(topic, data)` | Publish to topic |
| `client.unsubscribe(topic)` | Unsubscribe from topic |
| `client.readyState` | Current `WireClientState` |

### States

`WireClientState`: `DISCONNECTED` | `CONNECTING` | `AUTHENTICATING` | `CONNECTED` | `RECONNECTING`

---

## License

MIT &copy; 2026 Indra Gunawan
