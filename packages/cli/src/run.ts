import { readFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { MODALITIES, PromtExpress, PromtExpressError, type ClientOptions, type Modality } from "promtexpress";

export interface Io {
  stdout: (text: string) => void;
  stderr: (text: string) => void;
  readStdin: () => Promise<string>;
  env: Record<string, string | undefined>;
}

export type Client = Pick<PromtExpress, "generate" | "listTemplates" | "listHistory">;
export type ClientFactory = (options: ClientOptions) => Client;

const VERSION: string = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")).version;

const HELP = `promtexpress ${VERSION}: turn plain-language intent into production-ready prompts

Usage:
  promtexpress generate <intent...> [options]   Compile a prompt (use "-" to read intent from stdin)
  promtexpress templates [options]              List published templates
  promtexpress history [options]                Show your recent generations

Options:
  -m, --modality <type>   ${MODALITIES.join(" | ")} (generate defaults to text)
  -e, --engine <id>       Target engine id (generate only)
      --page <n>          Zero-based page (history only)
      --limit <n>         Rows per page, 1-100 (history only)
      --json              Print the raw JSON response
  -h, --help              Show this help
  -v, --version           Show the version

Environment:
  PROMTEXPRESS_API_KEY    Your API key (required)
  PROMTEXPRESS_BASE_URL   Override the API base URL
`;

class UsageError extends Error {}

export async function run(argv: string[], io: Io, createClient: ClientFactory = (o) => new PromtExpress(o)): Promise<number> {
  const [command, ...args] = argv;
  if (!command || command === "help" || command === "--help" || command === "-h") {
    io.stdout(HELP);
    return 0;
  }
  if (command === "--version" || command === "-v") {
    io.stdout(`${VERSION}\n`);
    return 0;
  }

  try {
    const connect = () => createClient({ apiKey: io.env.PROMTEXPRESS_API_KEY, baseUrl: io.env.PROMTEXPRESS_BASE_URL });
    switch (command) {
      case "generate":
        return await generate(args, io, connect);
      case "templates":
        return await templates(args, io, connect);
      case "history":
        return await history(args, io, connect);
      default:
        throw new UsageError(`Unknown command: ${command}`);
    }
  } catch (err) {
    if (err instanceof UsageError || isParseArgsError(err)) {
      io.stderr(`${(err as Error).message}\nRun "promtexpress --help" for usage.\n`);
      return 2;
    }
    if (err instanceof PromtExpressError) {
      io.stderr(`Error: ${err.message}\n`);
      return 1;
    }
    throw err;
  }
}

async function generate(args: string[], io: Io, connect: () => Client): Promise<number> {
  const { values, positionals } = parseArgs({
    args,
    allowPositionals: true,
    options: {
      modality: { type: "string", short: "m", default: "text" },
      engine: { type: "string", short: "e" },
      json: { type: "boolean", default: false },
    },
  });

  let intent = positionals.join(" ");
  if (intent === "-") intent = (await io.readStdin()).trim();
  if (!intent) throw new UsageError("generate needs an intent, e.g. promtexpress generate \"launch email for my CRM\"");

  const result = await connect().generate({
    intent,
    modality: parseModality(values.modality),
    targetEngineId: values.engine,
  });

  if (values.json) {
    io.stdout(`${JSON.stringify(result, null, 2)}\n`);
    return 0;
  }

  // The prompt goes to stdout and everything else to stderr, so the output can be piped straight into another tool.
  io.stdout(result.output.endsWith("\n") ? result.output : `${result.output}\n`);
  if (result.chipQuestions?.length) {
    io.stderr("\nAnswering these would sharpen the prompt:\n");
    for (const question of result.chipQuestions) io.stderr(`  - ${question.label} (${question.options.join(" / ")})\n`);
  }
  io.stderr(`\n${result.creditsUsed} credits used, ${result.creditsRemaining} remaining\n`);
  return 0;
}

async function templates(args: string[], io: Io, connect: () => Client): Promise<number> {
  const { values } = parseArgs({
    args,
    options: {
      modality: { type: "string", short: "m" },
      json: { type: "boolean", default: false },
    },
  });

  const rows = await connect().listTemplates({
    modality: values.modality === undefined ? undefined : parseModality(values.modality),
  });

  if (values.json) {
    io.stdout(`${JSON.stringify(rows, null, 2)}\n`);
    return 0;
  }
  if (rows.length === 0) {
    io.stderr("No templates found.\n");
    return 0;
  }
  io.stdout(table(["ID", "MODALITY", "CATEGORY", "TITLE"], rows.map((t) => [t.id, t.modality, t.category, t.title])));
  return 0;
}

async function history(args: string[], io: Io, connect: () => Client): Promise<number> {
  const { values } = parseArgs({
    args,
    options: {
      modality: { type: "string", short: "m" },
      page: { type: "string" },
      limit: { type: "string" },
      json: { type: "boolean", default: false },
    },
  });

  const result = await connect().listHistory({
    modality: values.modality === undefined ? undefined : parseModality(values.modality),
    page: parseInteger(values.page, "--page"),
    limit: parseInteger(values.limit, "--limit"),
  });

  if (values.json) {
    io.stdout(`${JSON.stringify(result, null, 2)}\n`);
    return 0;
  }
  if (result.rows.length === 0) {
    io.stderr("No generations yet.\n");
    return 0;
  }
  io.stdout(
    table(
      ["DATE", "MODALITY", "ENGINE", "CREDITS", "TITLE"],
      result.rows.map((r) => [r.date, r.modality, r.engine, String(r.credits), r.title]),
    ),
  );
  const shown = result.page * result.pageSize + result.rows.length;
  io.stderr(`\n${shown} of ${result.total}\n`);
  return 0;
}

function parseModality(value: string): Modality {
  if (!(MODALITIES as readonly string[]).includes(value)) {
    throw new UsageError(`Invalid modality "${value}". Use one of: ${MODALITIES.join(", ")}`);
  }
  return value as Modality;
}

function parseInteger(value: string | undefined, flag: string): number | undefined {
  if (value === undefined) return undefined;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) throw new UsageError(`${flag} must be a non-negative integer`);
  return parsed;
}

function table(header: string[], rows: string[][]): string {
  const all = [header, ...rows].map((row) => row.map((cell) => cell.replace(/\s+/g, " ")));
  const widths = header.map((_, i) => Math.max(...all.map((row) => row[i].length)));
  return all
    .map((row) => row.map((cell, i) => (i === row.length - 1 ? cell : cell.padEnd(widths[i]))).join("  "))
    .join("\n")
    .concat("\n");
}

function isParseArgsError(err: unknown): boolean {
  const code = (err as { code?: unknown })?.code;
  return typeof code === "string" && code.startsWith("ERR_PARSE_ARGS");
}
