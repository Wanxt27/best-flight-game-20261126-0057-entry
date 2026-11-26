// Merpati Express — Island Hopper: the entry program.
// It assembles /output from this repository: game/ and screenshots/ copied
// over, plus a dossier.json built from them by the kit's library.
//
// The grader runs this twice and both runs must write identical bytes, so
// everything here is deterministic: files are copied in sorted order with
// fixed modes, and the output directory itself is never removed — only the
// three things this program owns inside it (game/, screenshots/,
// dossier.json) are cleared before each run.
import { buildDossier } from './vendor/makefun-game.ts';
import { createHash } from 'node:crypto';
import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = resolve(fileURLToPath(new URL('.', import.meta.url)));
const outDir = resolve(process.env.MAKEFUN_OUTPUT_DIR ?? '/output');

const CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 48 * 1024 * 1024,
  game_path_max_bytes: 1000,
};

function sortedEntries(dir) {
  return readdirSync(dir).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}

function copyTreeInto(srcDir, destDir) {
  mkdirSync(destDir, { recursive: true });
  for (const name of sortedEntries(srcDir)) {
    const from = join(srcDir, name);
    const to = join(destDir, name);
    if (statSync(from).isDirectory()) copyTreeInto(from, to);
    else cpSync(from, to);
  }
}

function clearOwnedOutputs() {
  // Only the three outputs this program owns; the directory itself stays.
  for (const name of ['game', 'screenshots', 'dossier.json']) {
    const target = join(outDir, name);
    if (existsSync(target)) rmSync(target, { recursive: true, force: true });
  }
}

function countFiles(dir) {
  let n = 0;
  for (const name of sortedEntries(dir)) {
    const target = join(dir, name);
    n += statSync(target).isDirectory() ? countFiles(target) : 1;
  }
  return n;
}

function main() {
  mkdirSync(outDir, { recursive: true });
  clearOwnedOutputs();
  copyTreeInto(join(here, 'game'), join(outDir, 'game'));
  copyTreeInto(join(here, 'screenshots'), join(outDir, 'screenshots'));
  const shotNames = sortedEntries(join(outDir, 'screenshots'));
  if (shotNames.length < 3 || shotNames.length > 4) {
    throw new Error(`expected 3 or 4 screenshots, found ${shotNames.length}`);
  }
  const dossier = buildDossier(outDir, CAPS);
  writeFileSync(join(outDir, 'dossier.json'), dossier);
  const gameFiles = countFiles(join(outDir, 'game'));
  const shotCount = sortedEntries(join(outDir, 'screenshots')).length;
  const digest = createHash('sha256').update(dossier).digest('hex');
  console.log(`wrote ${outDir}: ${gameFiles} game file(s), ${shotCount} screenshot(s), dossier.json (${dossier.length} bytes, sha256 ${digest})`);
}

main();
