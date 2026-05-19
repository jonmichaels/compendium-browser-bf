const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/**
 * Configure Sources — matches dnd5e.
 * Single template, checkbox toggle per package, auto-save on any change.
 */
export class SourceConfig extends HandlebarsApplicationMixin(ApplicationV2) {
    static DEFAULT_OPTIONS = {
        id: "compendium-browser-bf-source-config",
        classes: ["compendium-browser", "source-config"],
        tag: "form",
        window: {
            title: "compendium-browser-bf.ConfigureSources",
            minimizable: false,
            resizable: true,
        },
        position: { width: 650, height: 500 },
        actions: {
            selectPackage: SourceConfig.#onSelectPackage,
            togglePackage: SourceConfig.#onTogglePackage,
            autoSave: SourceConfig.#onAutoSave,
            toggleAllPacks: SourceConfig.#onToggleAllPacks,
        },
    };

    static PARTS = {
        main: {
            template: "modules/compendium-browser-bf/templates/source-config.hbs",
            scrollable: [""],
        },
    };

    #selectedPackage = null;
    #packageData = {};

    async _prepareContext(options) {
        const config = game.settings.get("compendium-browser-bf", "packSourceConfiguration") || {};
        const sysId = game.system.id;

        // Separate packs by packageType (world, system, module) for proper ordering
        const worldPacks = [];
        const systemPacks = [];
        const modulePacks = [];

        for (const pack of game.packs) {
            const pType = pack.metadata.packageType || "module";
            if (pType === "world") worldPacks.push(pack);
            else if (pType === "system") systemPacks.push(pack);
            else modulePacks.push(pack);
        }

        // Build package data grouped by package name (derived from pack ID prefix)
        function buildPkg(packs, pkgId, pkgLabel, sortOrder) {
            const pkg = { id: pkgId, label: pkgLabel, items: [], actors: [], packIds: [], sortOrder };
            for (const pack of packs) {
                pkg.packIds.push(pack.metadata.id);
                const entry = {
                    id: pack.metadata.id,
                    label: pack.metadata.label,
                    enabled: config[pack.metadata.id] !== false,
                };
                if (pack.metadata.type === "Item") pkg.items.push(entry);
                else if (pack.metadata.type === "Actor") pkg.actors.push(entry);
            }
            pkg.items.sort((a, b) => a.label.localeCompare(b.label));
            pkg.actors.sort((a, b) => a.label.localeCompare(b.label));
            pkg.count = pkg.items.length + pkg.actors.length;
            pkg.active = pkg.items.every(e => e.enabled) && pkg.actors.every(a => a.enabled);
            return pkg;
        }

        const packages = [];

        // ALWAYS include World and System entries — even if zero packs
        // World compendiums (packageType === "world")
        packages.push(buildPkg(worldPacks, "world", "World", 0));

        // System compendiums (packageType === "system")
        packages.push(buildPkg(systemPacks, sysId, game.system.title || "System", 1));

        // Module compendiums — group by package name (module ID from pack.metadata.id prefix)
        const mMap = new Map();
        for (const pack of modulePacks) {
            const pn = pack.metadata.id.split(".")[0]; // "module-name.packName" → "module-name"
            if (!mMap.has(pn)) mMap.set(pn, []);
            mMap.get(pn).push(pack);
        }
        for (const [pn, pks] of mMap) {
            const mod = game.modules.get(pn);
            packages.push(buildPkg(pks, pn, mod?.title || pn, 2));
        }

        // Sort: world (0) → system (1) → modules (2) by label
        packages.sort((a, b) => {
            if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
            return a.label.localeCompare(b.label);
        });

        if (!this.#selectedPackage && packages.length > 0) {
            this.#selectedPackage = packages[0].id;
        }

        // Store package data for toggle logic
        this.#packageData = {};
        for (const p of packages) {
            this.#packageData[p.id] = {
                packIds: p.packIds,
                items: p.items,
                actors: p.actors,
            };
        }

        const sel = packages.find(p => p.id === this.#selectedPackage) || {};

        return {
            packages: packages.map(p => ({
                ...p,
                active: p.active,
                allItemsEnabled: p.items.length > 0 && p.items.every(e => e.enabled),
                allActorsEnabled: p.actors.length > 0 && p.actors.every(a => a.enabled),
            })),
            items: (sel.items || []).map(i => ({ ...i })),
            actors: (sel.actors || []).map(a => ({ ...a })),
        };
    }

    /** Select a package in the sidebar to view its packs. */
    static #onSelectPackage(event, target) {
        const li = target.closest("[data-package]");
        if (!li) return;
        this.#selectedPackage = li.dataset.package;
        this.render();
    }

    /** Toggle entire package on/off — sets all packs in the package to the checkbox state. */
    static #onTogglePackage(event, target) {
        const li = target.closest("[data-package]");
        if (!li) return;
        const pkgId = li.dataset.package;
        const enabled = target.checked;
        const pkg = this.#packageData[pkgId];
        if (!pkg) return;

        const config = game.settings.get("compendium-browser-bf", "packSourceConfiguration") || {};
        for (const id of pkg.packIds) {
            config[id] = enabled;
        }
        game.settings.set("compendium-browser-bf", "packSourceConfiguration", config);

        // Refresh any open CompendiumBrowser windows so they see the change immediately
        SourceConfig.#refreshBrowsers();

        this.render();
    }

    /** Auto-save individual pack checkbox changes. */
    static #onAutoSave(event, target) {
        const config = game.settings.get("compendium-browser-bf", "packSourceConfiguration") || {};
        if (target.name?.startsWith("pack-")) {
            config[target.name.slice(5)] = target.checked;
        }
        game.settings.set("compendium-browser-bf", "packSourceConfiguration", config);

        // Refresh any open CompendiumBrowser windows
        SourceConfig.#refreshBrowsers();

        this.render();
    }

    /** Toggle "All" checkbox — cascades to all items or actors in the selected package. */
    static #onToggleAllPacks(event, target) {
        const checked = target.checked;
        const section = target.dataset.section; // "items" or "actors"
        const pkgId = this.#selectedPackage;
        const pkg = this.#packageData[pkgId];
        if (!pkg) return;

        const config = game.settings.get("compendium-browser-bf", "packSourceConfiguration") || {};
        const packs = section === "items" ? pkg.items : pkg.actors;
        for (const entry of packs) {
            config[entry.id] = checked;
        }
        game.settings.set("compendium-browser-bf", "packSourceConfiguration", config);

        // Refresh any open CompendiumBrowser windows
        SourceConfig.#refreshBrowsers();

        this.render();
    }

    /** Find all open CompendiumBrowser instances and force them to re-fetch. */
    static #refreshBrowsers() {
        for (const w of Object.values(ui.windows)) {
            if (w.id === "compendium-browser-bf") {
                // Force full re-render — _prepareResultsContext will call fetch() with
                // fresh collateSources() which reads the updated settings
                w.render({ force: true });
            }
        }
    }
}
