# CLAUDE.md

Guidance for AI coding agents working on `compendium-browser-bf`.

## Project

Foundry VTT v13 module that ports the dnd5e compendium browser UI to the Black Flag / Tales of the Valiant (`black-flag`) system.

- Module id: `compendium-browser-bf`
- System dependency: `black-flag` >= 2.0.0
- Entry point: `scripts/main.js` -> `initCompendiumBrowser()`
- Built output committed to repo: `index.js`, `index.js.map`, `styles/module.css`, `styles/module.css.map`
- Manifest: `module.json` (do **not** add `compatibility.maximum`)

## Commands

```bash
npm install
npm run build
```

There is currently no automated test suite. Verification means at minimum:

1. Run `npm run build` successfully.
2. Inspect `git diff` for both source and generated bundle/CSS changes.
3. If changing behavior, test in Foundry with the Black Flag system active.
4. Check browser console for runtime errors.

## Architecture

### Main browser: `scripts/compendium-browser.js`

`CompendiumBrowser` extends Foundry v13 `ApplicationV2` via `HandlebarsApplicationMixin`.

Important state:

- `#activeTab`: current tab key.
- `#mode`: basic/advanced. Advanced is hidden in the UI right now.
- `#searchName`: debounced prefix name search.
- `#activeTypes`: selected type checkboxes. `null` means use the tab default types.
- `#cachedFilterDefs`: filter definitions from `getFilterDefinitions()` used when reading DOM values.
- `#pendingFilterValues`: snapshot of sidebar filter values before partial renders destroy DOM state.
- `#allResults` / `#loadedCount`: fetched results and lazy-loading batch state.

Key flow:

1. `initCompendiumBrowser()` registers the world setting `packSourceConfiguration`, the `Shift+Alt+B` keybinding, and injects the sidebar button into `renderCompendiumDirectory`.
2. `_prepareSidebarContext()` builds search, type checkbox, filter, class/category special filter, and source contexts.
3. `_prepareResultsContext()` reads/snapshots filters and starts `CompendiumBrowser.fetch()`.
4. `#renderResults()` awaits the fetch and renders result rows from `templates/browser-entry.hbs`.
5. Partial renders are common. Preserve any UI state that lives in the DOM before calling `render({ parts: [...] })`.

### Filters: `scripts/compendium-browser-filters.js`

Filter definitions are keyed by Black Flag Item/Actor type. Filters are index-first for performance.

- Use narrow `getIndex({ fields })` paths. Do **not** request broad `system`; Foundry can crash when nested paths cross primitive values.
- `_keyPath` is used against compendium index entries with `foundry.utils.getProperty()`.
- `_documentCheck` filters load full documents only when index data is insufficient. Current example: subclass parent class uses `doc.system.identifier.class`.
- Three-state set filters use values: `0` off, `1` include, `-1` exclude.
- Rarity has a special `mundane` -> blank mapping because Black Flag stores mundane/no-rarity as empty/null.

Black Flag data paths currently relied on:

- Spell circle: `system.circle.base`
- Spell school: `system.school`
- Source Book: `system.source.book`, with parser-created fallback `system.description.source.book` (display Source Book key in result rows; sidebar resolves full label from `CONFIG.BlackFlag.sourceBooks` with module fallback list)
- Source page/fallback: `system.source.page`, `system.source.fallback`
- Spell source/tags: `system.source`, `system.tags`
- Item price: `system.price.value`
- Item rarity: `system.rarity`
- Talent category: `system.type.category`
- NPC CR: `system.attributes.cr`
- Actor size/type: `system.traits.size`, `system.traits.type.value`
- Subclass parent: full document `system.identifier.class`

If a data path is uncertain, inspect actual Black Flag documents or create a test item and read it back. Do not guess.

### Source configuration: `scripts/source-config.js`

`SourceConfig` is the GM-facing source picker. It groups Actor/Item packs by world, system, and module package, stores disabled packs in `packSourceConfiguration`, and fires `Hooks.callAll("compendium-browser-bf.sourcesChanged")` so the open browser refreshes.

This code uses Set helpers such as `isSubsetOf()` and `intersects()` available in the target runtime. If supporting older JS runtimes, add compatibility helpers first.

## Templates and styling

Templates live in `templates/`. Styling source is `scss/module.scss`; built CSS is `styles/module.css`.

- Keep tabs icon-focused and dnd5e-like.
- Sidebar filter interactions are delegated from the application element because ApplicationV2 replaces parts during render.
- Type checkboxes must keep their state via `#activeTypes`, not by re-reading after DOM replacement.
- Three-state filter UI is driven by `.filter-state` `data-value` plus hidden inputs.

## Development rules

- This module is a port/derivative of the dnd5e compendium browser. When behavior differs or is broken, inspect the dnd5e source first instead of reasoning from scratch.
- Run `npm run build` after source or SCSS changes and commit generated artifacts if they changed.
- Do not commit copyrighted RPG prose or large proprietary compendium data. Use minimal synthetic fixtures only if tests are added later.
- Do not expose Jon's Foundry domains, hostnames, tokens, or local infrastructure details in docs, code comments, or issues.
- Keep changes small and readable; avoid broad rewrites of ApplicationV2 lifecycle code unless a Foundry runtime test proves the need.

## Release notes

Current release assets are expected to include `module.json` and `module.zip` with the generated `index.js` and `styles/module.css`. After changing `module.json`, verify install URLs still point to GitHub latest release downloads.
