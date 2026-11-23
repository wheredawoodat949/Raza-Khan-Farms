# Raza Khan Farms

The Cloudflare Worker serves a family sign-in page before the existing land register. Up to four named accounts can view the same starter portfolio. Each browser still stores its own edits and attachments in IndexedDB. Anyone sharing that browser profile also shares its saved records.

## Try it locally

From the repository root, install dependencies with `npm ci`. Run `node scripts/accounts.mjs local add gauhar` once to generate a local password, then `npm run dev`. Open http://localhost:4174 and choose **Try demo** for one-click access to the sample dashboard. For an existing account, use `reset` in place of `add` to generate a replacement. Use `remove` to disable an account. The account tool prints a generated password once.

## Prepare family accounts for the hosted version

1. From this directory, run `node scripts/accounts.mjs production add gauhar`. Repeat with another username for each person who needs access, up to four. Save each generated password privately. Production credentials are separate from local credentials.
2. Run `npx wrangler login` if necessary. Set the secret on the existing **raza-khan-farms** Worker with `npx wrangler secret put FAMILY_AUTH < .family-auth.production.json`. After future account changes, upload the updated secret the same way. Keep this ignored configuration file in a private backup.
3. Use the repository root for Cloudflare Workers Builds, with `npx wrangler deploy` as the deploy command. The root `wrangler.jsonc` runs the sign-in check before serving the files in `aboha-register/`. A static-only upload of that folder cannot enforce this sign-in.
4. When ready, commit the project changes and push to the connected branch. In a signed-out private window, check the custom domain and Worker URL. Both the homepage and a direct visit to `/data.js` should request sign-in. Sign in, open Markidam, sign out, and check again. Review any older preview deployments separately because they can still contain the original sample files.

The server keeps only password hashes and a signing key in its configuration. Sessions expire after eight hours. Password reset or account removal invalidates that user's existing sessions when the new configuration takes effect. Without a production secret, private pages and assets stay closed. The public Try demo button opens /demo/ with bundled samples and separate browser storage. Demo access never creates a family session.
