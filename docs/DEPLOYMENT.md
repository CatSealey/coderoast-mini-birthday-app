# Deploying the birthday adventure

This guide uses Cloudflare Pages and the GitHub repository
`CatSealey/coderoast-mini-birthday-app`. The app is a static Vite site: it
does not need a dedicated server or database. A Git-connected Pages project
builds the site and publishes `dist/` when its production branch is updated.

## Before you deploy

- Confirm that the version you want to publish, including the files in
  `public/music/`, has been committed and pushed to the GitHub branch you
  intend to deploy.
- Have access to your Cloudflare account, GitHub repository and the DNS
  provider for `code-roast.com`.
- Decide whether to use a subdomain such as `birthday.code-roast.com` or the
  root domain `code-roast.com`. The subdomain is less likely to affect an
  existing website.
- Confirm you have the rights needed to publish or distribute the music.
  Recordings in the deployed site can be downloaded by visitors. A private
  GitHub repository does not make the deployed site private.
- Decide whether the game needs real access protection. The in-game password
  is only a casual client-side gate, not authentication. It is embedded in the
  downloaded JavaScript and can be found or bypassed. Never reuse a sensitive
  password. See [Privacy and access](#privacy-and-access) before publishing
  personal content.

## 1. Connect the repository

1. Sign in to the [Cloudflare dashboard](https://dash.cloudflare.com/) and
   open **Workers & Pages**.
2. Select **Create application → Pages → Connect to Git**, connect GitHub and
   authorize access to the repository.
3. Select `CatSealey/coderoast-mini-birthday-app` and configure the project:

   | Setting | Value |
   | --- | --- |
   | Production branch | `main` |
   | Root directory | Repository root |
   | Build command | `npm run build` |
   | Build output directory | `dist` |
   | Node.js | 22 |

4. Set the build environment variable `NODE_VERSION` to `22`. Also add
   `VITE_APP_PASSWORD` with a password chosen for this game. Set the password
   in the dashboard, not in the repository or a chat message.
5. Select **Save and Deploy**. If the dashboard requires you to create the
   project before adding variables, add them under **Settings → Environment
   variables** for the production environment and then redeploy.

The password is evaluated at **build time**. Changing the variable requires a
new build and deployment. The local `.env.local` file is Git-ignored and is
not automatically available to Cloudflare. If `VITE_APP_PASSWORD` is missing,
the login button is disabled. Preview deployments have separate environment
settings; configure them deliberately if you use previews.

Cloudflare provides a `*.pages.dev` address after deployment. Check the build
logs if deployment fails. The normal Vite large-chunk warning is not itself a
build failure; the build must still complete successfully.

## 2. Connect `code-roast.com`

### Recommended: a subdomain

These steps use `birthday.code-roast.com` as an example:

1. In the Pages project, open **Custom domains → Set up a domain** and add
   `birthday.code-roast.com`.
2. Follow Cloudflare's instructions to create the DNS record. If DNS is
   managed elsewhere, add the CNAME at that provider:

   | Type | Host/name | Target |
   | --- | --- | --- |
   | CNAME | `birthday` | Your project's exact `*.pages.dev` hostname |

   DNS providers differ: some expect `birthday`, others the full hostname.
   Use the value shown by Cloudflare and avoid a conflicting existing record.
3. Wait until Cloudflare reports the domain and HTTPS certificate are active,
   then visit `https://birthday.code-roast.com`.

Adding the CNAME alone is not enough: associate the hostname with the Pages
project in Cloudflare first. If Cloudflare already manages the domain's DNS,
the dashboard can create the record for you.

### Alternative: the root domain

For `code-roast.com` itself, Cloudflare Pages requires the domain to be a
Cloudflare zone and its nameservers to point to Cloudflare. Before changing
nameservers, check and preserve all existing DNS records, including records
used by any website, email or other services. Nameserver changes can interrupt
those services if the records are not configured correctly.

See Cloudflare's [custom domain guide](https://developers.cloudflare.com/pages/configuration/custom-domains/)
for current instructions.

## 3. Verify the deployed game

Test on a PC and, if wanted, a phone:

- The site uses HTTPS, the login is enabled, and the chosen game password works.
- The home song starts after entering the game. The Settings and action-bar
  music controls mute and resume it; the displayed track changes by area.
- The world, minimap, keyboard and touch controls work. Visit quest interiors
  and check that interactions and music work.
- Make a little progress, reload the page and confirm that it is restored.
- Check the browser console and Pages build logs if an asset or feature fails.

Progress is stored locally in the browser, not in an account. Each browser,
device and origin has separate storage. For example, progress on `pages.dev`
does not automatically appear on `birthday.code-roast.com`, and PC and phone
saves do not sync. Clearing site data or using a private browsing session can
remove progress. See [Project guide: saves](PROJECT.md#saves-and-progress).

## Privacy and access

- The client-side game password does not protect the game's assets, music or
  personal content. Marking the build variable as a secret in the hosting
  dashboard does not stop Vite from embedding it in the public build.
- For actual access control, use a service such as
  [Cloudflare Access](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/self-hosted-public-app/)
  and configure policies for every address that can serve the site. Verify
  that the custom domain, production `*.pages.dev` address and any preview
  URLs cannot bypass the intended protection. Preview deployments are public
  by default; their access controls are separate.
- Only publish files that you are allowed to distribute. Access protection
  does not replace the required music permissions.

## Updates and troubleshooting

- **Publish an update:** commit and push changes to the production branch.
  Pages builds and deploys that revision automatically. Confirm that the new
  deployment succeeded before sharing it.
- **Roll back:** in the Pages project's deployments list, find an earlier
  successful production deployment and choose **Rollback** from its actions.
  This republishes that build; it does not revert the Git branch, so address
  the underlying change before the next deployment.
- **Login disabled:** check the production `VITE_APP_PASSWORD` variable and
  redeploy after setting or changing it.
- **Music unavailable:** confirm the six MP3s are committed, use the exact
  names listed in the [soundtrack table](ASSET-CREDITS.md#soundtrack), and are in
  the deployed build. Check Settings and the browser console for errors.
- **Domain does not work:** check that it was added in Pages, the CNAME points
  to the correct Pages hostname, and DNS and certificate activation have
  completed. DNS changes may take time.
- **Save seems missing:** check the browser, device and exact site address
  before resetting anything. A new hostname has separate local storage.

Cloudflare's [Git integration guide](https://developers.cloudflare.com/pages/get-started/git-integration/),
[build configuration](https://developers.cloudflare.com/pages/configuration/build-configuration/)
and [Pages limits](https://developers.cloudflare.com/pages/platform/limits/)
are the authoritative references for dashboard changes and current limits.
The Free plan currently limits each static asset to 25 MiB; the supplied MP3s
are individually below that limit.
