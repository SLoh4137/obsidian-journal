# Journal

An opinionated journaling plugin for Obsidian that follows [Journey](https://journey.cloud/)'s approach to journaling: one note per day, with date, location, photos, and a few lines of text per entry.

The plugin adds three custom [Bases](https://help.obsidian.md/bases) views (Entries, Calendar, Memories), commands for stamping the entry's coordinates from device GPS or from an [Immich](https://immich.app) image, and integrates with the [Obsidian Immich Sync](https://github.com/dragosrotaru/obsidian-immich-sync) plugin to resolve image hashes into rendered thumbnails.

## Features

### Bases views

These views require Obsidian's [Bases](https://help.obsidian.md/bases) core plugin to be enabled. They are designed to be used as views on a Base that filters down to your journal entries.

- **Entries** — vertical, paginated feed of journal entries sorted by date (newest first). Each card shows the date, the first two non-empty lines of the note, and a thumbnail of the first Immich image.
- **Calendar** — month grid with one cell per day. Days with an entry are tinted; days that also have an Immich image use the image as the cell background. Includes prev/next month navigation and a "jump to date" modal. The viewed month is persisted per view.
- **Memories** — horizontal carousel of past anniversaries (30 days ago, 1 year ago, 2 years ago, …) that have an entry on the same calendar day. Tapping a card opens a full-screen, swipeable slideshow of that entry's images.

### Commands

- **Set coordinates from device location** — writes the device's current GPS latitude/longitude into the active note's `coordinates` frontmatter.
- **Set coordinates from immich images** — looks up the first Immich image listed in the note's `immichImages` frontmatter and writes its EXIF coordinates into `coordinates`.

### Automatic coordinate prompt

When the first hash in a journal note's `immichImages` frontmatter changes, the plugin prompts you to update the note's coordinates from the new image. This only fires for files inside the configured journal entries folder.

## Settings

- **Journal entries folder** — vault-relative folder containing your entries. The Immich-image listener and journal commands only act on files inside this folder. Leave empty to act on all files.
- **Immich images property** — frontmatter property name holding the list of Immich asset hashes. Default: `immichImages`.
- **Entry date property** — frontmatter property name holding the entry's date. Default: `journalDate`.

## Entry template

`journal-entry-template.md` is a [Templater](https://github.com/SilentVoid13/Templater) template for new entries. It sets up the expected frontmatter (`journalDate`, `journalTime`, `timeZone`, `coordinates`, `sentiment`, `isFavorite`, `immichImages`, tags, css classes), renames the file to the current date, and runs the device-GPS command.

## Development

```bash
npm install
npm run dev      # watch build
npm run build    # production build (typecheck + bundle)
npm run lint
```

Built output is bundled to `main.js` at the repo root alongside `manifest.json` and `styles.css`.

### Installing locally

Symlink or copy `main.js`, `manifest.json`, and `styles.css` into `<Vault>/.obsidian/plugins/obsidian-journal/`, then enable the plugin in **Settings → Community plugins**.

## Migration from Journey

The `migration/` directory contains a one-off script that converts a Journey export into Obsidian-compatible Markdown notes, uploading any attached photos to Immich and recording the resulting asset hashes in frontmatter. See `migration/README.md` and `migration/.env.example` for setup.

## License

[0BSD](LICENSE)
