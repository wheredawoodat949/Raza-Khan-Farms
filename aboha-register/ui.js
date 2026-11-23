import { prefs, t, locale, displayAmount } from "./settings.js";
const paths = {
  plus: "M12 5v14M5 12h14",
  pin: "M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z M15 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z",
  land: "m3 9 9-5 9 5-9 5-9-5Zm0 4 9 5 9-5M3 17l9 5 9-5",
  bill: "M5 3h14v18l-3-2-4 2-4-2-3 2V3Zm4 5h6M9 12h6",
  wallet: "M20 7H5a2 2 0 0 1 0-4h13v4M3 5v14a2 2 0 0 0 2 2h15V7m0 5h-5v4h5",
  tool: "m4 20 7-7M14 4a5 5 0 0 0-4 7l-7 7a2 2 0 0 0 3 3l7-7a6 6 0 0 0 7-8l-4 4-3-3 4-4Z",
  trend: "M3 18l6-6 4 3 7-9M14 6h6v6",
  list: "M8 6h13M8 12h13M8 18h13M3 6h1M3 12h1M3 18h1",
  map: "m2 6 6-3 8 3 6-3v15l-6 3-8-3-6 3V6Zm6-3v15m8-12v15",
  chevron: "m9 5 7 7-7 7",
  sun: "M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Zm-4-10v2m0 16v2M2 12h2m16 0h2M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2",
  water: "M12 2s-7 8-7 13a7 7 0 0 0 14 0c0-5-7-13-7-13Zm-3 13a3 3 0 0 0 3 3",
  close: "M5 5l14 14M19 5 5 19",
  edit: "m4 16 12-12 4 4L8 20l-5 1 1-5Zm10-10 4 4",
};
export const icon = (name, cls = "") =>
  '<svg class="ic ' +
  cls +
  '" viewBox="0 0 24 24" aria-hidden="true"><path d="' +
  paths[name] +
  '"/></svg>';
export const esc = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (ch) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        ch
      ],
  );
export const full = (n) =>
  n == null
    ? t("Unknown")
    : prefs.currency +
      " " +
      displayAmount(Number(n)).toLocaleString(locale(), {
        maximumFractionDigits: 2,
      });
export const short = (n) =>
  new Intl.NumberFormat(locale(), {
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(n);
export const date = (s) =>
  s
    ? new Date(s + "T12:00:00").toLocaleDateString(locale(), {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : t("Unknown");
export const today = () => {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10);
};
export const sum = (rows) =>
  rows.reduce((a, row) => a + Math.round(row.amount * 100), 0) / 100;
export const latest = (p) =>
  [...(p.values ?? [])].sort((a, b) => b.date.localeCompare(a.date))[0];
export const btn = (label, act, symbol = "", cls = "") =>
  '<button type="button" class="btn ' +
  cls +
  '" data-act="' +
  act +
  '">' +
  (symbol ? icon(symbol) : "") +
  t(label) +
  "</button>";
