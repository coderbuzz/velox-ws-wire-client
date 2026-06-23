<!-- docs: sync from coderbuzz/codex@b1e2bde -->

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
  ├── send(data)           — fire-and-forget (MESSAGE frame)
  ├── sendWait(payload)    — request-response with correlation ID (REQUEST/RESPONSE)
  ├── subscribe(topic, cb) — pub/sub listener (SUBSCRIBE frame)
  ├── publish(topic, data) — pub/sub sender (PUBLISH frame)
  ├── unsubscribe(topic)   — unsubscribe (UNSUBSCRIBE frame)
  └── auto-reconnect       — exponential backoff
```

---

## Import Map

```ts
import { WireClient, WireClientState } from "@coderbuzz/velox-ws-wire-client";
import type { WireClientOptions } from "@coderbuzz/velox-ws-wire-client";
```

---

## Constructor: `new WireClient(url, options)`

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

```ts
const client = new WireClient("wss://api.example.com/ws", {
  token: "my-auth-token",
  heartbeatInterval: 15_000,
  maxRetries: 10,
  onConnect: () => console.log("Connected"),
  onDisconnect: (code, reason) => console.log(`Disconnected: ${code} ${reason}`),
  onReconnectAttempt: (attempt, delay) => console.log(`Reconnect #${attempt} in ${delay}ms`),
});
```

---

## States

| State | Value | Description |
|---|---|---|
| `DISCONNECTED` | `0` | Not connected |
| `CONNECTING` | `1` | TCP + WebSocket handshake in progress |
| `AUTHENTICATING` | `2` | Sending auth frame, waiting for AUTH_OK |
| `CONNECTED` | `3` | Ready to send/receive |
| `RECONNECTING` | `4` | Attempting reconnect with backoff |

State transitions:
```
DISCONNECTED → CONNECTING → AUTHENTICATING → CONNECTED
                  ↑                               ↓ (disconnect)
                  └──────── RECONNECTING ←────────┘
                                ↓ (maxRetries exceeded)
                           DISCONNECTED
```

---

## Key Methods

### `connect(): Promise<void>`

Connects to server. On success: sends auth (if token configured), transitions through CONNECTING → AUTHENTICATING → CONNECTED.

```ts
await client.connect();
// Ready: client.readyState === WireClientState.CONNECTED
```

### `close(): void`

Disconnects immediately. Rejects all pending `sendWait` promises. Does NOT auto-reconnect.

```ts
client.close();
// client.readyState === WireClientState.DISCONNECTED
```

### `send(data: unknown): void`

Fire-and-forget. Encodes as MESSAGE frame (no topic — uses default topic).

```ts
client.send({ type: "update", data: { x: 1, y: 2 } });
```

### `sendWait(payload: unknown, timeout?: number): Promise<unknown>`

Send REQUEST frame + wait for correlated RESPONSE. Uses incrementing `corrId`. Rejects on timeout.

```ts
try {
  const result = await client.sendWait({ method: "getUser", id: 42 }, 5_000);
  console.log(result); // server's response payload
} catch (err) {
  console.error("Request failed or timed out:", err);
}
```

**Internal:** Pending requests stored in `Map<corrId, { resolve, reject, timer }>`. Incoming RESPONSE frames matched by corrId. Timer clears stale entries.

### `subscribe(topic: string, callback: (data: unknown) => void): void`

Subscribe to topic. Sends SUBSCRIBE frame to server. Incoming PUBLISH/MESSAGE frames for this topic fire callback.

```ts
client.subscribe("chat", (msg) => {
  console.log("Chat message:", msg);
});
```

### `publish(topic: string, data: unknown): void`

Publish to topic. Sends PUBLISH frame.

```ts
client.publish("chat", { text: "Hello", user: "Alice" });
```

### `unsubscribe(topic: string): void`

Unsubscribe from topic. Sends UNSUBSCRIBE frame.

```ts
client.unsubscribe("chat");
```

### `readyState: WireClientState`

Current connection state (enum value 0-4).

```ts
if (client.readyState === WireClientState.CONNECTED) {
  client.send(data);
}
```

---

## Reconnection Algorithm

On unexpected disconnect (NOT from explicit `close()`):
1. Transition to `RECONNECTING`
2. Calculate delay: `min(backoffBase * backoffFactor^attempt, backoffMax)` with jitter
3. Wait `delay` ms
4. Attempt reconnect: `CONNECTING → AUTHENTICATING → CONNECTED`
5. On success: fire `onConnect` callback
6. On failure: increment attempt, repeat from step 1
7. If `attempt >= maxRetries`: stay in `DISCONNECTED`

**Jitter:** ±25% random variance on calculated delay to prevent thundering herd.

Exponential example: `500, 1000, 2000, 4000, 8000, 16000, 30000, 30000, ...`

---

## Heartbeat Lifecycle

1. After `CONNECTED`: start heartbeat timer at `heartbeatInterval` ms
2. Timer fires → send PING frame (1 byte)
3. Server responds with PONG frame
4. If no PONG within timeout (implicit via WebSocket pong timeout from server), disconnect + reconnect
5. On `close()`: clear heartbeat timer

---

## Auth Modes

**Mode 1: `authMode: 'message'` (default)**
- After WebSocket open: send AUTH frame with token
- Wait for AUTH_OK frame
- If AUTH_FAIL received or authTimeout exceeded → disconnect
- Authenticated: transition to CONNECTED

**Mode 2: `authMode: 'query'`**
- Append `?token=TOKEN` to URL: `wss://host/ws?token=my-token`
- Server validates on upgrade
- Immediately transition to CONNECTED after open (no auth frame sent)

---

## Wire Frame Mapping

| Client Action | Wire Frame Sent | Expected Response |
|---|---|---|
| `send(data)` | MESSAGE (default topic) | — |
| `sendWait(payload)` | REQUEST (with corrId) | RESPONSE (matching corrId) |
| `subscribe(topic, cb)` | SUBSCRIBE | — |
| `unsubscribe(topic)` | UNSUBSCRIBE | — |
| `publish(topic, data)` | PUBLISH | — |
| Heartbeat timer | PING | PONG |
| Auth (mode `'message'`) | AUTH | AUTH_OK / AUTH_FAIL |

---

## Gotchas

1. Requires `@coderbuzz/velox-ws-wire` as peer dependency.
2. Auth modes: `'message'` (send token as first binary frame) or `'query'` (append `?token=` to URL).
3. `sendWait` throws on timeout — catch it with try/catch.
4. After `close()`, all pending `sendWait` promises reject with `"Connection closed"`.
5. WireClient does NOT use standard WebSocket API directly — wraps raw WebSocket internally with binary framing.
6. `maxRetries: Infinity` means it will retry forever — useful for always-on services.
7. `send()` is fire-and-forget — no delivery guarantee, no ack.
8. Heartbeat uses server-side pong timeout (configured on server, not client) for dead connection detection.
