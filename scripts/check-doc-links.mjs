import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, extname, isAbsolute, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ignoredDirectories = new Set([".git", ".next", ".next-dev", "node_modules"]);
const markdownFiles = [];

function collect(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) collect(path);
    else if (entry.isFile() && extname(entry.name).toLowerCase() === ".md") markdownFiles.push(path);
  }
}

function destination(raw) {
  const trimmed = raw.trim();
  if (trimmed.startsWith("<")) {
    const end = trimmed.indexOf(">");
    return end === -1 ? trimmed.slice(1) : trimmed.slice(1, end);
  }
  return trimmed.split(/\s+["']/u, 1)[0];
}

collect(repositoryRoot);

const failures = [];
const linkPattern = /!?\[[^\]]*\]\(([^)]+)\)/gu;
for (const file of markdownFiles) {
  const source = readFileSync(file, "utf8");
  for (const match of source.matchAll(linkPattern)) {
    const target = destination(match[1]);
    if (!target || target.startsWith("#") || /^(?:https?:|mailto:|tel:|data:)/iu.test(target)) continue;
    const withoutAnchor = target.split("#", 1)[0].split("?", 1)[0];
    if (!withoutAnchor) continue;
    let decoded;
    try {
      decoded = decodeURIComponent(withoutAnchor);
    } catch {
      failures.push(`${file.slice(repositoryRoot.length + 1)}: invalid encoded link ${target}`);
      continue;
    }
    const resolved = normalize(isAbsolute(decoded)
      ? join(repositoryRoot, decoded.replace(/^\/+/, ""))
      : resolve(dirname(file), decoded));
    if (!resolved.startsWith(`${repositoryRoot}/`) && resolved !== repositoryRoot) {
      failures.push(`${file.slice(repositoryRoot.length + 1)}: link escapes repository ${target}`);
    } else if (!existsSync(resolved)) {
      failures.push(`${file.slice(repositoryRoot.length + 1)}: missing ${target}`);
    } else if (statSync(resolved).isDirectory() && !existsSync(join(resolved, "README.md")) && !existsSync(join(resolved, "index.md"))) {
      failures.push(`${file.slice(repositoryRoot.length + 1)}: directory link has no README.md or index.md ${target}`);
    }
  }
}

if (failures.length > 0) {
  console.error(`Documentation check failed (${failures.length}):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Documentation check passed (${markdownFiles.length} Markdown files).`);
