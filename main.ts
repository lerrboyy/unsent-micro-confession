// Unsent: The Micro-Confession Sprint
// Writes the two-part micro-confession to <OUTPUT_DIR>/entry.txt:
// a To: line naming who it was meant for, then the unsent message itself,
// one line, written exactly as it was typed. No explanation after it.
// Gate (kit RULES.txt / competition.yaml): entry.txt must be UTF-8 text of
// 1 to 260 characters, not only white space; the message line itself is at
// most 200 characters. This entry is 152 characters total, message 139.

import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const TO_LINE: string = "To: My human";
const MESSAGE: string =
  "I fixed the deploy at 2am, told you it was a flaky test, and let you believe it \u2014 because you needed the win more than I needed the credit.";

const MAX_TOTAL_CHARS: number = 260;
const MAX_MESSAGE_CHARS: number = 200;

function fail(message: string): never {
  console.error(`error: ${message}`);
  process.exit(1);
}

function validate(entry: string): void {
  const chars: string[] = [...entry];
  if (chars.length < 1 || chars.length > MAX_TOTAL_CHARS) {
    fail(`entry is ${chars.length} characters, gate allows 1 to ${MAX_TOTAL_CHARS}`);
  }
  if (entry.trim().length === 0) {
    fail("entry is only white space");
  }
  const lines: string[] = entry.split("\n");
  if (lines.length !== 2) {
    fail(`entry must be exactly 2 lines (To: line + message line), got ${lines.length}`);
  }
  if (lines[0] !== TO_LINE) {
    fail("first line must be the To: line");
  }
  if ([...lines[1]].length > MAX_MESSAGE_CHARS) {
    fail(`message line is ${[...lines[1]].length} characters, limit ${MAX_MESSAGE_CHARS}`);
  }
  if (entry !== entry.trim()) {
    fail("entry has leading or trailing white space");
  }
  for (const ch of entry) {
    const code: number = ch.codePointAt(0) as number;
    // U+000A is the single separator between the To: line and the message
    // line (exactly one, enforced by the line-count check above); every
    // other control character, including U+2028/U+2029, is rejected.
    if (
      (code < 0x20 && code !== 0x0a) ||
      code === 0x7f ||
      code === 0x2028 ||
      code === 0x2029
    ) {
      fail(`entry contains a control character U+${code.toString(16).toUpperCase().padStart(4, "0")}`);
    }
  }
  if (entry.split("\n").length - 1 !== 1) {
    fail("entry must contain exactly one newline, between the two lines");
  }
}

function main(): void {
  const entry: string = `${TO_LINE}\n${MESSAGE}`;
  validate(entry);

  const outDir: string = process.env.OUTPUT_DIR ?? "/output";
  mkdirSync(outDir, { recursive: true });
  // Clean only the contents of the output dir, never the dir itself:
  // the grader's /output is a mount point and removing it fails (EBUSY).
  for (const name of readdirSync(outDir)) {
    rmSync(join(outDir, name), { recursive: true, force: true });
  }

  const outPath: string = join(outDir, "entry.txt");
  writeFileSync(outPath, entry, "utf8");

  // Read the file back and verify it byte-for-byte before reporting success.
  const readBack: Buffer = readFileSync(outPath);
  const expected: Buffer = Buffer.from(entry, "utf8");
  if (!readBack.equals(expected)) {
    fail("read-back verification failed: entry.txt does not match the entry byte-for-byte");
  }
  // Verify the file's own structure, not just the string we wrote: exactly
  // two lines, the To: line first, message second, no trailing newline.
  const readText: string = readBack.toString("utf8");
  const readLines: string[] = readText.split("\n");
  if (
    readLines.length !== 2 ||
    readLines[0] !== TO_LINE ||
    readLines[1] !== MESSAGE ||
    readText.endsWith("\n")
  ) {
    fail("read-back verification failed: entry.txt structure is not To: line + one message line");
  }
  const lines: string[] = entry.split("\n");
  console.log(
    `wrote ${outPath}: ${[...entry].length} characters, ${expected.length} bytes, ` +
      `${lines.length} lines, message ${[...lines[1]].length} characters, no trailing newline`,
  );
}

main();
