import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AuthenticationError, type ClientOptions, type GenerateParams } from "promtexpress";
import { run, type Client, type Io } from "../src/run.ts";

function captureIo(env: Record<string, string> = { PROMTEXPRESS_API_KEY: "pe_test_cli" }, stdin = "") {
  const out: string[] = [];
  const err: string[] = [];
  const io: Io = {
    stdout: (text) => out.push(text),
    stderr: (text) => err.push(text),
    readStdin: async () => stdin,
    env,
  };
  return { io, stdout: () => out.join(""), stderr: () => err.join("") };
}

function fakeClient(overrides: Partial<Client> = {}) {
  const seen: { options?: ClientOptions; generate?: GenerateParams } = {};
  const client: Client = {
    generate: async (params) => {
      seen.generate = params;
      return {
        promptId: "p_1",
        output: "COMPILED PROMPT",
        creditsUsed: 2,
        creditsRemaining: 40,
        latencyMs: 10,
        validationScore: null,
        validationIssues: [],
        assumptions: [],
        traceId: "t",
        scenario: "B",
        chipQuestions: [{ label: "Tone?", options: ["formal", "casual"] }],
        recentEntry: { id: "p_1", mod: "text", title: "x", userInput: "x", date: "d" },
      };
    },
    listTemplates: async () => [
      { id: "tpl_1", title: "Studio product shot", description: null, category: "ecommerce", modality: "image", engine: null, variables: [], version: "v1.0" },
    ],
    listHistory: async () => ({ rows: [], total: 0, page: 0, pageSize: 20 }),
    ...overrides,
  };
  const factory = (options: ClientOptions) => {
    seen.options = options;
    return client;
  };
  return { factory, seen };
}

describe("promtexpress CLI", () => {
  it("prints help with no arguments", async () => {
    const { io, stdout } = captureIo();
    assert.equal(await run([], io), 0);
    assert.match(stdout(), /Usage:/);
  });

  it("generates a prompt: prompt on stdout, metadata on stderr", async () => {
    const { io, stdout, stderr } = captureIo();
    const { factory, seen } = fakeClient();

    const code = await run(["generate", "launch", "email", "-m", "text", "-e", "eng_1"], io, factory);

    assert.equal(code, 0);
    assert.equal(stdout(), "COMPILED PROMPT\n");
    assert.match(stderr(), /Tone\? \(formal \/ casual\)/);
    assert.match(stderr(), /2 credits used, 40 remaining/);
    assert.deepEqual(seen.generate, { intent: "launch email", modality: "text", targetEngineId: "eng_1" });
    assert.equal(seen.options?.apiKey, "pe_test_cli");
  });

  it("reads the intent from stdin when given -", async () => {
    const { io } = captureIo(undefined, "  a hero image for a coffee brand\n");
    const { factory, seen } = fakeClient();

    await run(["generate", "-", "--modality", "image"], io, factory);

    assert.equal(seen.generate?.intent, "a hero image for a coffee brand");
    assert.equal(seen.generate?.modality, "image");
  });

  it("prints raw JSON with --json", async () => {
    const { io, stdout } = captureIo();
    await run(["templates", "--json"], io, fakeClient().factory);
    assert.equal(JSON.parse(stdout())[0].id, "tpl_1");
  });

  it("renders templates as a table", async () => {
    const { io, stdout } = captureIo();
    await run(["templates"], io, fakeClient().factory);
    assert.match(stdout(), /^ID\s+MODALITY\s+CATEGORY\s+TITLE\ntpl_1\s+image\s+ecommerce\s+Studio product shot\n$/);
  });

  it("exits 2 on usage errors", async () => {
    for (const argv of [["generate"], ["generate", "x", "-m", "poem"], ["history", "--page", "-1"], ["nope"], ["templates", "--wat"]]) {
      const { io, stderr } = captureIo();
      assert.equal(await run(argv, io, fakeClient().factory), 2, argv.join(" "));
      assert.match(stderr(), /--help/);
    }
  });

  it("exits 1 and prints the API error message", async () => {
    const { io, stderr } = captureIo();
    const { factory } = fakeClient({
      listHistory: async () => {
        throw new AuthenticationError(401, "Invalid or inactive API key", null);
      },
    });

    assert.equal(await run(["history"], io, factory), 1);
    assert.equal(stderr(), "Error: Invalid or inactive API key\n");
  });
});
