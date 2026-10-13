import { THEME_DEFAULT, THEME_STORAGE_KEY } from "@/lib/theme/constants";

/** Runs in <head> before paint — keep in sync with `applyThemeToDocument`. */
export const THEME_BLOCKING_SCRIPT = `(function(){var k=${JSON.stringify(
  THEME_STORAGE_KEY,
)};var d=${JSON.stringify(THEME_DEFAULT)};var r=document.documentElement;function s(){return window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}var t;try{t=localStorage.getItem(k)||d}catch(e){t=d}var x=t==="system"?s():t;if(x!=="light"&&x!=="dark")x=s();r.classList.remove("light","dark");r.classList.add(x);r.style.colorScheme=x;r.dataset.theme=x})();`;
