import { test, expect } from "bun:test";
import { WireClientState } from "@coderbuzz/velox-ws-wire-client";

test("WireClientState exports values", () => {
  expect(typeof WireClientState).toBe("object");
});