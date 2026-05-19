const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/**
 * Configure Sources — two-pane dialog matching dnd5e's layout.
 * Left: package list (World, System, modules).
 * Right: Items column + Actors column for the selected package.
 * All checkboxes default to checked (enabled).
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
        position: { width: 700, height: 550 },
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
            scrollable: [".packs"],
        },
    };

    /** @type {string} */
    #selectedPackage = null;

    async _prepareContext(options) {
        const config = game.settings.get("compendium-browser-bf", "packSourceConfiguration") || {};

        // Group packs by packageName
        const pkgMap = new Map();
        for (const pack of game.packs) {
            const pn = pack.metadata.packageName || "World";
            if (!pkgMap.has(pn)) {
                pkgMap.set(pn, {
                    id: pn,
                    label: pn,
                    items: [],
                    actors: [],
                });
            }
            const entry = {
                id: pack.metadata.id,
                label: pack.metadata.label,
                enabled: config[pack.metadata.id] !== false,
            };
            const pkg = pkgMap.get(pn);
            if (pack.metadata.type === "Item") pkg.items.push(entry);
            else if (pack.metadata.type === "Actor") pkg.actors.push(entry);
        }

        // Build sorted package list
        const sysId = game.system.id;
        const packages = [];
        for (const [pn, pkg] of pkgMap) {
            pkg.items.sort((a, b) => a.label.localeCompare(b.label));
            pkg.actors.sort((a, b) => a.label.localeCompare(b.label));
            pkg.count = pkg.items.length + pkg.actors.length;

            if (pn === "World") {
                pkg.label = "World";
            } else if (pn === sysId) {
                pkg.label = game.system.title || "System";
            } else {
                const mod = game.modules.get(pn);
                pkg.label = mod?.title || pn;
            }
            packages.push(pkg);
        }

        // Sort: World → System → modules alphabetically
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

        return { packages };
    }

    async _preparePartContext(partId, context, options) {
        if (partId === "sidebar") {
            context.packages = context.packages.map(p => ({
                ...p,
                active: p.id === this.#selectedPackage,
            }));
        }
        if (partId === "content") {
            const pkg = context.packages.find(p => p.id === this.#selectedPackage) || {};
            context.items = pkg.items || [];
            context.actors = pkg.actors || [];
            context.packageLabel = pkg.label || "";
        }
        return context;
    }

    static #onSelectPackage(event, target) {
        const li = target.closest("[data-package]");
        if (!li) return;
        this.#selectedPackage = li.dataset.package;
        this.render();
    }

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
