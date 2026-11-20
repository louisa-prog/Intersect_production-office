// Basecamp UI tests — run headless inside real Basecamp with:
//   nix run .#ui-tests
// (mkLogosQmlModule picks up every .mjs file in tests/.)
import { resolve } from "node:path";

// `nix run .#ui-tests` sets LOGOS_QT_MCP; for interactive use:
//   nix build github:logos-co/logos-basecamp#logos-qt-mcp -o result-mcp
const root = process.env.LOGOS_QT_MCP || new URL("../result-mcp", import.meta.url).pathname;
const { test, run } = await import(resolve(root, "test-framework/framework.mjs"));

test("production_office: loads the view", async (app) => {
  await app.waitFor(
    async () => { await app.expectTexts(["Production Office"]); },
    { timeout: 15000, interval: 500, description: "view to load" }
  );
});

test("production_office: backend answers and offers the first event", async (app) => {
  await app.waitFor(
    async () => { await app.expectTexts(["Open your first production file", "Load an example festival"]); },
    { timeout: 20000, interval: 500, description: "events listed from the backend" }
  );
});

run();
