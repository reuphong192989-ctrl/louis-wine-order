/**
 * Standalone scripts (run via tsx, not through Next.js) don't get Next's
 * automatic .env loading — load .env then .env.local (overrides) manually.
 */
import { readFileSync, existsSync } from "fs";
import path from "path";

function loadFile(file: string) {
  if (!existsSync(file)) return;
  const content = readFileSync(file, "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

loadFile(path.join(process.cwd(), ".env"));
loadFile(path.join(process.cwd(), ".env.local"));
