import fs from "node:fs";
import path from "node:path";

const style = "radix-nova";
const components = [
  "button",
  "card",
  "input",
  "label",
  "separator",
  "sheet",
  "sidebar",
  "avatar",
  "dropdown-menu",
  "badge",
  "skeleton",
  "sonner",
  "tooltip",
  "dialog",
  "select",
  "alert",
  "textarea",
  "switch",
  "scroll-area",
  "tabs",
  "breadcrumb",
  "collapsible",
];

const uiDir = path.join(process.cwd(), "src/components/ui");

for (const name of components) {
  const url = `https://ui.shadcn.com/r/styles/${style}/${name}.json`;
  const res = await fetch(url);
  if (!res.ok) {
    console.error(`Failed ${name}: ${res.status}`);
    process.exitCode = 1;
    continue;
  }
  const json = await res.json();
  for (const file of json.files ?? []) {
    if (!file.path?.includes("/ui/")) continue;
    const filename = path.basename(file.path);
    const target = path.join(uiDir, filename);
    let content = file.content;
    content = content.replace(
      /VariantProps(?![<])/g,
      "VariantProps<typeof buttonVariants>",
    );
    fs.writeFileSync(target, content);
    console.log(`Wrote ${filename}`);
  }
}

console.log("Done");
