export const categories = {
  Solar: { color: "#31684e", icon: "sun" },
  Irrigation: { color: "#8bab78", icon: "water" },
  Renovation: { color: "#d4aa5a", icon: "tool" },
  "Other improvements": { color: "#7997ae", icon: "land" },
  Bills: { color: "#aa806b", icon: "bill" },
};
export const photos = {
  fields: "assets/fields.jpg",
  rice: "assets/rice.jpg",
  valley: "assets/valley.jpg",
};
const properties = [
  [
    "orchard",
    "Aboha Orchard",
    "Agricultural",
    "Aboha",
    "18 kanal",
    12500000,
    16200000,
    "fields",
    34.665,
    72.184,
  ],
  [
    "riverside",
    "Riverside Fields",
    "Agricultural",
    "Aboha",
    "24 kanal",
    9600000,
    13400000,
    "rice",
    34.671,
    72.191,
  ],
  [
    "market",
    "Barikot Market Plot",
    "Commercial",
    "Barikot",
    "3 kanal",
    8400000,
    10600000,
    "valley",
    34.678,
    72.219,
  ],
].map(([id, name, type, locality, area, price, value, photo, lat, lng]) => ({
  id,
  name,
  type,
  locality,
  area,
  price,
  photo,
  lat,
  lng,
  values: [
    {
      id: "first",
      date: "2026-11-01",
      amount: value,
      source: "Sample estimate",
    },
  ],
}));
const expenses = [
  [
    "panels",
    "orchard",
    "Solar panel installation",
    "Solar",
    "Solar pump system",
    480000,
    "2026-11-14",
  ],
  [
    "pipes",
    "riverside",
    "Irrigation pipes",
    "Irrigation",
    "Field irrigation",
    150000,
    "2026-11-10",
  ],
  [
    "wall",
    "market",
    "Boundary wall repair",
    "Renovation",
    "Boundary wall",
    180000,
    "2026-11-05",
  ],
  [
    "pump",
    "riverside",
    "Tube well pump",
    "Irrigation",
    "Field irrigation",
    120000,
    "2026-10-29",
  ],
  ["bill", "orchard", "Electricity bill", "Bills", "", 18000, "2026-10-26"],
].map(([id, property, description, category, project, amount, date]) => ({
  id,
  property,
  description,
  category,
  project,
  amount,
  date,
}));
let db;
export async function openRegister() {
  db = await new Promise((resolve, reject) => {
    const req = indexedDB.open("aboha-register-preview", 1);
    req.onupgradeneeded = () => {
      for (const [name, rows] of Object.entries({ properties, expenses })) {
        const store = req.result.createObjectStore(name, { keyPath: "id" });
        rows.forEach((row) => store.add(row));
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  // Seed this location for existing browsers as well as first-time visitors.
  await new Promise((resolve, reject) => {
    const tx = db.transaction("properties", "readwrite"),
      store = tx.objectStore("properties");
    const req = store.getAll();
    req.onsuccess = () => {
      if (
        !req.result.some(
          (p) =>
            p.id === "markidam" ||
            (p.name.trim().toLowerCase() === "markidam" &&
              p.locality?.toLowerCase().includes("aboha")),
        )
      ) {
        store.add({
          id: "markidam",
          name: "Markidam",
          locality: "Aboha",
          values: [],
        });
      }
    };
    tx.oncomplete = resolve;
    tx.onabort = () => reject(tx.error);
  });
}
export function readRows(store) {
  return new Promise((resolve, reject) => {
    const req = db.transaction(store).objectStore(store).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
export function updateRow(store, id, change) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readwrite"),
      table = tx.objectStore(store),
      req = table.get(id);
    req.onsuccess = () =>
      table.put({ ...req.result, ...change(req.result), id });
    tx.oncomplete = resolve;
    tx.onabort = () => reject(tx.error);
    tx.onerror = () => reject(tx.error);
  });
}
