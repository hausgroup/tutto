"use client";

import {
  MENU_ALLERGEN_GROUPS,
  allergensForGroup,
  type AllergenId,
} from "@/lib/catalog/allergens";
import { cn } from "@/lib/utils";

export function AllergenPicker({
  selected,
  onChange,
  disabled = false,
}: {
  selected: AllergenId[];
  onChange: (next: AllergenId[]) => void;
  disabled?: boolean;
}) {
  function toggle(id: AllergenId) {
    onChange(
      selected.includes(id)
        ? selected.filter((item) => item !== id)
        : [...selected, id],
    );
  }

  return (
    <div
      className={cn(
        "max-h-52 overflow-y-auto rounded-input bg-muted/40 px-3 py-2.5 ring-1 ring-input-border",
        "space-y-3",
      )}
    >
      {MENU_ALLERGEN_GROUPS.map((group) => {
        const items = allergensForGroup(group.id);
        if (items.length === 0) return null;
        return (
          <section key={group.id} className="min-w-0">
            <h4 className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {group.title}
            </h4>
            <ul className="grid grid-cols-1 gap-1 sm:grid-cols-2 sm:gap-x-4">
              {items.map((allergen) => {
                const checked = selected.includes(allergen.id);
                return (
                  <li key={allergen.id} className="min-w-0">
                    <label
                      className={cn(
                        "flex cursor-pointer items-start gap-2.5 rounded-md px-1 py-1 transition-colors",
                        "hover:bg-muted/80",
                        checked && "bg-muted/60",
                      )}
                    >
                      <input
                        type="checkbox"
                        className="mt-0.5 size-3.5 shrink-0 rounded border-border accent-foreground"
                        checked={checked}
                        disabled={disabled}
                        onChange={() => toggle(allergen.id)}
                      />
                      <span className="min-w-0 leading-snug">
                        <span className="block text-sm text-foreground">
                          {allergen.label}
                        </span>
                        {allergen.detail ? (
                          <span className="block text-xs text-muted-foreground">
                            {allergen.detail}
                          </span>
                        ) : null}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
