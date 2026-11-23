import {
  t,
  prefs,
  isDemo,
  displayAmount,
  setPreference,
} from "./settings.js";
import {
  openRegister,
  replacePortfolio,
  readRows,
  updateRow,
  categories,
  photos,
} from "./data.js";
import { icon, esc, full, short, date, today, sum, latest, btn } from "./ui.js";
const main = document.querySelector("main"),
  dlg = document.querySelector("dialog");
let properties = [],
  expenses = [],
  view = "list",
  search = "",
  type = "",
  spendingFilter = "",
  activeMap,
  picker,
  formContext,
  toastTimer;
const id = () => crypto.randomUUID();
const propertyById = (key) => properties.find((p) => p.id === key);
const current = () => decodeURIComponent(location.hash.slice(1)) || "overview";
const lookupExpense = (key) => expenses.find((e) => e.id === key);
const sortedExpenses = (rows) =>
  [...rows].sort((a, b) => b.date.localeCompare(a.date));
const projectSpend = (p) =>
  sum(expenses.filter((e) => e.property === p.id && e.category !== "Bills"));
const attachName = (file) => (file ? esc(file.name) : "");
function notify(message) {
  const toast = document.querySelector("#toast");
  toast.textContent = t(message);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (toast.textContent = ""), 3200);
}
async function refresh() {
  [properties, expenses] = await Promise.all([
    readRows("properties"),
    readRows("expenses"),
  ]);
  properties.sort((a, b) => a.name.localeCompare(b.name));
  render();
}
function heading(title, actions = "") {
  return (
    '<div class="page-title"><h1>' +
    esc(t(title)) +
    '</h1><div class="actions">' +
    actions +
    "</div></div>"
  );
}
function photo(p) {
  return photos[p.photo]
    ? '<img src="' + photos[p.photo] + '" alt="">'
    : '<span class="placeholder">' + icon("land") + "</span>";
}
function coverage(count) {
  return t("Across {n} of {total} properties", {
    n: count,
    total: properties.length,
  });
}
function metrics() {
  const count = properties.length,
    priced = properties.filter((p) => p.price != null),
    valued = properties.filter((p) => latest(p));
  const mix = [...new Set(properties.map((p) => p.type || "Unspecified"))]
    .map(
      (landUse) =>
        properties.filter((p) => (p.type || "Unspecified") === landUse).length +
        " " +
        (prefs.language === "ps" ? t(landUse) : landUse.toLowerCase()),
    )
    .join(" · ");
  const items = [
    [
      "properties",
      "Properties",
      count,
      mix || t("No properties recorded"),
      "land",
      "",
      false,
    ],
    [
      "value",
      "Estimated value",
      valued.reduce((n, p) => n + latest(p).amount, 0),
      coverage(valued.length),
      "trend",
      "sage",
      true,
    ],
    [
      "price",
      "Purchase cost",
      priced.reduce((n, p) => n + p.price, 0),
      coverage(priced.length),
      "wallet",
      "gold",
      true,
    ],
    [
      "improvements",
      "Improvements",
      sum(expenses.filter((e) => e.category !== "Bills")),
      t("Paid project expenses"),
      "tool",
      "blue",
      true,
    ],
  ];
  return (
    '<div class="stats">' +
    items
      .map(
        ([key, label, n, note, symbol, tint, money]) =>
          '<button class="metric" data-act="metric" data-key="' +
          key +
          '"><span class="metric-label"><span class="tile-icon ' +
          tint +
          '">' +
          icon(symbol) +
          "</span>" +
          t(label) +
          "</span><strong>" +
          (money ? "<small>" + prefs.currency + "</small>" : "") +
          short(money ? displayAmount(n) : n) +
          '</strong><span class="hint">' +
          note +
          "</span></button>",
      )
      .join("") +
    "</div>"
  );
}
function propertyRows(rows) {
  return rows.length
    ? `<div class="labels"><span>${t("Property")}</span><span class="type">${t("Land use")}</span><span class="money">${t("Est. value")}</span><span></span></div>` +
        rows
          .map(
            (p) =>
              '<a class="row" href="#p/' +
              p.id +
              '"><span class="prop-id">' +
              photo(p) +
              "<span><b>" +
              esc(p.name) +
              '</b><span class="meta">' +
              esc(
                [p.locality, p.area].filter(Boolean).join(" · ") ||
                  t("Location unknown"),
              ) +
              '</span></span></span><span class="tag ' +
              (p.type === "Commercial" ? "com" : "") +
              '">' +
              esc(t(p.type || "Unknown")) +
              '</span><span class="money">' +
              full(latest(p)?.amount) +
              "</span>" +
              icon("chevron", "chev") +
              "</a>",
          )
          .join("")
    : `<p class="empty">${t("No matching properties.")}</p>`;
}
function filtered() {
  return properties.filter(
    (p) =>
      (!type || p.type === type) &&
      [p.name, p.locality]
        .join(" ")
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
}
function propertyPanel(all = false) {
  const rows = all ? filtered() : properties;
  return (
    '<section class="panel"><div class="panel-head"><h2>' +
    t(all ? "Property register" : "My properties") +
    ' <span class="count">' +
    rows.length +
    `</span></h2><div class="switch" aria-label="${t("Property display")}">` +
    ["list", "map"]
      .map(
        (v) =>
          '<button aria-pressed="' +
          (view === v) +
          '" data-act="view" data-key="' +
          v +
          '" class="' +
          (v === view ? "active" : "") +
          '">' +
          icon(v) +
          t(v === "map" ? "Map" : "List") +
          "</button>",
      )
      .join("") +
    "</div></div>" +
    (all
      ? `<div class="filters"><input id="search" aria-label="${t("Search properties")}" placeholder="${t("Search name or location")}" value="` +
        esc(search) +
        `"><select id="type-filter" aria-label="${t("Land use")}"><option value="">${t("All land uses")}</option>` +
        options(["Agricultural", "Commercial", "Other"], type) +
        "</select></div>"
      : "") +
    '<div id="property-body">' +
    (view === "list"
      ? propertyRows(rows)
      : '<div class="map" id="map"></div><p class="map-note" id="map-note"></p>') +
    "</div></section>"
  );
}
function breakdown() {
  const total = sum(expenses);
  let pos = 0;
  const list = Object.entries(categories)
    .map(([name, config]) => ({
      name,
      ...config,
      amount: sum(expenses.filter((e) => e.category === name)),
    }))
    .filter((c) => c.amount > 0);
  const gradient = list
    .map((c) => {
      const start = pos;
      pos += (100 * c.amount) / total;
      return c.color + " " + start + "% " + pos + "%";
    })
    .join(",");
  return (
    `<section class="panel"><div class="panel-head"><h2>${t("Spending breakdown")}</h2></div><div class="chart-content"><div class="chart-summary"><div aria-hidden="true" class="donut" style="background:` +
    (total ? "conic-gradient(" + gradient + ")" : "#e6eae3") +
    `"></div><div><div class="hint">${t("Total spent after purchase")}</div><div class="chart-total">` +
    full(total) +
    '</div></div></div><div class="legends">' +
    list
      .map(
        (c) =>
          '<button data-act="category" data-key="' +
          c.name +
          '" class="legend"><i class="dot" style="background:' +
          c.color +
          '"></i><span>' +
          t(c.name) +
          "</span><span>" +
          full(c.amount) +
          "</span></button>",
      )
      .join("") +
    "</div></div></section>"
  );
}
function expenseRows(rows, detail = false) {
  if (!rows.length) return `<p class="empty">${t("No expenses recorded.")}</p>`;
  return sortedExpenses(rows)
    .map(
      (e) =>
        '<button class="expense-row" data-act="expense" data-key="' +
        e.id +
        '"><span class="tile-icon">' +
        icon(categories[e.category]?.icon || "bill") +
        "</span><span><b>" +
        esc(e.description) +
        '</b><span class="meta">' +
        esc(
          detail ? e.project || t(e.category) : propertyById(e.property)?.name,
        ) +
        " · " +
        date(e.date) +
        '</span></span><span class="right money">' +
        full(e.amount) +
        "</span>" +
        icon("chevron", "chev") +
        "</button>",
    )
    .join("");
}
function overview() {
  return (
    '<section class="hero"><div class="hero-inner"><span class="location">' +
    icon("pin") +
    `${t("Aboha, Swat Valley")}</span><h1>${t("Welcome")}</h1><div class="actions">` +
    btn("Add property", "property", "plus") +
    btn("Record expense", "expense", "bill", "ghost") +
    "</div></div></section>" +
    metrics() +
    '<div class="columns">' +
    propertyPanel() +
    breakdown() +
    `</div><div class="section-head"><h2>${t("Recent expenses")}</h2><a class="text" href="#expenses">${t("View all expenses")}</a></div><section class="panel">` +
    expenseRows(sortedExpenses(expenses).slice(0, 3)) +
    "</section>"
  );
}
function line(label, value) {
  return (
    '<div class="line"><span>' +
    t(label) +
    "</span><strong>" +
    value +
    "</strong></div>"
  );
}
function propertyPage(p) {
  const rows = expenses.filter((e) => e.property === p.id),
    projects = groupProjects(rows);
  const values = [...(p.values || [])].sort((a, b) =>
    b.date.localeCompare(a.date),
  );
  return (
    '<a class="back" href="#properties">' +
    icon("chevron") +
    ` ${t("All properties")}</a><section class="detail-hero">` +
    photo(p) +
    '<div><p class="meta">' +
    esc(t(p.type || "Land")) +
    "</p><h1>" +
    esc(p.name) +
    '</h1><p class="meta">' +
    esc([p.locality, p.area].filter(Boolean).join(" · ")) +
    '</p></div><div class="actions">' +
    btn("Edit property", "edit-property", "edit") +
    btn("Record expense", "expense", "plus", "primary") +
    `</div></section><div class="detail-grid"><div><section class="panel"><div class="panel-head"><h2>${t("Improvement projects")}</h2></div>` +
    ([...projects]
      .map(
        ([name, items]) =>
          '<h3 class="subheading">' +
          esc(name) +
          " · " +
          full(sum(items)) +
          "</h3>" +
          expenseRows(items, true),
      )
      .join("") ||
      `<p class="empty">${t("No project expenses recorded.")}</p>`) +
    `</section><section class="panel"><div class="panel-head"><h2>${t("Other paid bills")}</h2></div>` +
    expenseRows(
      rows.filter((e) => e.category === "Bills"),
      true,
    ) +
    `</section></div><div><section class="panel"><div class="panel-head"><h2>${t("Property record")}</h2></div>` +
    line("Purchase cost", full(p.price)) +
    line("Purchase date", date(p.purchased)) +
    line("Improvements", full(projectSpend(p))) +
    line("Paid bills", full(sum(rows.filter((e) => e.category === "Bills")))) +
    line("Landmark", esc(p.landmark || t("Unknown"))) +
    line(
      "Map pin",
      p.lat != null
        ? `<button class="text" data-act="show-pin">${t("View location")}</button>`
        : t("Unknown"),
    ) +
    (p.deed
      ? line(
          "Deed",
          `<button class="text" data-act="deed">${t("Download file")}</button>`,
        )
      : "") +
    `</section><section class="panel"><div class="panel-head"><h2>${t("Valuations")}</h2>` +
    btn("Add", "value", "plus") +
    "</div>" +
    (values
      .map(
        (v) =>
          '<div class="line"><span>' +
          date(v.date) +
          "<br><small>" +
          esc(v.source) +
          "</small></span><strong>" +
          full(v.amount) +
          "</strong></div>",
      )
      .join("") || `<p class="empty">${t("No estimates recorded.")}</p>`) +
    "</section></div></div>"
  );
}
function groupProjects(rows) {
  const groups = new Map();
  for (const e of rows.filter((e) => e.category !== "Bills")) {
    const k = e.project || t(e.category);
    groups.set(k, [...(groups.get(k) || []), e]);
  }
  return groups;
}
function expensesPage() {
  const rows = expenses.filter(
    (e) => !spendingFilter || e.category === spendingFilter,
  );
  return (
    heading(
      "Expense ledger",
      btn("Record expense", "expense", "plus", "primary"),
    ) +
    '<section class="panel"><div class="panel-head"><h2>' +
    full(sum(rows)) +
    `</h2><select aria-label="${t("Expense category")}" id="expense-filter"><option value="">${t("All categories")}</option>` +
    options(Object.keys(categories), spendingFilter) +
    "</select></div>" +
    expenseRows(rows) +
    "</section>"
  );
}
function updateHeader() {
  document.documentElement.lang = prefs.language;
  document.documentElement.dir = prefs.language === "ps" ? "rtl" : "ltr";
  document.title = t("Raza Khan Farms");
  document.querySelector(".brand span").textContent = document.title;
  document.querySelector(".skip").textContent = t("Skip to content");
  document
    .querySelector("nav")
    .setAttribute("aria-label", t("Main navigation"));
  ["Overview", "Properties", "Expenses"].forEach(
    (label, i) =>
      (document.querySelectorAll("nav a")[i].textContent = t(label)),
  );
  document
    .querySelectorAll("[data-language],[data-currency]")
    .forEach((button) => {
      const active =
        button.dataset.language === prefs.language ||
        button.dataset.currency === prefs.currency;
      button.setAttribute("aria-pressed", String(active));
      button.classList.toggle("active", active);
    });
  document
    .querySelectorAll("[data-label]")
    .forEach((el) => el.setAttribute("aria-label", t(el.dataset.label)));
  const signout = document.querySelector("#signout");
  if (isDemo) {
    signout.onsubmit = event => {
      event.preventDefault();
      location.assign("/login?lang=" + prefs.language);
    };
    signout.querySelector("span").dataset.text = "Exit demo";
  } else {
    signout.action = "/logout?lang=" + prefs.language;
  }
  document.querySelectorAll("[data-text]").forEach(el => {
    el.textContent = t(el.dataset.text);
  });
}
function render() {
  updateHeader();
  activeMap?.remove();
  activeMap = null;
  const route = current(),
    p = route.startsWith("p/") ? propertyById(route.slice(2)) : null;
  const section = p ? "properties" : route;
  document.querySelectorAll("nav a").forEach((a) => {
    if (a.hash === "#" + section) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  });
  if (route === "overview") main.innerHTML = overview();
  else if (route === "properties")
    main.innerHTML =
      heading(
        "My properties",
        btn("Add property", "property", "plus", "primary"),
      ) + propertyPanel(true);
  else if (route === "expenses") main.innerHTML = expensesPage();
  else if (p) main.innerHTML = propertyPage(p);
  else
    main.innerHTML =
      heading("Page unavailable") +
      `<a class="text" href="#overview">${t("Return to overview")}</a>`;
  if (document.querySelector("#map"))
    activeMap = portfolioMap(route === "overview" ? properties : filtered());
}
function baseMap(element) {
  const map = L.map(element, {
    scrollWheelZoom: false,
    zoomControl: false,
  }).setView([34.663, 72.19], 13);
  L.control
    .zoom({ zoomInTitle: t("Zoom in"), zoomOutTitle: t("Zoom out") })
    .addTo(map);
  const tiles = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(map);
  tiles.once("tileerror", () => {
    const note = element.parentElement.querySelector(".map-note");
    if (note)
      note.textContent +=
        " " + t("Map imagery requires an internet connection.");
  });
  return map;
}
function marker(map, lat, lng) {
  return L.marker([lat, lng], {
    icon: L.divIcon({
      className: "map-marker",
      iconSize: [19, 19],
      iconAnchor: [9, 9],
    }),
  }).addTo(map);
}
function portfolioMap(rows) {
  const map = baseMap(document.querySelector("#map")),
    points = rows.filter((p) => p.lat != null && p.lng != null);
  for (const p of points) {
    const a = document.createElement("a");
    a.href = "#p/" + p.id;
    a.textContent = p.name;
    marker(map, p.lat, p.lng).bindPopup(a).bindTooltip(esc(p.name));
  }
  if (points.length)
    map.fitBounds(
      points.map((p) => [p.lat, p.lng]),
      { padding: [35, 35], maxZoom: 15 },
    );
  document.querySelector("#map-note").textContent = t(
    "{n} of {total} properties have a saved pin.",
    { n: points.length, total: rows.length },
  );
  return map;
}
function options(strings, selected, translate = true) {
  return strings
    .map(
      (s) =>
        '<option value="' +
        esc(s) +
        '" ' +
        (s === selected ? "selected" : "") +
        ">" +
        esc(translate ? t(s) : s) +
        "</option>",
    )
    .join("");
}
function field(label, control, wide = false) {
  return (
    '<label class="field ' +
    (wide ? "wide" : "") +
    '">' +
    t(label) +
    control +
    "</label>"
  );
}
function input(name, value = "", attrs = "") {
  return '<input name="' + name + '" value="' + esc(value) + '" ' + attrs + ">";
}
function modal(title, body, translate = true) {
  dlg.innerHTML =
    '<div class="dialog-head"><h2 id="dialog-title">' +
    (translate ? t(title) : title) +
    `</h2><button type="button" data-act="close" class="icon-btn" aria-label="${t("Close")}">` +
    icon("close") +
    '</button></div><div class="dialog-body">' +
    body +
    "</div>";
  dlg.showModal();
  const amount = dlg.querySelector('input[name="amount"],input[name="price"]');
  if (amount && prefs.currency === "USD") {
    const preview = document.createElement("output");
    preview.className = "fx-preview";
    const update = () => {
      preview.textContent =
        amount.value !== "" && amount.validity.valid
          ? t("Approx.") + " " + full(Number(amount.value))
          : "";
    };
    amount.insertAdjacentElement("afterend", preview);
    amount.addEventListener("input", update);
    update();
  }
}
function form(title, fields, save) {
  modal(
    title,
    '<form><div class="form-grid">' +
      fields +
      '</div><p class="form-error" role="alert"></p><div class="form-actions">' +
      btn("Cancel", "close") +
      '<button type="submit" class="btn primary">' +
      t(save) +
      "</button></div></form>",
  );
}
function propertyForm(p = {}) {
  formContext = { kind: "property", key: p.id };
  form(
    p.id ? "Edit property" : "Add property",
    field(
      "Property name",
      input("name", p.name, 'required maxlength="100" autofocus'),
      true,
    ) +
      field(
        "Land use",
        `<select name="type"><option value="">${t("Unknown")}</option>` +
          options(["Agricultural", "Commercial", "Other"], p.type) +
          "</select>",
      ) +
      field(
        "Locality",
        input("locality", p.locality, `placeholder="${t("e.g. Aboha")}"`),
      ) +
      field(
        "Land area and unit",
        input("area", p.area, `placeholder="${t("e.g. 12 kanal")}"`),
      ) +
      field("Landmark", input("landmark", p.landmark)) +
      field(
        "Purchase price (PKR)",
        input(
          "price",
          p.price,
          'type="number" min="0" step=".01" max="999999999999"',
        ),
      ) +
      field("Purchase date", input("purchased", p.purchased, 'type="date"')) +
      field(
        "Latitude",
        input("lat", p.lat, 'type="number" step="any" min="-85" max="85"'),
      ) +
      field(
        "Longitude",
        input("lng", p.lng, 'type="number" step="any" min="-180" max="180"'),
      ) +
      '<div class="wide">' +
      btn("Choose pin on map", "pick", "pin") +
      '<div id="picker" hidden class="map picker"></div><div class="map-note" hidden></div></div>' +
      field(
        "Deed file (optional)",
        input("deed", "", 'type="file" accept="image/*,application/pdf"') +
          (p.deed
            ? `<small>${t("Saved")}: ` + attachName(p.deed) + "</small>"
            : ""),
        true,
      ),
    "Save property",
  );
}
function expenseForm(e = {}, property = "") {
  if (!properties.length) {
    modal(
      "Add a property first",
      btn("Add property", "first-property", "plus"),
    );
    return;
  }
  formContext = { kind: "expense", key: e.id };
  form(
    e.id ? "Edit expense" : "Record expense",
    field(
      "Property",
      `<select name="property" required><option value="">${t("Choose property")}</option>` +
        properties
          .map(
            (p) =>
              '<option value="' +
              p.id +
              '" ' +
              (p.id === (e.property || property) ? "selected" : "") +
              ">" +
              esc(p.name) +
              "</option>",
          )
          .join("") +
        "</select>",
      true,
    ) +
      field(
        "Description",
        input(
          "description",
          e.description,
          `required maxlength="150" placeholder="${t("e.g. Solar panel installation")}"`,
        ),
        true,
      ) +
      field(
        "Amount paid (PKR)",
        input(
          "amount",
          e.amount,
          'required type="number" min=".01" step=".01" max="999999999999"',
        ),
      ) +
      field(
        "Date paid",
        input("date", e.date || today(), 'type="date" required'),
      ) +
      field(
        "Category",
        '<select name="category">' +
          options(Object.keys(categories), e.category) +
          "</select>",
      ) +
      field(
        "Project",
        input(
          "project",
          e.project,
          `list="projects" placeholder="${t("Choose or enter a name")}"`,
        ) + '<datalist id="projects"></datalist>',
      ) +
      field("Vendor (optional)", input("vendor", e.vendor), true) +
      field(
        "Receipt (optional)",
        input("receipt", "", 'type="file" accept="image/*,application/pdf"'),
        true,
      ) +
      (e.receipt
        ? `<div class="wide"><button type="button" class="text" data-act="receipt">${t("Download")} ` +
          attachName(e.receipt) +
          "</button></div>"
        : ""),
    "Save expense",
  );
  projectOptions();
}
function projectOptions() {
  const f = dlg.querySelector("form");
  f.elements.project.disabled = f.elements.category.value === "Bills";
  const projects = new Set(
    expenses
      .filter((e) => e.property === f.elements.property.value && e.project)
      .map((e) => e.project),
  );
  dlg.querySelector("datalist").innerHTML = options([...projects], "", false);
}
function valueForm(p) {
  formContext = { kind: "value", key: p.id };
  form(
    "Add valuation",
    field(
      "Estimated value (PKR)",
      input(
        "amount",
        "",
        'type="number" min="0" step=".01" max="999999999999" required',
      ),
      true,
    ) +
      field(
        "Valuation date",
        input("date", today(), 'type="date" required'),
        true,
      ) +
      field(
        "Source (optional)",
        input("source", "", `placeholder="${t("e.g. Local agent")}"`),
        true,
      ),
    "Save valuation",
  );
}
function metricDetail(key) {
  if (key === "properties") {
    location.hash = "properties";
    return;
  }
  const titles = {
    value: "Estimated value",
    price: "Purchase cost",
    improvements: "Improvement spending",
  };
  modal(
    titles[key],
    properties
      .map(
        (p) =>
          '<a href="#p/' +
          p.id +
          '" class="line" data-act="close"><span>' +
          esc(p.name) +
          "</span><strong>" +
          full(
            key === "value"
              ? latest(p)?.amount
              : key === "price"
                ? p.price
                : projectSpend(p),
          ) +
          "</strong></a>",
      )
      .join(""),
  );
}
function openPicker() {
  const el = dlg.querySelector("#picker");
  if (!el.hidden) return;
  el.hidden = false;
  el.nextElementSibling.hidden = false;
  el.nextElementSibling.textContent = t("Tap the map to place a pin.");
  picker = baseMap(el);
  const { lat, lng } = dlg.querySelector("form").elements;
  let pin;
  if (lat.value && lng.value) {
    picker.setView([+lat.value, +lng.value], 15);
    pin = marker(picker, +lat.value, +lng.value);
  }
  picker.on("click", ({ latlng }) => {
    lat.value = latlng.lat.toFixed(6);
    lng.value = latlng.lng.toFixed(6);
    pin?.remove();
    pin = marker(picker, lat.value, lng.value);
  });
}
function download(file) {
  if (!file) return;
  const url = URL.createObjectURL(file),
    a = document.createElement("a");
  a.href = url;
  a.download = file.name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
function confirmPortfolioChange(restore) {
  const title = restore ? "Restore default data" : "Delete all data";
  const description = restore
    ? "Replace every property, expense and attachment in this browser with the original sample portfolio?"
    : "Delete every property, expense and attachment in this browser? Your edits cannot be recovered.";
  modal(title, `<p>${t(description)}</p><div class="form-actions">
    ${btn("Cancel", "close")}${btn(title, "confirm-replacement", "", restore ? "primary" : "destructive")}
  </div>`);
  const confirm = dlg.querySelector('[data-act="confirm-replacement"]');
  confirm.onclick = async () => {
    confirm.disabled = true;
    try {
      await replacePortfolio(restore);
      search = type = spendingFilter = "";
      view = "list";
      history.replaceState(null, "", "#overview");
      dlg.close();
      await refresh();
      window.scrollTo(0, 0);
      notify(restore ? "Default data restored" : "All portfolio data deleted");
    } catch {
      confirm.disabled = false;
      notify("Could not save. Please try again.");
    }
  };
}
document.addEventListener("click", (event) => {
  const pref = event.target.closest("[data-language],[data-currency]");
  if (pref) {
    const name = pref.dataset.language ? "language" : "currency";
    setPreference(name, pref.dataset[name]);
    render();
    return;
  }
  const button = event.target.closest("[data-act]");
  if (!button) return;
  const { act, key } = button.dataset,
    p = propertyById(current().slice(2));
  switch (act) {
    case "restore-portfolio":
    case "clear-portfolio":
      confirmPortfolioChange(act === "restore-portfolio");
      break;
    case "view":
      view = key;
      render();
      break;
    case "property":
      propertyForm();
      break;
    case "edit-property":
      propertyForm(p);
      break;
    case "first-property":
      dlg.close();
      propertyForm();
      break;
    case "expense":
      expenseForm(lookupExpense(key), p?.id);
      break;
    case "category":
      spendingFilter = key;
      location.hash = "expenses";
      break;
    case "metric":
      metricDetail(key);
      break;
    case "value":
      valueForm(p);
      break;
    case "close":
      dlg.close();
      break;
    case "pick":
      openPicker();
      break;
    case "receipt":
      download(lookupExpense(formContext.key)?.receipt);
      break;
    case "deed":
      download(p?.deed);
      break;
    case "show-pin":
      modal(
        esc(p.name),
        '<div class="map picker" id="single-map"></div><div class="map-note">' +
          esc(p.lat) +
          ", " +
          esc(p.lng) +
          "</div>",
        false,
      );
      picker = baseMap(dlg.querySelector("#single-map"));
      picker.setView([p.lat, p.lng], 15);
      marker(picker, p.lat, p.lng);
      break;
  }
});
dlg.addEventListener("close", () => {
  picker?.remove();
  picker = null;
});
function refreshList() {
  if (view === "list")
    document.querySelector("#property-body").innerHTML =
      propertyRows(filtered());
  else {
    activeMap?.remove();
    activeMap = portfolioMap(filtered());
  }
  document.querySelector(".count").textContent = filtered().length;
}
document.addEventListener("input", (e) => {
  if (e.target.id === "search") {
    search = e.target.value;
    refreshList();
  }
});
document.addEventListener("change", (e) => {
  if (e.target.id === "type-filter") {
    type = e.target.value;
    refreshList();
  }
  if (e.target.id === "expense-filter") {
    spendingFilter = e.target.value;
    render();
  }
  if (
    dlg.open &&
    formContext?.kind === "expense" &&
    ["category", "property"].includes(e.target.name)
  )
    projectOptions();
});
dlg.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.target,
    save = form.querySelector("[type=submit]");
  if (save.disabled) return;
  const fields = new FormData(form),
    val = (name) => String(fields.get(name) || "").trim(),
    num = (name) => (val(name) === "" ? null : Number(val(name)));
  const { kind, key } = formContext;
  const file = (name) => {
    const f = fields.get(name);
    return f && f.name ? { [name]: f } : {};
  };
  save.disabled = true;
  try {
    if (kind === "property") {
      if (!val("name")) throw Error("Enter a property name.");
      if ((num("lat") == null) !== (num("lng") == null))
        throw Error("Enter both coordinates or leave both blank.");
      await updateRow("properties", key || id(), () => ({
        name: val("name"),
        type: val("type"),
        area: val("area"),
        locality: val("locality"),
        landmark: val("landmark"),
        price: num("price"),
        purchased: val("purchased"),
        lat: num("lat"),
        lng: num("lng"),
        ...file("deed"),
      }));
    } else if (kind === "expense") {
      if (!val("description")) throw Error("Enter an expense description.");
      await updateRow("expenses", key || id(), () => ({
        description: val("description"),
        property: val("property"),
        project: val("category") === "Bills" ? "" : val("project"),
        category: val("category"),
        amount: num("amount"),
        date: val("date"),
        vendor: val("vendor"),
        ...file("receipt"),
      }));
    } else {
      await updateRow("properties", key, (p) => ({
        values: [
          {
            id: id(),
            date: val("date"),
            amount: num("amount"),
            source: val("source"),
          },
          ...(p.values || []),
        ],
      }));
    }
    dlg.close();
    await refresh();
    notify(
      kind === "value"
        ? "Valuation saved"
        : kind === "property"
          ? "Property saved"
          : "Expense saved",
    );
  } catch (err) {
    form.querySelector(".form-error").textContent =
      err?.name === "QuotaExceededError"
        ? t("Browser storage is full. Try a smaller attachment.")
        : t(err.message || "Could not save. Please try again.");
    save.disabled = false;
  }
});
window.addEventListener("hashchange", () => {
  if (dlg.open) dlg.close();
  render();
  window.scrollTo(0, 0);
});
// A restored browser history entry must re-check its session after sign-out.
window.addEventListener("pageshow", event => { if(event.persisted) location.reload(); });
const initialLanguage = new URL(location.href).searchParams.get("lang");
if (initialLanguage === "en" || initialLanguage === "ps") {
  setPreference("language", initialLanguage);
  const clean = new URL(location.href);
  clean.searchParams.delete("lang");
  history.replaceState(null, "", clean);
}
window.addEventListener("register-blocked", () => {
  main.textContent = t("Close other Raza Khan Farms tabs to finish updating this browser.");
});
try {
  await openRegister();
  await refresh();
} catch {
  main.innerHTML =
    heading("Browser storage unavailable") +
    `<p>${t("Allow local site storage and reload to open the sample portfolio.")}</p>`;
}
