import type { ChangeEvent } from "react";

const LETTER = /\p{L}/u;
const WORD_START = /(^|[\s\-'])(\p{L})/gu;

export function shouldAutoCapitalizeInput(
  type?: string,
  role?: string,
): boolean {
  if (role === "searchbox") return false;
  const t = (type ?? "text").toLowerCase();
  return !["email", "password", "number", "url", "search", "tel"].includes(t);
}

export function capitalizeWordsInInput(value: string): string {
  return value.replace(WORD_START, (_, prefix: string, letter: string) => {
    return prefix + letter.toLocaleUpperCase("es-CO");
  });
}

export function capitalizeSentenceInInput(value: string): string {
  if (!value) return value;
  const first = value.charAt(0);
  if (!LETTER.test(first)) return value;
  return first.toLocaleUpperCase("es-CO") + value.slice(1);
}

export function applyAutoCapitalizeChange(
  event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  mode: "words" | "sentences",
) {
  const el = event.target;
  const { value, selectionStart, selectionEnd } = el;
  const next =
    mode === "sentences"
      ? capitalizeSentenceInInput(value)
      : capitalizeWordsInInput(value);
  if (next === value) return;
  const delta = next.length - value.length;
  el.value = next;
  if (selectionStart != null && selectionEnd != null) {
    const start = Math.max(0, selectionStart + delta);
    const end = Math.max(0, selectionEnd + delta);
    el.setSelectionRange(start, end);
  }
}
