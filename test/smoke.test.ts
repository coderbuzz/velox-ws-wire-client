import { test, expect } from "bun:test";
import { WireClientState } from "../src/index";

test("WireClientState exports values", () => {
  expect(typeof WireClientState).toBe("object");
});