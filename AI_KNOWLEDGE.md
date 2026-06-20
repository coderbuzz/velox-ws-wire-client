<!-- docs: sync from coderbuzz/codex@cd4a13b -->

# Velox WireClient — AI Agent Knowledge File

**Package:** `@coderbuzz/velox-ws-wire-client`
**Purpose:** Fault-tolerant WebSocket client with binary Wire Protocol.
**Distribution:** ESM only (`dist/index.js` + `dist/index.d.ts`).

---

## Mental Model

Standalone WebSocket client. Not tied to Velox framework. Uses `@coderbuzz/velox-ws-wire` for binary framing.

```
WireClient
  ├── connect() / close()
  ├── send(data)           — fire-and-forget
  ├── sendWait(payload)    — request-response with correlation ID
  ├── subscribe(topic, cb) — pub/sub listener
  ├── publish(topic, data) — pub/sub sender
  └── auto-reconnect       — exponential backoff
```

---

## Import Map

```ts
import { WireClient, WireClientState } from "@coderbuzz/velox-ws-wire-client";
import type { WireClientOptions } from "@coderbuzz/velox-ws-wire-client";
```

---

## States

| State | Value | Description |
|---|---|---|
| `DISCONNECTED` | `0` | Not connected |
| `CONNECTING` | `1` | Connection in progress |
| `AUTHENTICATING` | `2` | Sending auth message |
| `CONNECTED` | `3` | Ready to send/receive |
| `RECONNECTING` | `4` | Attempting reconnect |

---

## Key Methods

- `new WireClient(url, options)` — constructor
- `await client.connect()` — connect to server
- `client.close()` — disconnect
- `client.send(data)` — fire-and-forget
- `await client.sendWait(payload, timeout?)` — send + wait for correlated response
- `client.subscribe(topic, callback)` — listen to topic
- `client.publish(topic, data)` — publish to topic
- `client.unsubscribe(topic)` — stop listening

---

## Gotchas

1. Requires `@coderbuzz/velox-ws-wire` as peer dependency.
2. Auth modes: `'message'` (send token as first binary frame) or `'query'` (append `?token=` to URL).
3. `sendWait` throws on timeout — catch it.
4. After `close()`, all pending `sendWait` promises reject.
5. WireClient does NOT use the standard WebSocket API directly — wraps it internally with binary framing.
