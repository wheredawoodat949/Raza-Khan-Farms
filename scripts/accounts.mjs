// Run from the project root. Only generated passwords are supported in this draft.
import { randomBytes, pbkdf2Sync } from "node:crypto";
import { existsSync, readFileSync, writeFileSync, renameSync } from "node:fs";

const [environment, action, rawName = ""] = process.argv.slice(2);
const name = rawName.trim().toLowerCase();
if (
  !["local", "production"].includes(environment) ||
  !["add", "reset", "remove"].includes(action) ||
  !/^[a-z0-9][a-z0-9_-]{0,31}$/.test(name)
) {
  console.error(
    "Usage: node scripts/accounts.mjs <local|production> <add|reset|remove> <username>",
  );
  process.exit(1);
}
const file = ".family-auth." + environment + ".json";
const config = existsSync(file)
  ? JSON.parse(readFileSync(file, "utf8"))
  : { key: randomBytes(32).toString("hex"), users: [] };
const index = config.users.findIndex((user) => user.name === name);
if (action === "add" && (index >= 0 || config.users.length >= 4)) {
  throw new Error(
    "Username already exists or the four-account limit has been reached.",
  );
}
if (action !== "add" && index < 0) throw new Error("Unknown username.");
let password;
if (action === "remove") config.users.splice(index, 1);
else {
  password = randomBytes(15).toString("base64url");
  const salt = randomBytes(16).toString("hex");
  const hash = pbkdf2Sync(password, salt, 100000, 32, "sha256").toString("hex");
  const entry = { name, salt, hash };
  if (index >= 0) config.users[index] = entry;
  else config.users.push(entry);
}
function save(path, data) {
  const temp = path + "." + randomBytes(6).toString("hex") + ".tmp";
  writeFileSync(temp, data, { mode: 0o600, flag: "wx" });
  renameSync(temp, path);
}
const json = JSON.stringify(config);
save(file, json);
if (environment === "local")
  save(".dev.vars", "FAMILY_AUTH='" + json + "'\n");
console.log(
  password
    ? environment + " login: " + name + " / " + password
    : name + " removed",
);
if (environment === "production")
  console.log(
    "To activate these accounts, run: npx wrangler secret put FAMILY_AUTH < .family-auth.production.json",
  );
