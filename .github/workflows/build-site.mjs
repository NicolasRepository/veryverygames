#!/usr/bin/env node
/**
 * Builda o site inteiro (hub + todos os jogos) para a pasta site/.
 *
 * Como funciona:
 *  - Copia o index.html (hub) da raiz para site/.
 *  - Para cada pasta dentro de games/:
 *      - Se tiver package.json -> roda `npm ci` + `npm run build`
 *        e copia a pasta de saída (dist/ por padrão, ou o valor de
 *        `site.outDir` no package.json) para site/games/<nome>/.
 *      - Se NÃO tiver package.json -> é um jogo estático, e o
 *        conteúdo da pasta é copiado direto (ignorando arquivos
 *        como README.md, node_modules, etc).
 *
 * Isso significa que adicionar um novo jogo no futuro NÃO exige
 * editar o workflow do GitHub Actions: basta criar a pasta em
 * games/<nome-do-jogo>/ seguindo uma dessas duas convenções.
 */

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const GAMES_DIR = path.join(ROOT, "games");
const SITE_DIR = path.join(ROOT, "site");

// Arquivos/pastas que nunca devem ir para o site publicado,
// mesmo em jogos estáticos.
const IGNORE = new Set(["node_modules", ".git", "README.md", ".gitignore", "dist"]);

function log(msg) {
  console.log(`\n\x1b[36m▸ ${msg}\x1b[0m`);
}

function run(cmd, cwd) {
  console.log(`  $ ${cmd}  (em ${path.relative(ROOT, cwd) || "."})`);
  execSync(cmd, { cwd, stdio: "inherit" });
}

function copyDir(src, dest, { ignore = IGNORE } = {}) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (ignore.has(entry.name)) continue;
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath, { ignore });
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function buildGame(gameName, gameDir) {
  const pkgPath = path.join(gameDir, "package.json");
  const hasPackageJson = fs.existsSync(pkgPath);
  const destDir = path.join(SITE_DIR, "games", gameName);

  if (!hasPackageJson) {
    log(`"${gameName}" é estático (sem package.json) — copiando arquivos direto`);
    copyDir(gameDir, destDir);
    return;
  }

  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
  const outDir = pkg.site?.outDir || "dist";

  log(`"${gameName}" tem build (package.json encontrado) — instalando e buildando`);

  const hasLockfile = fs.existsSync(path.join(gameDir, "package-lock.json"));
  run(hasLockfile ? "npm ci" : "npm install", gameDir);

  if (!pkg.scripts?.build) {
    throw new Error(
      `O jogo "${gameName}" tem package.json mas não define um script "build". ` +
        `Adicione um script "build" em games/${gameName}/package.json.`
    );
  }
  run("npm run build", gameDir);

  const builtPath = path.join(gameDir, outDir);
  if (!fs.existsSync(builtPath)) {
    throw new Error(
      `Build de "${gameName}" não gerou a pasta esperada "${outDir}/". ` +
        `Se o seu bundler gera saída em outro lugar, defina "site": { "outDir": "sua-pasta" } no package.json do jogo.`
    );
  }

  copyDir(builtPath, destDir, { ignore: new Set() });
}

function main() {
  log("Limpando pasta site/");
  fs.rmSync(SITE_DIR, { recursive: true, force: true });
  fs.mkdirSync(SITE_DIR, { recursive: true });

  log("Copiando o hub (index.html)");
  fs.copyFileSync(path.join(ROOT, "index.html"), path.join(SITE_DIR, "index.html"));
  fs.writeFileSync(path.join(SITE_DIR, ".nojekyll"), "");

  // Copia uma pasta assets/ opcional na raiz (imagens, ícones do hub etc.)
  const assetsDir = path.join(ROOT, "assets");
  if (fs.existsSync(assetsDir)) {
    log("Copiando assets/ do hub");
    copyDir(assetsDir, path.join(SITE_DIR, "assets"));
  }

  const gameNames = fs
    .readdirSync(GAMES_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();

  if (gameNames.length === 0) {
    console.warn("Nenhum jogo encontrado em games/.");
  }

  for (const gameName of gameNames) {
    buildGame(gameName, path.join(GAMES_DIR, gameName));
  }

  log(`Site pronto em ${path.relative(ROOT, SITE_DIR)}/ ✅`);
  console.log(`Jogos publicados: ${gameNames.join(", ") || "(nenhum)"}`);
}

main();
