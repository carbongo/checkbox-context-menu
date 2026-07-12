# Obsidian Marketplace Publishing

## Prerequisites

Manifest version must match the git tag you create.

```json
{
  "version": "1.0.0"
}
```

## First release

1. **Tag and push** — the tag must match `manifest.json` version:

   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```

2. **Submit for marketplace review** — go to the Obsidian forum "New Plugin Submissions" category at https://forum.obsidian.md/t/the-obsidian-plugin-marketplace/559176 and create a post with:

   - Plugin name, ID, description
   - Link to your GitHub repo
   - Attach `manifest.json`, `main.js`, `styles.css`

3. The Obsidian team will review and add it to the official marketplace.

## Subsequent releases

1. Bump the version in `manifest.json`.
2. Tag and push:

   ```bash
   git tag v1.0.1
   git push origin v1.0.1
   ```

3. Submit another forum post to request a marketplace update.
