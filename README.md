# RuneScape 3 Birthday Adventure

A responsive, RuneScape-inspired birthday game with a walkable world, quests
based on shared memories and a few surprises. Play on a PC or a phone.

## Quickstart

You need Node.js 20.19+ or 22.12+ and npm. From the project folder:

```sh
npm ci
```

If `.env.local` does not already exist, copy `.env.example` to `.env.local`.
Edit `.env.local` and set `VITE_APP_PASSWORD` to a password for the game, then
start the development server:

```sh
npm run dev
```

Open the address printed in the terminal, enter a character name and your
game password, and start playing. Restart the server after changing the
password.

**Privacy:** The password is a client-side gate, not real authentication. It
is included in the site and can be found or bypassed. Don't reuse a sensitive
password or rely on it to protect private content.

## Documentation

- [Player guide](docs/PLAYER-GUIDE.md) — controls and getting started, without
  story spoilers.
- [Project guide](docs/PROJECT.md) — architecture, saves, development and tests.
- [Quest reference](docs/QUESTS.md) — detailed gameplay notes and spoilers.
- [Deployment guide](docs/DEPLOYMENT.md) — Cloudflare Pages, domain setup and
  privacy.
- [Release checklist](docs/RELEASE-CHECKLIST.md) — checks before sharing.
- [Asset credits and permissions](docs/ASSET-CREDITS.md) — soundtrack and asset
  sources to verify before publishing.

## Checks

```sh
npm test
npm run lint
npm run build
npm run preview
```

The production build is written to `dist/`. Progress is stored in the browser,
not synced between devices or site addresses. See the [project guide](docs/PROJECT.md)
for details.
