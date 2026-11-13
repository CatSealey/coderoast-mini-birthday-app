# Deploying the birthday adventure

The game is a static Vite site. This guide uses GitHub Pages and the
`CatSealey/coderoast-mini-birthday-app` repository to publish it at the
planned address `gaylinor.code-roast.com`. The repository's
[deployment workflow](../.github/workflows/deploy.yml) builds `dist/` and
deploys it when changes are pushed to `main` or the workflow is run manually.

## Before you deploy

- Check your GitHub plan and repository visibility. GitHub Free requires a
  **public repository** for Pages; some paid plans support Pages from a private
  repository. Do not make the repository public without first reviewing its
  contents. GitHub Pages sites are normally **public even if the repository is
  private**.
- Confirm you have the rights needed to publish or distribute the music.
  Anyone who can access the site can download its recordings. See the
  [asset inventory](ASSET-CREDITS.md).
- The in-game password is a client-side gate, not real authentication. It is
  embedded in the site and can be found or bypassed. Don't reuse a sensitive
  password or publish content that requires privacy.
- Have access to the repository settings and to the DNS provider for
  `code-roast.com`. Using a subdomain avoids replacing an existing site at
  the root domain.
- Commit and push the workflow and the version you want to publish, including
  the required files in `public/music/`. **Once Pages and the secret are set
  up, pushes to `main` automatically deploy.**

## 1. Configure GitHub Pages

1. In the repository on GitHub, open **Settings → Secrets and variables →
   Actions**. Under **Repository secrets**, add `VITE_APP_PASSWORD` with a
   password chosen for this game. Do not put its value in the repository or
   a chat message.
2. Open **Settings → Pages**. Under **Build and deployment → Source**, select
   **GitHub Actions**.
3. Push the workflow to `main`, or open **Actions → Deploy to GitHub Pages**
   and select **Run workflow** on `main` once the workflow is present.
4. Open the workflow run in **Actions** to check its progress. The workflow
   uses Node.js 22, runs `npm ci`, builds with `npm run build -- --base=./`,
   uploads `dist/` and deploys it to Pages.

The build deliberately fails if the repository secret is missing. The
password is read at **build time**, not when a visitor opens the site. After
changing the secret, run the workflow again or push another change. The local
`.env.local` file is Git-ignored and is not available to the workflow.
Although GitHub stores the value as a secret, Vite embeds it in the public
site, so it must not be a sensitive password.

The relative Vite base allows the same build to load its assets at the
custom-domain root and under the default project URL,
`https://catsealey.github.io/coderoast-mini-birthday-app/`. Until the custom
domain is configured, use the URL shown in **Settings → Pages**; GitHub may
redirect the default URL after the domain is configured.

## 2. Connect `gaylinor.code-roast.com`

These instructions use GoDaddy for DNS. Owning the domain through GoDaddy
doesn't necessarily mean GoDaddy manages its DNS: check the domain's
nameservers in GoDaddy first. If they point to another DNS provider, add the
records at that provider instead. Don't change nameservers just for this
subdomain; doing so could affect an existing website or email.

### A. Verify ownership with GitHub

GitHub recommends verifying the domain first to help prevent domain
takeovers. This is separate from adding the custom domain to the repository.

1. On GitHub, open your **profile picture → Settings → Pages**. This is your
   account settings page, not the repository's settings.
2. Select **Add a domain**, enter `code-roast.com`, and follow the prompts.
   GitHub will show a TXT record name and a verification value.
3. Sign in to your GoDaddy **Domain Portfolio**, select `code-roast.com`, and
   select **DNS**. Choose **Add New Record** and select **TXT**.
4. Enter the record name and value supplied by GitHub. GoDaddy's **Name**
   field takes the part before `.code-roast.com`; its **Value** field takes
   GitHub's verification value. Leave **TTL** at its default and select
   **Save**.
5. Return to GitHub and select **Verify**. If it isn't ready, wait and retry;
   if you leave the page, use **Continue verifying** from the account's Pages
   settings. Keep the TXT record after verification.

See GitHub's [domain verification instructions](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/verifying-your-custom-domain-for-github-pages)
and GoDaddy's [TXT record guide](https://www.godaddy.com/help/add-a-txt-record-19232)
if the screens have changed.

### B. Add the custom domain to the repository

In the game repository on GitHub, open **Settings → Pages**. Under **Custom
domain**, enter `gaylinor.code-roast.com` and select **Save**.

Add it in GitHub **before** pointing the CNAME at GitHub Pages; otherwise
someone else could potentially claim the subdomain.

### C. Add the CNAME in GoDaddy

1. In GoDaddy's **Domain Portfolio**, select `code-roast.com` and open
   **DNS**.
2. Choose **Add New Record** and select **CNAME** as the type.
3. Enter:

   | GoDaddy field | Value |
   | --- | --- |
   | Name | `gaylinor` |
   | Value | `catsealey.github.io` |
   | TTL | Default (usually 1 hour) |

4. Select **Save**. GoDaddy may ask for an identity verification code.

Enter only `gaylinor` in the Name field: GoDaddy adds `.code-roast.com`.
The Value is the account's GitHub Pages hostname, **without** the repository
name or `https://`. If a record already uses `gaylinor`, investigate the
conflict before changing it. Don't use a wildcard record or alter unrelated
website and email records.

GoDaddy says DNS changes usually take effect within an hour but can take up to
48 hours globally. See its [CNAME record guide](https://www.godaddy.com/help/add-a-cname-record-19236)
for current interface details.

### D. Enable HTTPS

When GitHub's DNS check and certificate are ready, return to the repository's
**Settings → Pages** and enable **Enforce HTTPS**. Then visit
`https://gaylinor.code-roast.com`. The HTTPS option may not be available
immediately while DNS and the certificate are being set up.

See GitHub's [custom domain instructions](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site)
and [HTTPS guide](https://docs.github.com/en/pages/getting-started-with-github-pages/securing-your-github-pages-site-with-https)
for current details.

## 3. Verify the deployed game

Test on a PC and, if wanted, a phone:

- The site uses HTTPS, the login is enabled, and the chosen game password works.
- Music starts after entering. Both music controls work, and the displayed
  track changes by area.
- The world, minimap, keyboard and touch controls work. Visit quest interiors
  and check interactions and music.
- Make a little progress in isolated browser storage, reload and confirm it is
  restored. See the [release checklist](RELEASE-CHECKLIST.md) for a fuller
  playthrough.

Progress is stored locally in the browser, not in an account. Each browser,
device and origin has separate storage. Progress made at the default GitHub
Pages address does not automatically transfer to `gaylinor.code-roast.com`,
and PC and phone saves do not sync. Clearing site data or using a private
browsing session can remove progress. See [saves](PROJECT.md#saves-and-progress).

## Privacy and access

- GitHub Pages normally publishes the site publicly, including when its
  source repository is private. GitHub's private Pages option requires an
  eligible Enterprise Cloud organization; it is not the ordinary Pages setup.
- The game password and downloaded assets are accessible to visitors.
  Storing the password as an Actions secret does not make the built value
  private. A private repository does not protect the published music.
- If real access control is required, use a hosting and protection arrangement
  that covers **every** address serving the site. Protecting only the custom
  hostname is not enough if another Pages URL remains accessible. Verify this
  before publishing personal content.

## Updates and troubleshooting

- **Publish an update:** commit and push to `main`. Check the Actions run and
  the live site. You can also manually run the deployment workflow.
- **Restore an earlier version:** revert the unwanted change on `main` and
  let the workflow deploy the resulting revision, or manually rerun an
  appropriate earlier workflow run if available. Check the live result.
- **Build fails:** check the Actions logs, especially that
  `VITE_APP_PASSWORD` is configured as a repository secret. Then rerun the
  workflow.
- **Music unavailable:** check that the six MP3s are committed and named as
  in the [soundtrack table](ASSET-CREDITS.md#soundtrack). Check Settings and
  the browser console for errors.
- **Domain does not work:** check the GitHub Pages custom domain, the CNAME,
  DNS propagation and certificate status.
- **Save seems missing:** check the browser, device and exact site address
  before resetting anything. A new hostname has separate local storage.

See GitHub's [Pages setup guide](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site),
[publishing source guide](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)
and [Pages limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits)
for current requirements and limits.
