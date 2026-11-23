import { loginPage } from "./login.mjs";

const cookie = "__Host-rkf_session";
const lifetime = 8 * 60 * 60;
const encoder = new TextEncoder();
const publicFiles = new Set([
  "/signin.css",
  "/assets/mark.svg",
  "/assets/rice.jpg",
  "/assets/photo-credits",
  "/assets/photo-credits.html",
]);
const hex = (bytes) =>
  Array.from(new Uint8Array(bytes), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
const fromHex = (value) =>
  Uint8Array.from(value.match(/../g), (pair) => parseInt(pair, 16));

function response(body, status, headers = {}) {
  return new Response(body, {
    status,
    headers: {
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "Referrer-Policy": "same-origin",
      "X-Robots-Tag": "noindex, noarchive",
      ...headers,
    },
  });
}
function login(language, demoEnabled, status = 200, message = "", signedOut = false) {
  return response(loginPage(language, message, demoEnabled, signedOut), status, {
    "Content-Type": "text/html; charset=utf-8",
    "Content-Security-Policy":
      "default-src 'none'; style-src 'self'; img-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
    ...(status === 429 ? { "Retry-After": "60" } : {}),
  });
}
function redirect(path, session, maxAge) {
  const headers = { Location: path };
  if (session !== undefined)
    headers["Set-Cookie"] =
      cookie +
      "=" +
      session +
      "; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=" +
      maxAge;
  return response(null, 303, headers);
}
function configuration(env) {
  try {
    const config = JSON.parse(env.FAMILY_AUTH);
    if (
      !/^[0-9a-f]{64}$/.test(config.key) ||
      !Array.isArray(config.users) ||
      config.users.length > 4
    )
      return null;
    if (
      !config.users.every(
        (u) =>
          /^[a-z0-9_-]{1,32}$/.test(u.name) &&
          /^[0-9a-f]{32}$/.test(u.salt) &&
          /^[0-9a-f]{64}$/.test(u.hash),
      )
    )
      return null;
    return config;
  } catch {
    return null;
  }
}
async function signingKey(config) {
  return crypto.subtle.importKey(
    "raw",
    fromHex(config.key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}
async function createSession(config, user) {
  const expires = Math.floor(Date.now() / 1000) + lifetime;
  const payload = [user.name, user.salt, expires, crypto.randomUUID()].join(
    ".",
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    await signingKey(config),
    encoder.encode(payload),
  );
  return payload + "." + hex(sig);
}
async function signedIn(request, config) {
  if (!config) return false;
  const value = (request.headers.get("Cookie") || "")
    .split(/;\s*/)
    .find((part) => part.startsWith(cookie + "="))
    ?.slice(cookie.length + 1);
  if (!value || value.length > 220) return false;
  const parts = value.split(".");
  if (parts.length !== 5) return false;
  const [name, salt, expires, , sig] = parts;
  if (
    !/^\d{10}$/.test(expires) ||
    Number(expires) <= Date.now() / 1000 ||
    !/^[0-9a-f]{64}$/.test(sig)
  )
    return false;
  if (!config.users.some((u) => u.name === name && u.salt === salt))
    return false;
  return crypto.subtle.verify(
    "HMAC",
    await signingKey(config),
    fromHex(sig),
    encoder.encode(parts.slice(0, 4).join(".")),
  );
}
async function checkPassword(password, user) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  // Do the same derivation for unknown accounts.
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: encoder.encode(user?.salt || "0".repeat(32)),
      hash: "SHA-256",
      iterations: 100000,
    },
    key,
    256,
  );
  const expected = fromHex(user?.hash || "0".repeat(64));
  return crypto.subtle.timingSafeEqual(bits, expected) && Boolean(user);
}
async function signIn(request, env, config, language, demoEnabled) {
  if (!config || !env.LOGIN_LIMIT)
    return login(language, demoEnabled, 503, "setup");
  const { success } = await env.LOGIN_LIMIT.limit({
    key: request.headers.get("CF-Connecting-IP") || "local",
  });
  if (!success) return login(language, demoEnabled, 429, "limit");
  if (
    !request.headers
      .get("Content-Type")
      ?.startsWith("application/x-www-form-urlencoded")
  )
    return response(null, 415);
  if (Number(request.headers.get("Content-Length")) > 4096)
    return response(null, 413);
  const reader = request.body?.getReader();
  if (!reader) return login(language, demoEnabled, 401, "error");
  let chunks = [],
    length = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.length;
    if (length > 4096) {
      await reader.cancel();
      return response(null, 413);
    }
    chunks.push(value);
  }
  const fields = new URLSearchParams(await new Blob(chunks).text());
  const name = (fields.get("username") || "").trim().toLowerCase();
  const user = config.users.find((item) => item.name === name);
  const password = fields.get("password") || "";
  if (
    !password ||
    password.length > 128 ||
    !(await checkPassword(password, user))
  )
    return login(language, demoEnabled, 401, "error");
  return redirect(
    "/?lang=" + language,
    await createSession(config, user),
    lifetime,
  );
}
export default {
  async fetch(request, env) {
    const url = new URL(request.url),
      path = url.pathname;
    const language = url.searchParams.get("lang") === "ps" ? "ps" : "en";
    const config = configuration(env);
    const demoEnabled =
      env.LOCAL_DEMO === "true" &&
      ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) &&
      Boolean(config?.users.length);
    if (request.method === "POST") {
      if (request.headers.get("Origin") !== url.origin)
        return response(null, 403);
      if (path === "/logout") return redirect("/signed-out?lang=" + language, "", 0);
      if (path === "/demo") {
        if (!demoEnabled) return response(null, 404);
        return redirect(
          "/?lang=" + language,
          await createSession(config, config.users[0]),
          lifetime,
        );
      }
      if (path === "/login")
        return signIn(request, env, config, language, demoEnabled);
      return response(null, 405);
    }
    if (!["GET", "HEAD"].includes(request.method)) return response(null, 405);
    if (publicFiles.has(path)) return env.ASSETS.fetch(request);
    const authorized = await signedIn(request, config);
    if (path === "/signed-out")
      return authorized ? redirect("/") : login(language, false, 200, "", true);
    if (path === "/login")
      return authorized
        ? redirect("/")
        : login(
            language,
            demoEnabled,
            config ? 200 : 503,
            config ? "" : "setup",
          );
    if (!authorized) {
      if (path === "/" || request.headers.get("Sec-Fetch-Mode") === "navigate")
        return redirect("/login?lang=" + language);
      return response(null, 401);
    }
    const asset = await env.ASSETS.fetch(request);
    const headers = new Headers(asset.headers);
    headers.set("Cache-Control", "private, no-store");
    headers.set("X-Robots-Tag", "noindex, noarchive");
    headers.set("X-Frame-Options", "DENY");
    headers.set("X-Content-Type-Options", "nosniff");
    return new Response(asset.body, { status: asset.status, headers });
  },
};
