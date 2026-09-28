import fs from "node:fs";
import path from "node:path";

const uiDir = path.join(process.cwd(), "src/components/ui");
for (const file of fs.readdirSync(uiDir).filter((f) => f.endsWith(".tsx"))) {
  const filePath = path.join(uiDir, file);
  let content = fs.readFileSync(filePath, "utf8");
  if (!content.includes('"use client"')) continue;

  content = content.replace(/^import[\s\S]*?from "lucide-react"\n(?="use client")/m, "");
  content = content.replace('"use client"\n\n', '"use client"\n\n');
  if (!content.startsWith('"use client"')) {
    content = content.replace(/"use client"\s*\n/, "");
    const lucideImports = [...content.matchAll(/^import \{[^}]+\} from "lucide-react"\n/gm)].map(
      (m) => m[0],
    );
    for (const imp of lucideImports) {
      content = content.replace(imp, "");
    }
    const mergedIcons = new Set();
    for (const imp of lucideImports) {
      const names = imp.match(/\{([^}]+)\}/)?.[1] ?? "";
      names.split(",").forEach((n) => mergedIcons.add(n.trim()));
    }
    const lucideLine =
      mergedIcons.size > 0
        ? `import { ${[...mergedIcons].join(", ")} } from "lucide-react"\n`
        : "";
    content = `"use client"\n\n${lucideLine}${content.trimStart()}`;
  }
  fs.writeFileSync(filePath, content);
}
console.log("Fixed use client order");
