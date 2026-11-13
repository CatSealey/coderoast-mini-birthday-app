# Release checklist

Use this before sharing a new version. The
[deployment guide](DEPLOYMENT.md) has the setup and troubleshooting steps.
The [quest reference](QUESTS.md) contains spoilers if you need detailed
expected outcomes.

## Prepare

- [ ] Confirm the intended changes and required assets are committed and
  pushed to the branch being deployed.
- [ ] Review the [asset credits and permissions](ASSET-CREDITS.md); confirm
  the rights needed for the planned distribution before publishing.
- [ ] Confirm the site does not contain content you are unwilling to share.
  The in-game password is not real access control.
- [ ] Use a separate browser profile or other isolated browser storage for
  destructive tests. Do not restart or remove quests from the player's save.

## Automated checks

- [ ] Run `npm test`.
- [ ] Run `npm run lint`.
- [ ] Run `npm run build` with the intended build-time password configured.
  A successful build writes the site to `dist/`.
- [ ] Run `npm run preview` and check the production build.

## Play through

- [ ] On a PC, enter the game and check keyboard movement, clicking to walk,
  the map, interaction buttons, journal scrolling and inventory.
- [ ] On a phone, check the layout, touch movement, interactions and journal.
- [ ] Visit each of the five main quests. Check entry, controls, interactions,
  completion and the awarded keepsake; check an optional Cat side quest.
- [ ] Leave an unfinished quest, reload and return to it. Confirm progress
  persists, and test quest removal and restart only in isolated storage.
- [ ] Complete the trophy-room finale and check the ending and saved ticket.
- [ ] Check music starts on entry, changes with the area, shows the track
  title, and can be muted and re-enabled from both controls.
- [ ] Where practical, test the illustrated fallback as well as WebGL,
  particularly after changes to scenery or interactions.

## After deploying

- [ ] Confirm the Pages build succeeded and the intended revision is live.
- [ ] Check the actual custom domain and HTTPS once configured; test login,
  music, an interaction and save/reload on the deployed site.
- [ ] If privacy is required, verify that access controls cover the custom
  domain, production `pages.dev` address and preview URLs, without a bypass.
- [ ] Remember that progress on `pages.dev` and the custom domain is separate.
  Test with isolated storage and do not clear a player's existing save.
