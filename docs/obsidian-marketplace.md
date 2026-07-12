# Obsidian Marketplace Publishing

## Prerequisites

- Manifest version must match the git tag you create
- Description: 250 chars max, ends with a period, no emoji, sentence case
- `minAppVersion` should be the latest stable Obsidian build (currently 1.4.0 or later)
- Remove `fundingUrl` from manifest if you don't accept donations
- If using Node/Electron APIs, set `isDesktopOnly: true`

## Submitting your plugin for the first time

### 1. Add a release workflow

Create `.github/workflows/release.yml`:

```yaml
name: Release Obsidian plugin

on:
  push:
    tags:
      - "*"

jobs:
  build:
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - uses: actions/checkout@v3

      - name: Use Node.js
        uses: actions/setup-node@v3
        with:
          node-version: "18.x"

      - name: Build plugin
        run: |
          npm install
          npm run build

      - name: Create release
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          tag="${GITHUB_REF#refs/tags/}"
          gh release create "$tag" \
            --title="$tag" \
            --draft \
            main.js manifest.json styles.css
```

Commit and push:

```bash
git add .github/workflows/release.yml
git commit -m "Add release workflow"
git push origin main
```

### 2. Enable Actions

Go to your repo Settings → Actions → General → Workflow permissions, select **"Read and write permissions"**.

### 3. Tag a release

The tag must match `manifest.json` version:

```bash
git tag -a v1.0.0 -m "v1.0.0"
git push origin v1.0.0
```

### 4. Publish the GitHub release

Go to your repo's **Actions** tab, wait for the workflow to finish, then go to **Releases**. You'll see a draft — add release notes and publish it.

### 5. Submit for marketplace review

Go to https://docs.obsidian.md/Plugins/Releasing/Submit+your+plugin and follow the submission form. You'll need:
- Plugin name, ID, description
- Link to your GitHub repo (or the published release)
- `manifest.json`, `main.js`, `styles.css`

Once accepted, your plugin will appear in the official Obsidian marketplace.

## Updating an existing plugin

1. Bump the version in `manifest.json`.
2. Tag and push:

   ```bash
   git tag -a v1.0.1 -m "v1.0.1"
   git push origin v1.0.1
   ```

3. Create the draft release on GitHub, add notes, and publish it.
4. Submit an update via the marketplace submission form at https://docs.obsidian.md/Plugins/Releasing/Submit+your+plugin.
