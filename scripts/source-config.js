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
        const pkgMap = new Map();
        const sysId = game.system.id;

        for (const pack of game.packs) {
            const pn = pack.metadata.packageName || "World";
            if (!pkgMap.has(pn)) {
                pkgMap.set(pn, { id: pn, label: pn, items: [], actors: [], packIds: [] });
            }
            const pkg = pkgMap.get(pn);
            pkg.packIds.push(pack.metadata.id);
            const entry = {
                id: pack.metadata.id,
                label: pack.metadata.label,
                enabled: config[pack.metadata.id] !== false,
            };
            if (pack.metadata.type === "Item") pkg.items.push(entry);
            else if (pack.metadata.type === "Actor") pkg.actors.push(entry);
        }

        const packages = [];
        for (const [pn, pkg] of pkgMap) {
            pkg.items.sort((a, b) => a.label.localeCompare(b.label));
            pkg.actors.sort((a, b) => a.label.localeCompare(b.label));
            pkg.count = pkg.items.length + pkg.actors.length;
            if (pn === "World") pkg.label = "World";
            else if (pn === sysId) pkg.label = game.system.title || "System";
            else { const mod = game.modules.get(pn); pkg.label = mod?.title || pn; }
            // Package is "active" (checked) if ALL its packs are enabled
            pkg.active = pkg.items.every(e => e.enabled) && pkg.actors.every(a => a.enabled);
            packages.push(pkg);
        }

        packages.sort((a, b) => {
            if (a.id === "World") return -1;
            if (b.id === "World") return 1;
            if (a.id === sysId) return -1;
            if (b.id === sysId) return 1;
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
            packages: packages.map(p => ({ ...p, active: p.active })),
            items: sel.items || [],
            actors: sel.actors || [],
        };
    }

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
        this.render();
    }

    /** Auto-save individual pack checkbox changes. */
    static #onAutoSave(event, target) {
        const config = game.settings.get("compendium-browser-bf", "packSourceConfiguration") || {};
        if (target.name?.startsWith("pack-")) {
            config[target.name.slice(5)] = target.checked;
        }
        game.settings.set("compendium-browser-bf", "packSourceConfiguration", config);
        this.render();
    }
}
