# Compendium Browser — Black Flag / Tales of the Valiant (ToV)

A compendium browser for [Black Flag Roleplaying (Tales of the Valiant)](https://koboldpress.com/tales-of-the-valiant/). Browse and filter spells, items, monsters, classes, lineages, heritages, talents, and more. Ported from the dnd5e built-in compendium browser.

## Features

- Browse all Black Flag compendium content in a searchable, filterable window
- Filters by type: features, spells, weapons, equipment, consumables, classes, subclasses, lineages, heritages, backgrounds, talents, monsters
- Name search with debounced filtering
- Custom filters per type (spell circle, school, weapon properties, CR, creature type, etc.)
- Basic / Advanced mode toggle
- GM-configurable compendium source selection
- Multi-select with Shift-range for batch importing
- Lazy-loaded results for large compendium collections

## Requirements

- Foundry VTT v13+
- Black Flag Roleplaying (Tales of the Valiant) game system v2.0+

## Installation

Install via the Foundry module browser using the manifest URL:

```
https://github.com/jonmichaels/compendium-browser-bf/releases/latest/download/module.json
```

Or download the `module.zip` from [releases](https://github.com/jonmichaels/compendium-browser-bf/releases) and extract to `Data/modules/compendium-browser-bf/`.

## Usage

1. Activate the module in your world's Module Management
2. Open the Compendium Packs sidebar
3. Click **Compendium Browser** in the sidebar header
4. Select a tab (Features, Spells, Monsters, etc.)
5. Use the sidebar filters to narrow results
6. Click entries to select — hold Shift for range select
7. Click Confirm to import selected documents

## Development

```bash
npm install
npm run build    # production build
npm run watch    # development watch mode
```

Symlink the project directory into Foundry's `Data/modules/compendium-browser-bf/` for live testing.
