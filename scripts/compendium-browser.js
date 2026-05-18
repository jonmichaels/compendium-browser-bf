const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
import { getFilterDefinitions, applyAllFilters } from "./compendium-browser-filters.js";
import { SourceConfig } from "./source-config.js";

export class CompendiumBrowser extends HandlebarsApplicationMixin(ApplicationV2) {
    static DEFAULT_OPTIONS = {
        id: "compendium-browser-bf",
        classes: ["compendium-browser", "vertical-tabs", "dialog-lg"],
        tag: "form",
        window: {
            title: "compendium-browser-bf.Title",
            minimizable: true,
            resizable: true,
        },
        position: { width: 850, height: 700 },
        actions: {},
        form: {
            handler: CompendiumBrowser.#onHandleSubmit,
            closeOnSubmit: true,
        },
    };

    static PARTS = {
        header:  { template: "modules/compendium-browser-bf/templates/browser-header.hbs" },
        search:  { template: "modules/compendium-browser-bf/templates/browser-sidebar-search.hbs", container: { id: "sidebar" } },
        types:   { template: "modules/compendium-browser-bf/templates/browser-sidebar-types.hbs", container: { id: "sidebar" } },
        filters: {
            template: "modules/compendium-browser-bf/templates/browser-sidebar-filters.hbs",
            container: { id: "sidebar" },
            templates: ["modules/compendium-browser-bf/templates/browser-sidebar-filter-set.hbs"],
        },
        results: {
            template: "modules/compendium-browser-bf/templates/browser-results.hbs",
            templates: ["modules/compendium-browser-bf/templates/browser-entry.hbs"],
            scrollable: [""],
        },
        footer:  { template: "modules/compendium-browser-bf/templates/browser-footer.hbs" },
        tabs:    { template: "modules/compendium-browser-bf/templates/browser-tabs.hbs" },
    };

    static TABS = [
        { tab: "features",    label: "compendium-browser-bf.Tabs.Features",    documentClass: "Item",  types: ["feature"] },
        { tab: "spells",      label: "compendium-browser-bf.Tabs.Spells",      documentClass: "Item",  types: ["spell"] },
        { tab: "weapons",     label: "compendium-browser-bf.Tabs.Weapons",     documentClass: "Item",  types: ["weapon"] },
        { tab: "equipment",   label: "compendium-browser-bf.Tabs.Equipment",   documentClass: "Item",  types: ["gear", "armor", "tool", "container", "sundry", "currency"] },
        { tab: "consumables", label: "compendium-browser-bf.Tabs.Consumables", documentClass: "Item",  types: ["consumable"] },
        { tab: "classes",     label: "compendium-browser-bf.Tabs.Classes",     documentClass: "Item",  types: ["class"] },
        { tab: "subclasses",  label: "compendium-browser-bf.Tabs.Subclasses",  documentClass: "Item",  types: ["subclass"] },
        { tab: "lineages",    label: "compendium-browser-bf.Tabs.Lineages",    documentClass: "Item",  types: ["lineage"] },
        { tab: "heritages",   label: "compendium-browser-bf.Tabs.Heritages",   documentClass: "Item",  types: ["heritage"] },
        { tab: "backgrounds", label: "compendium-browser-bf.Tabs.Backgrounds", documentClass: "Item",  types: ["background"] },
        { tab: "talents",     label: "compendium-browser-bf.Tabs.Talents",     documentClass: "Item",  types: ["talent"] },
        { tab: "monsters",    label: "compendium-browser-bf.Tabs.Monsters",    documentClass: "Actor", types: ["npc"] },
    ];

    static ADVANCED_TABS = [
        { tab: "items",  label: "compendium-browser-bf.Tabs.AllItems",  documentClass: "Item",  types: null },
        { tab: "actors", label: "compendium-browser-bf.Tabs.AllActors", documentClass: "Actor", types: null },
    ];

    static MODES = { BASIC: 1, ADVANCED: 2 };
    static BATCHING = { MARGIN: 50, SIZE: 50 };
    static SEARCH_DELAY = 200;

    /* -------------------------------------------- */
    /*  Private Fields                              */
    /* -------------------------------------------- */

    /** @type {string} */
    #activeTab = "features";

    /** @type {number} */
    #mode = CompendiumBrowser.MODES.BASIC;

    /** @type {boolean} */
    #filtersLocked = false;

    /** @type {string} */
    #searchName = "";

    /** @type {Array} */
    #activeFilters = [];

    /** @type {Set<string>} */
    #selected = new Set();

    /** @type {Promise|undefined} */
    #resultsPromise;

    /** @type {Function|undefined} */
    #resolveSelection;

    /** @type {Array<object>} — all fetched results, unfiltered by batching */
    #allResults = [];

    /** @type {number} — how many results are currently displayed (batched) */
    #loadedCount = 0;

    /* -------------------------------------------- */
    /*  Static Methods                              */
    /* -------------------------------------------- */

    /**
     * Resolve which compendium packs are enabled for browsing.
     * Default: all packs enabled unless explicitly disabled in settings.
     * @returns {object<string, boolean>} — pack ID → enabled
     */
    static collateSources() {
        const config = game.settings.get("compendium-browser-bf", "packSourceConfiguration") || {};
        const sources = {};
        for (const pack of game.packs) {
            sources[pack.metadata.id] = config[pack.metadata.id] !== false;
        }
        return sources;
    }

    /**
     * Fetch and filter compendium index entries.
     *
     * @param {string} documentClass — "Item" or "Actor"
     * @param {object} [options]
     * @param {Set<string>} [options.types]   — restrict to these document types
     * @param {Array} [options.filters]        — active filter definitions
     * @param {string} [options.name]          — name search string
     * @param {boolean} [options.sort]         — sort results by name? (default: true)
     * @returns {Promise<Array<object>>}        — filtered index entries
     */
    static async fetch(documentClass, { types = new Set(), filters = [], name = "", sort = true } = {}) {
        const collatedSources = this.collateSources();

        // Collect all needed index field paths
        const fieldSet = new Set(["name", "img", "type"]);
        for (const f of filters) {
            if (f._keyPath) fieldSet.add(f._keyPath);
        }

        // Get matching compendium packs
        const packs = game.packs.filter(p => {
            if (p.metadata.type !== documentClass) return false;
            const packTypes = p.metadata.flags?.["black-flag"]?.types;
            if (packTypes && types.size > 0 && !packTypes.some(t => types.has(t))) return false;
            return collatedSources[p.metadata.id] !== false;
        });

        // Fetch indexes from all matching packs
        const results = [];
        for (const pack of packs) {
            const entries = await pack.getIndex({ fields: fieldSet });

            for (const entry of entries) {
                // Type filter
                if (types.size > 0 && !types.has(entry.type)) continue;

                // Name filter (case-insensitive substring)
                if (name && !entry.name.toLowerCase().includes(name.toLowerCase())) continue;

                // Custom filters
                if (filters.length > 0 && !applyAllFilters(entry, filters)) continue;

                results.push({
                    ...entry,
                    pack: pack.metadata.id,
                    uuid: `Compendium.${pack.metadata.id}.${entry._id}`,
                });
            }
        }

        // Sort by name
        if (sort) results.sort((a, b) => a.name.localeCompare(b.name));
        return results;
    }

    /* -------------------------------------------- */
    /*  Form Handler                                */
    /* -------------------------------------------- */

    /**
     * Handle form submission when in selection mode.
     * @this {CompendiumBrowser}
     */
    static async #onHandleSubmit(event, form, formData) {
        const browser = this;
        if (browser.#resolveSelection) {
            browser.#resolveSelection(Array.from(browser.#selected));
        }
    }

    /* -------------------------------------------- */
    /*  Properties                                  */
    /* -------------------------------------------- */

    /**
     * The active tab definition object from TABS or ADVANCED_TABS.
     * @type {object}
     */
    get #activeTabDef() {
        return (this.#mode === CompendiumBrowser.MODES.ADVANCED
            ? [...CompendiumBrowser.TABS, ...CompendiumBrowser.ADVANCED_TABS]
            : CompendiumBrowser.TABS).find(t => t.tab === this.#activeTab)
            ?? CompendiumBrowser.TABS[0];
    }

    /**
     * Whether the browser is in selection mode.
     * @type {boolean}
     */
    get #displaySelection() {
        return !!this.#resolveSelection;
    }

    /* -------------------------------------------- */
    /*  Context Preparation                         */
    /* -------------------------------------------- */

    /**
     * Prepare global context shared across all template parts.
     * @param {object} options - Render options
     * @returns {Promise<object>}
     */
    async _prepareContext(options) {
        document.body.style.setProperty("--browser-min-height", "400px");

        const allTabs = this.#mode === CompendiumBrowser.MODES.ADVANCED
            ? [...CompendiumBrowser.TABS, ...CompendiumBrowser.ADVANCED_TABS]
            : CompendiumBrowser.TABS;

        return {
            tabs: allTabs,
            activeTab: this.#activeTab,
            showModeToggle: !this.#filtersLocked,
            isAdvanced: this.#mode === CompendiumBrowser.MODES.ADVANCED,
            showTypes: true,
            displaySelection: this.#displaySelection,
        };
    }

    /**
     * Prepare per-part context, routing to specialized sub-methods.
     * @param {string} partId
     * @param {object} context
     * @param {object} options
     * @returns {Promise<object>}
     */
    async _preparePartContext(partId, context, options) {
        switch (partId) {
            case "header":  return this._prepareHeaderContext(context);
            case "tabs":    return this._prepareTabsContext(context);
            case "search":  return this._prepareSearchContext(context);
            case "types":   return this._prepareTypesContext(context);
            case "filters": return this._prepareFiltersContext(context);
            case "results": return this._prepareResultsContext(context);
            case "footer":  return this._prepareFooterContext(context);
        }
        return context;
    }

    /**
     * Header context: mode toggle state.
     */
    async _prepareHeaderContext(context) {
        context.showModeToggle = !this.#filtersLocked;
        context.isAdvanced = this.#mode === CompendiumBrowser.MODES.ADVANCED;
        context.partId = "header";
        return context;
    }

    /**
     * Tabs context: tab list with active/group states.
     */
    async _prepareTabsContext(context) {
        const allTabs = this.#mode === CompendiumBrowser.MODES.ADVANCED
            ? [...CompendiumBrowser.TABS, ...CompendiumBrowser.ADVANCED_TABS]
            : CompendiumBrowser.TABS;

        context.tabs = allTabs.map(t => ({
            ...t,
            tab: t.tab,
            label: t.label,
            active: t.tab === this.#activeTab,
            group: t.tab === this.#activeTab ? "primary" : "",
            documentClass: t.documentClass,
            types: t.types ? t.types.join(",") : "",
        }));
        return context;
    }

    /**
     * Search context: current search name.
     */
    async _prepareSearchContext(context) {
        context.name = this.#searchName;
        context.partId = "search";
        return context;
    }

    /**
     * Types context: type checkboxes for the active tab.
     */
    async _prepareTypesContext(context) {
        const def = this.#activeTabDef;
        const types = def.types ?? [];

        // Build type entries for the template
        context.types = types.map((typeKey, i) => ({
            "@key": typeKey,
            label: `TYPES.${typeKey}`,
            chosen: i === 0, // First type selected by default
        }));
        context.showTypes = types.length > 1;
        context.isLocked = this.#filtersLocked;
        context.partId = "types";
        return context;
    }

    /**
     * Filters context: active filter definitions and values for the current tab.
     */
    async _prepareFiltersContext(context) {
        const def = this.#activeTabDef;
        const types = def.types ? new Set(def.types) : null;
        context.additional = getFilterDefinitions(def.documentClass, types);
        context.partId = "filters";
        return context;
    }

    /**
     * Results context: kick off async fetch, show loading state.
     */
    async _prepareResultsContext(context) {
        const def = this.#activeTabDef;
        const filters = context.additional || getFilterDefinitions(def.documentClass, def.types ? new Set(def.types) : null);

        // Kick off the async fetch — results rendered later via #renderResults
        this.#allResults = [];
        this.#loadedCount = 0;
        this.#resultsPromise = CompendiumBrowser.fetch(def.documentClass, {
            types: def.types ? new Set(def.types) : new Set(),
            filters,
            name: this.#searchName,
        });

        context.results = [];
        context.hint = null;
        context.loading = true;
        context.displaySelection = this.#displaySelection;
        context.partId = "results";
        return context;
    }

    /**
     * Render results after the fetch promise resolves, with batching for lazy loading.
     * @param {HTMLElement} container — the results container element
     */
    async #renderResults(container) {
        if (!this.#resultsPromise) return;

        try {
            this.#allResults = await this.#resultsPromise;
            this.#loadedCount = Math.min(CompendiumBrowser.BATCHING.SIZE, this.#allResults.length);
        } catch (err) {
            console.error("Compendium Browser fetch error:", err);
            this.#allResults = [];
            this.#loadedCount = 0;
        }

        // Render the current batch
        const batch = this.#allResults.slice(0, this.#loadedCount);
        await this._renderBatch(container, batch);
    }

    /**
     * Replace the results list content with a rendered batch.
     */
    async _renderBatch(container, batch) {
        const listEl = container.querySelector(".item-list");
        const loadingEl = container.querySelector(".results-loading");

        if (!listEl) return;

        // Hide loading spinner
        if (loadingEl) loadingEl.style.display = "none";

        // Build entries from the batch
        const entries = batch.map(entry => this._buildEntry(entry));

        // Render the entry partials
        const template = "modules/compendium-browser-bf/templates/browser-entry.hbs";
        const html = await Promise.all(entries.map(e =>
            foundry.applications.handlebars.renderTemplate(template, { entry: e, displaySelection: this.#displaySelection })
        ));

        listEl.innerHTML = html.join("");

        if (this.#allResults.length === 0) {
            listEl.innerHTML = '<li class="empty">No results found.</li>';
        }
    }

    /**
     * Build a display-ready entry object from a compendium index entry.
     */
    _buildEntry(entry) {
        const pack = game.packs.get(entry.pack);
        const source = pack?.metadata.label || entry.pack;
        return {
            ...entry,
            name: entry.name,
            img: entry.img,
            uuid: entry.uuid,
            source,
            subtitle: `BF.${entry.type[0].toUpperCase()}${entry.type.slice(1)}`,
            selected: this.#selected.has(entry.uuid),
        };
    }

    /**
     * Handle scroll event on the results container for lazy loading.
     */
    #onScrollResults(event) {
        const el = event.currentTarget;
        const scrollBottom = el.scrollHeight - el.scrollTop - el.clientHeight;

        // Load more when within MARGIN px of the bottom
        if (scrollBottom < CompendiumBrowser.BATCHING.MARGIN && this.#loadedCount < this.#allResults.length) {
            this.#loadedCount = Math.min(
                this.#loadedCount + CompendiumBrowser.BATCHING.SIZE,
                this.#allResults.length
            );

            const batch = this.#allResults.slice(0, this.#loadedCount);
            // Append new entries rather than replacing
            const listEl = el.querySelector(".item-list");
            if (!listEl) return;

            const newEntries = batch.slice(this.#loadedCount - CompendiumBrowser.BATCHING.SIZE);
            foundry.applications.handlebars.renderTemplate(
                "modules/compendium-browser-bf/templates/browser-entry.hbs",
                { entry: {}, displaySelection: this.#displaySelection }
            ).then(template => {
                for (const entry of newEntries) {
                    const div = document.createElement("li");
                    div.innerHTML = template;
                    // Rebuild with actual data by replacing the full content
                    foundry.applications.handlebars.renderTemplate(
                        "modules/compendium-browser-bf/templates/browser-entry.hbs",
                        { entry: this._buildEntry(entry), displaySelection: this.#displaySelection }
                    ).then(entryHtml => {
                        const temp = document.createElement("li");
                        temp.innerHTML = entryHtml;
                        listEl.appendChild(temp.firstElementChild || temp);
                    });
                }
            });
        }
    }

    /**
     * Footer context: selection summary and validation.
     */
    async _prepareFooterContext(context) {
        context.displaySelection = this.#displaySelection;
        context.selectionCount = this.#selected.size;
        context.invalid = false;
        context.partId = "footer";
        return context;
    }

    /* -------------------------------------------- */
    /*  Lifecycle                                    */
    /* -------------------------------------------- */

    _onRender(context, options) {
        super._onRender(context, options);
        // Attach event listeners after render
        this.#activateListeners(context, options);

        // Kick off results fetch and render when ready
        const resultsContainer = this.element.querySelector(".browser-results .items-section");
        if (resultsContainer && this.#resultsPromise) {
            // Add scroll listener for lazy loading
            resultsContainer.addEventListener("scroll", (event) => this.#onScrollResults(event), { passive: true });
            // Start rendering results
            this.#renderResults(resultsContainer);
        }
    }

    /**
     * Attach DOM event listeners for tab switching, mode toggle, search, and filters.
     */
    #activateListeners(context, options) {
        const html = this.element;

        // Tab switching
        html.querySelectorAll("[data-action='tab']").forEach(el => {
            el.addEventListener("click", (event) => this.#onClickTab(event));
        });

        // Mode toggle
        const modeToggle = html.querySelector("[data-action='toggleMode']");
        if (modeToggle) {
            modeToggle.addEventListener("change", (event) => this.#onToggleMode(event));
        }

        // Search input
        const searchInput = html.querySelector("input[name='name']");
        if (searchInput) {
            let timeout;
            searchInput.addEventListener("input", (event) => {
                clearTimeout(timeout);
                timeout = setTimeout(() => this.#onSearch(event), CompendiumBrowser.SEARCH_DELAY);
            });
        }

        // Clear search
        const clearBtn = html.querySelector("[data-action='clearName']");
        if (clearBtn) {
            clearBtn.addEventListener("click", () => this.#onClearSearch());
        }

        // Type checkboxes
        html.querySelectorAll("[data-action='setType']").forEach(el => {
            el.addEventListener("change", (event) => this.#onSetType(event));
        });

        // Filter collapsible toggles
        html.querySelectorAll("[data-action='toggleCollapsed']").forEach(el => {
            el.addEventListener("click", (event) => this.#onToggleCollapsed(event));
        });

        // Close button
        html.querySelectorAll("[data-action='close']").forEach(el => {
            el.addEventListener("click", () => this.close());
        });

        // Configure Sources button
        const sourceBtn = html.querySelector("[data-action='configureSources']");
        if (sourceBtn) {
            sourceBtn.addEventListener("click", () => new SourceConfig().render({ force: true }));
        }
    }

    /* -------------------------------------------- */
    /*  Event Handlers                              */
    /* -------------------------------------------- */

    /** Switch to a different tab. */
    #onClickTab(event) {
        const tab = event.currentTarget.dataset.tab;
        if (tab && tab !== this.#activeTab) {
            this.#activeTab = tab;
            this.#searchName = "";
            this.#activeFilters = [];
            this.render({ parts: ["tabs", "search", "types", "filters", "results"] });
        }
    }

    /** Toggle between Basic and Advanced mode. */
    #onToggleMode(event) {
        this.#mode = event.target.checked
            ? CompendiumBrowser.MODES.ADVANCED
            : CompendiumBrowser.MODES.BASIC;
        // Reset to first tab in the new mode
        this.#activeTab = (this.#mode === CompendiumBrowser.MODES.ADVANCED
            ? [...CompendiumBrowser.TABS, ...CompendiumBrowser.ADVANCED_TABS]
            : CompendiumBrowser.TABS)[0].tab;
        this.#searchName = "";
        this.#activeFilters = [];
        this.render({ parts: ["header", "tabs", "search", "types", "filters", "results"] });
    }

    /** Debounced search name change. */
    #onSearch(event) {
        this.#searchName = event.target.value;
        this.render({ parts: ["results"] });
    }

    /** Clear search and re-render. */
    #onClearSearch() {
        this.#searchName = "";
        this.render({ parts: ["search", "results"] });
    }

    /** Toggle type checkboxes. */
    #onSetType(event) {
        this.render({ parts: ["results"] });
    }

    /** Toggle filter set collapsed state. */
    #onToggleCollapsed(event) {
        const filterEl = event.currentTarget.closest("[data-filter-id]");
        if (filterEl) {
            filterEl.classList.toggle("collapsed");
        }
    }
}

/**
 * Register module settings and hooks.
 */
export function initCompendiumBrowser() {
    // Register source configuration setting
    game.settings.register("compendium-browser-bf", "packSourceConfiguration", {
        scope: "world",
        config: false,
        type: Object,
        default: {},
    });

    // Inject "Compendium Browser" button into compendium directory sidebar
    Hooks.on("renderCompendiumDirectory", (app, html, data) => {
        const button = document.createElement("button");
        button.className = "compendium-browser-btn";
        button.type = "button";
        button.innerHTML = '<i class="fas fa-search"></i> Compendium Browser';
        button.addEventListener("click", () => new CompendiumBrowser().render({ force: true }));
        html[0]?.querySelector(".header-actions")?.append(button);
    });
}
