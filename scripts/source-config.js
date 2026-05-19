const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/**
 * ApplicationV2 dialog for GM-configurable compendium source selection.
 * Two-pane layout: packages (sidebar) → individual pack toggles (content).
 * Matches dnd5e's Configure Sources layout.
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
        position: { width: 600, height: 500 },
        actions: {
            selectPackage: SourceConfig.#onSelectPackage,
        },
        form: {
            handler: SourceConfig.#onSubmit,
            closeOnSubmit: true,
        },
    };

    static PARTS = {
        sidebar: {
            id: "sidebar",
            classes: ["sidebar"],
            template: "modules/compendium-browser-bf/templates/source-config-sidebar.hbs",
        },
        content: {
            id: "content",
            template: "modules/compendium-browser-bf/templates/source-config.hbs",
        },
    };

    /* -------------------------------------------- */

    /** @type {string|null} — currently selected package ID */
    #selectedPackage = null;

    /* -------------------------------------------- */

    /**
     * Group compendium packs by package (World, System, then modules).
     */
    async _prepareContext(options) {
        const config = game.settings.get("compendium-browser-bf", "packSourceConfiguration") || {};

        // Collect all packs grouped by packageName
        const packageMap = new Map();

        for (const pack of game.packs) {
            const pkgName = pack.metadata.packageName || "World";
            if (!packageMap.has(pkgName)) {
                packageMap.set(pkgName, {
                    id: pkgName,
                    label: pkgName === "World" ? "World" : pack.metadata.packageName,
                    packs: [],
                });
            }
            packageMap.get(pkgName).packs.push({
                id: pack.metadata.id,
                label: pack.metadata.label,
                type: pack.metadata.type,
                enabled: config[pack.metadata.id] !== false,
            });
        }

        // Build sorted package list: World, System (black-flag), then modules alphabetically
        const packages = [];
        for (const [pkgName, pkg] of packageMap) {
            // Sort packs within each package
            pkg.packs.sort((a, b) => a.label.localeCompare(b.label));
            pkg.count = pkg.packs.length;

            // Resolve display label
            if (pkgName === "World") {
                pkg.label = "World";
            } else {
                // Try to find the module/system metadata for a nicer label
                const mod = game.modules.get(pkgName);
                if (mod) {
                    pkg.label = mod.title || pkgName;
                } else {
                    const sys = game.system;
                    if (sys.id === pkgName) {
                        pkg.label = sys.title || "System";
                    }
                }
            }

            packages.push(pkg);
        }

        // Sort: World, System, then modules alphabetically
        const systemId = game.system.id;
        packages.sort((a, b) => {
            if (a.id === "World") return -1;
            if (b.id === "World") return 1;
            if (a.id === systemId) return -1;
            if (b.id === systemId) return 1;
            return a.label.localeCompare(b.label);
        });

        // Select first package by default
        if (!this.#selectedPackage && packages.length > 0) {
            this.#selectedPackage = packages[0].id;
        }

        return { packages };
    }

    async _preparePartContext(partId, context, options) {
        if (partId === "sidebar") {
            context.packages = context.packages.map(p => ({
                ...p,
                active: p.id === this.#selectedPackage,
            }));
            return context;
        }
        if (partId === "content") {
            const pkg = context.packages.find(p => p.id === this.#selectedPackage);
            if (pkg) {
                const items = pkg.packs.filter(p => p.type === "Item").sort((a, b) => a.label.localeCompare(b.label));
                const actors = pkg.packs.filter(p => p.type === "Actor").sort((a, b) => a.label.localeCompare(b.label));
                context.selectedPackage = {
                    label: pkg.label,
                    items,
                    actors,
                };
            } else {
                context.selectedPackage = null;
            }
            return context;
        }
        return context;
    }

    /* -------------------------------------------- */

    /**
     * Handle package selection in the sidebar.
     */
    static #onSelectPackage(event, target) {
        const li = target.closest("[data-package]");
        if (!li) return;
        this.#selectedPackage = li.dataset.package;
        this.render();
    }

    /**
     * Save pack source configuration.
     */
    static #onSubmit(event, form, formData) {
        const config = {};
        for (const [key, value] of formData.entries()) {
            if (key.startsWith("pack-")) {
                config[key.slice(5)] = value === "true";
            }
        }
        game.settings.set("compendium-browser-bf", "packSourceConfiguration", config);
    }
}
