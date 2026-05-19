const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/**
 * Configure Sources — matches dnd5e's CompendiumBrowserSettingsConfig.
 * Two-part template: sidebar (packages) + packs (Items & Actors checkboxes).
 * Uses _onChangeForm → data-type dispatch, same as dnd5e.
 */
export class SourceConfig extends HandlebarsApplicationMixin(ApplicationV2) {
    static DEFAULT_OPTIONS = {
        id: "compendium-browser-bf-source-config",
        classes: ["dialog-lg"],
        tag: "form",
        window: {
            title: "compendium-browser-bf.ConfigureSources",
            resizable: true,
        },
        position: { width: 800, height: 650 },
        actions: {
            clearFilter: SourceConfig.#onClearPackageFilter,
            selectPackage: SourceConfig.#onSelectPackage,
        },
        selected: "system",
    };

    static PARTS = {
        sidebar: {
            id: "sidebar",
            template: "modules/compendium-browser-bf/templates/source-config-sidebar.hbs",
        },
        packs: {
            id: "packs",
            template: "modules/compendium-browser-bf/templates/source-config.hbs",
        },
    };

    #filter = "";
    #selected;

    constructor(options) {
        super(options);
        this.#selected = this.options.selected;
    }

    /**
     * The number of milliseconds to delay between user keypresses before executing the package filter.
     * @type {number}
     */
    static FILTER_DELAY = 200;

    _debouncedFilter = foundry.utils.debounce(this._onFilterPackages.bind(this), this.constructor.FILTER_DELAY);

    /* -------------------------------------------- */
    /*  Context Preparation                          */
    /* -------------------------------------------- */

    async _prepareContext(options) {
        const sources = this.constructor.collateSources();
        const byPackage = { world: new Set(), system: new Set() };

        for (const pack of game.packs) {
            const { documentName } = pack;
            if (documentName !== "Actor" && documentName !== "Item") continue;

            const pType = pack.metadata.packageType || "module";
            let entry;
            if (pType === "world" || pType === "system") {
                entry = byPackage[pType];
            } else {
                entry = byPackage[`module.${pack.metadata.packageName}`] ??= new Set();
            }
            entry.add(pack.metadata.id);
        }

        const packages = {};
        packages.world = this._preparePackageContext("world", game.world, byPackage.world, sources);
        packages.system = this._preparePackageContext("system", game.system, byPackage.system, sources);

        const modules = Object.entries(byPackage).reduce((arr, [k, pks]) => {
            if (k === "world" || k === "system") return arr;
            const id = k.slice(7);
            const mod = game.modules.get(id);
            arr.push(this._preparePackageContext(k, mod, pks, sources));
            return arr;
        }, []);
        modules.sort((a, b) => a.title.localeCompare(b.title, game.i18n.lang));
        packages.modules = Object.fromEntries(modules.map(m => [m.id, m]));

        const packs = { actors: {}, items: {} };
        [["actors", "Actor"], ["items", "Item"]].forEach(([p, type]) => {
            packs[p] = this._preparePackGroupContext(type, byPackage[this.#selected], sources);
        });

        return {
            ...await super._prepareContext(options),
            packages,
            packs,
            filter: this.#filter,
        };
    }

    _preparePackageContext(id, pkg, packs, sources) {
        const title = pkg?.title ?? id;
        const all = packs.isSubsetOf(sources);
        const indeterminate = !all && packs.intersects(sources);
        return {
            id,
            title,
            indeterminate,
            checked: indeterminate || all,
            count: packs.size,
            active: this.#selected === id,
            filter: title.replace(/[^\p{L} ]/gu, "").toLocaleLowerCase(game.i18n.lang),
        };
    }

    _preparePackGroupContext(documentType, packs, sources) {
        packs = packs.filter(id => {
            const pack = game.packs.get(id);
            return pack && pack.documentName === documentType;
        });
        const all = packs.isSubsetOf(sources);
        const indeterminate = !all && packs.intersects(sources);
        return {
            indeterminate,
            checked: indeterminate || all,
            showAll: packs.size > 0,
            entries: Array.from(packs.map(id => {
                const pack = game.packs.get(id);
                if (!pack) return null;
                const { title, metadata } = pack;
                const { packageName, flags } = metadata;
                let tag = "";
                // Source book abbreviation for Black Flag packs
                if (packageName === "black-flag" && flags?.["black-flag"]?.sourceBook) {
                    tag = flags["black-flag"].sourceBook;
                }
                return {
                    tag,
                    title,
                    id: pack.metadata.id,
                    checked: sources.has(id),
                };
            })).filter(Boolean).sort((a, b) => {
                return a.tag?.localeCompare(b.tag) || a.title.localeCompare(b.title, game.i18n.lang);
            }),
        };
    }

    /* -------------------------------------------- */
    /*  Event Handlers                               */
    /* -------------------------------------------- */

    /** @override */
    _onChangeForm(formConfig, event) {
        super._onChangeForm(formConfig, event);
        if (event.target.dataset.type) this._onToggleSource(event.target);
    }

    async _onToggleSource(target) {
        let packs;
        switch (target.dataset.type) {
            case "pack": packs = this._onTogglePack(target); break;
            case "package": packs = this._onTogglePackage(target); break;
            default: return;
        }
        const setting = { ...game.settings.get("compendium-browser-bf", "packSourceConfiguration"), ...packs };
        await game.settings.set("compendium-browser-bf", "packSourceConfiguration", setting);

        // Fire a hook so the CompendiumBrowser can listen and re-fetch
        Hooks.callAll("compendium-browser-bf.sourcesChanged");

        this.render();
    }

    _onTogglePack(target) {
        const packs = {};
        const { name, checked, indeterminate } = target;
        if (name === "all-items" || name === "all-actors") {
            const [, documentType] = name.split("-");
            const pkg = this.#selected === "world"
                ? game.world
                : this.#selected === "system"
                    ? game.system
                    : game.modules.get(this.#selected.slice(7));
            for (const { id, type } of pkg.packs) {
                if (game[documentType].documentName === type) {
                    packs[id] = indeterminate ? false : checked;
                }
            }
        } else {
            packs[name] = checked;
        }
        return packs;
    }

    _onTogglePackage(target) {
        const packs = {};
        const { name, checked, indeterminate } = target;
        const pkg = name === "world"
            ? game.world
            : name === "system"
                ? game.system
                : game.modules.get(name.slice(7));
        for (const { id } of pkg.packs) {
            packs[id] = indeterminate ? false : checked;
        }
        return packs;
    }

    /* -------------------------------------------- */
    /*  Source Collation                             */
    /* -------------------------------------------- */

    static collateSources() {
        const sources = new Set();
        const setting = game.settings.get("compendium-browser-bf", "packSourceConfiguration");
        for (const pack of game.packs) {
            const { documentName } = pack;
            if (documentName !== "Actor" && documentName !== "Item") continue;
            if (setting[pack.metadata.id] !== false) sources.add(pack.metadata.id);
        }
        return sources;
    }

    /* -------------------------------------------- */
    /*  Render Hooks                                 */
    /* -------------------------------------------- */

    /** @override */
    _onRender(context, options) {
        super._onRender(context, options);
        // Set indeterminate state on package and "All" checkboxes (DOM-only property)
        for (const el of this.element.querySelectorAll("input[data-type]")) {
            const { type, indeterminate } = el.dataset;
            if (indeterminate === "true") el.indeterminate = true;
        }
    }

    /** @override */
    _attachFrameListeners() {
        super._attachFrameListeners();
        this.element.addEventListener("keydown", this._debouncedFilter, { passive: true });
    }

    /** @override */
    _attachPartListeners(partId, htmlElement, options) {
        super._attachPartListeners(partId, htmlElement, options);
        if (partId === "sidebar") this._filterPackages();
    }

    /* -------------------------------------------- */
    /*  Package Filtering                            */
    /* -------------------------------------------- */

    _filterPackages() {
        const query = this.#filter.replace(/[^\p{L} ]/gu, "").toLocaleLowerCase(game.i18n.lang);
        this.element.querySelectorAll(".package-list.modules > li").forEach(item => {
            item.toggleAttribute("hidden", query && !item.dataset.filter.includes(query));
        });
    }

    _onFilterPackages(event) {
        if (!event.target.matches("search > input")) return;
        this.#filter = event.target.value;
        this._filterPackages();
    }

    /* -------------------------------------------- */
    /*  Static Actions                               */
    /* -------------------------------------------- */

    static #onClearPackageFilter(event, target) {
        const input = target.closest("search").querySelector(":scope > input");
        input.value = this.#filter = "";
        this._filterPackages();
    }

    static #onSelectPackage(event, target) {
        const { packageId } = target.closest("[data-package-id]")?.dataset ?? {};
        if (!packageId) return;
        this.#selected = packageId;
        this.render();
    }
}
