import fs from "node:fs";
import path from "node:path";

const uiDir = path.join(process.cwd(), "src/components/ui");

const lucideMap = {
  ChevronRightIcon: "ChevronRight",
  MoreHorizontalIcon: "MoreHorizontal",
  ChevronDownIcon: "ChevronDown",
  ChevronUpIcon: "ChevronUp",
  CheckIcon: "Check",
  XIcon: "X",
  PanelLeftIcon: "PanelLeft",
  CircleCheckIcon: "CircleCheck",
  InfoIcon: "Info",
  TriangleAlertIcon: "TriangleAlert",
  OctagonXIcon: "OctagonX",
  Loader2Icon: "Loader2",
};

function lucideFromPlaceholder(block) {
  const match = block.match(/lucide="([^"]+)"/);
  if (!match) return null;
  const mapped = lucideMap[match[1] ?? ""];
  if (!mapped) return null;
  const classMatch = block.match(/className="([^"]*)"/);
  const className = classMatch?.[1] ?? "size-4";
  return { icon: mapped, className };
}

const files = fs.readdirSync(uiDir).filter((f) => f.endsWith(".tsx"));

for (const file of files) {
  const filePath = path.join(uiDir, file);
  let content = fs.readFileSync(filePath, "utf8");

  content = content.replaceAll("@/registry/radix-nova/ui/", "@/components/ui/");
  content = content.replaceAll("@/registry/radix-nova/hooks/", "@/hooks/");

  const icons = new Set();
  content = content.replace(/<IconPlaceholder[\s\S]*?\/>/g, (block) => {
    const parsed = lucideFromPlaceholder(block);
    if (!parsed) return block;
    icons.add(parsed.icon);
    return `<${parsed.icon} className="${parsed.className}" />`;
  });

  content = content.replace(
    /import \{ IconPlaceholder \} from "@\/app\/\(create\)\/components\/icon-placeholder"\n/g,
    "",
  );

  if (icons.size > 0) {
    const iconImport = `import { ${[...icons].sort().join(", ")} } from "lucide-react"\n`;
    if (!content.includes('from "lucide-react"')) {
      content = iconImport + content;
    }
  }

  content = content.replace(
    'import { cva, type VariantProps<typeof buttonVariants> } from "class-variance-authority"',
    'import { cva, type VariantProps } from "class-variance-authority"',
  );

  fs.writeFileSync(filePath, content);
}

console.log("Fixed UI imports and icons");
