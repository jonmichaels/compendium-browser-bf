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
        actions: {
            configureSources: CompendiumBrowser.#onConfigureSources,
            toggleMode: CompendiumBrowser.#onToggleMode,
        },
        form: {
            handler: CompendiumBrowser.#onHandleSubmit,
            closeOnSubmit: true,
        },
    };

    static PARTS = {
        header: {
            id: "header",
            classes: ["header"],
            template: "modules/compendium-browser-bf/templates/browser-header.hbs",
        },
        sidebar: {
            id: "sidebar",
            classes: ["sidebar", "flexcol"],
            template: "modules/compendium-browser-bf/templates/browser-sidebar.hbs",
            templates: ["modules/compendium-browser-bf/templates/browser-sidebar-filter-set.hbs"],
        },
        results: {
            id: "results",
            classes: ["results"],
            template: "modules/compendium-browser-bf/templates/browser-results.hbs",
            templates: ["modules/compendium-browser-bf/templates/browser-entry.hbs"],
            scrollable: [""],
        },
        footer: {
            id: "footer",
            classes: ["footer"],
            template: "modules/compendium-browser-bf/templates/browser-footer.hbs",
        },
        tabs: {
            id: "tabs",
            classes: ["tabs", "tabs-left"],
            template: "modules/compendium-browser-bf/templates/browser-tabs.hbs",
        },
    };

    static TABS = [
        { tab: "classes",     label: "compendium-browser-bf.Tabs.Classes",     icon: "fas fa-crown",    documentClass: "Item",  types: ["class"] },
        { tab: "subclasses",  label: "compendium-browser-bf.Tabs.Subclasses",  icon: "fas fa-layer-group", documentClass: "Item",  types: ["subclass"] },
        { tab: "lineages",    label: "compendium-browser-bf.Tabs.Lineages",    icon: "fas fa-users",    documentClass: "Item",  types: ["lineage"] },
        { tab: "heritages",   label: "compendium-browser-bf.Tabs.Heritages",   icon: "fas fa-tree",     documentClass: "Item",  types: ["heritage"] },
        { tab: "talents",     label: "compendium-browser-bf.Tabs.Talents",     icon: "fas fa-star",     documentClass: "Item",  types: ["talent"] },
        { tab: "backgrounds", label: "compendium-browser-bf.Tabs.Backgrounds", icon: "fas fa-scroll",   documentClass: "Item",  types: ["background"] },
        { tab: "items",       label: "compendium-browser-bf.Tabs.Items",       icon: "fas fa-suitcase", documentClass: "Item",  types: ["weapon", "armor", "gear", "tool", "container", "sundry", "currency", "consumable", "ammunition"] },
        { tab: "spells",      label: "compendium-browser-bf.Tabs.Spells",      icon: "fas fa-book",     documentClass: "Item",  types: ["spell"] },
        { tab: "monsters",    label: "compendium-browser-bf.Tabs.Monsters",    icon: "fas fa-skull",    documentClass: "Actor", types: ["npc"] },
        { tab: "vehicles",    label: "compendium-browser-bf.Tabs.Vehicles",    icon: "fas fa-ship",     documentClass: "Actor", types: ["vehicle"] },
    ];

    static ADVANCED_TABS = [
        { tab: "items",  label: "compendium-browser-bf.Tabs.AllItems",  documentClass: "Item",  types: null },
        { tab: "actors", label: "compendium-browser-bf.Tabs.AllActors", documentClass: "Actor", types: null },
    ];

    static MODES = { BASIC: 1, ADVANCED: 2 };
    static BATCHING = { MARGIN: 50, SIZE: 50 };
    static SEARCH_DELAY = 100;

    /* -------------------------------------------- */
    /*  Private Fields                              */
    /* -------------------------------------------- */

    /** @type {string} */
    #activeTab = "classes";

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

    /** @type {number|null} — minimum selection count */
    #minSelection = null;

    /** @type {number|null} — maximum selection count */
    #maxSelection = null;

    /** @type {string|null} — UUID of the last clicked entry for Shift-range */
    #lastClickedEntry = null;

    /** @type {boolean} — whether initial listeners have been attached */
    #listenersAttached = false;

    /** @type {Array<object>|null} — cached filter definitions for DOM value reading */
    #cachedFilterDefs = null;

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
        const fieldSet = new Set(["name", "img", "type", "system"]);
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

                // Name filter (case-insensitive prefix match)
                if (name && !entry.name.toLowerCase().startsWith(name.toLowerCase())) continue;

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

    /**
     * Open the browser in selection mode, returning a Promise that resolves
     * with the selected UUIDs when the user confirms.
     *
     * @param {object} [options]
     * @param {object} [options.filters]   — pre-configured filter values
     * @param {object} [options.selection] — { min, max } selection constraints
     * @param {object} [renderOptions]     — Foundry render options
     * @returns {Promise<string[]>}         — resolves with selected UUIDs
     */
    static async select(options = {}, renderOptions = {}) {
        return new Promise((resolve) => {
            const browser = new this({
                filters: options.filters || {},
                selection: options.selection || {},
            });
            browser.#resolveSelection = resolve;
            browser.render({ force: true }, renderOptions);
        });
    }

    /**
     * Open the browser in single-select mode. Convenience wrapper around select().
     *
     * @param {object} [options]
     * @param {object} [options.filters] — pre-configured filter values
     * @param {object} [renderOptions]   — Foundry render options
     * @returns {Promise<string[]>}       — resolves with single-selected UUID
     */
    static async selectOne(options = {}, renderOptions = {}) {
        return this.select({
            ...options,
            selection: { min: 1, max: 1 },
        }, renderOptions);
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
     * Process constructor options for selection mode.
     * @param {object} options
     */
    _configure(options) {
        super._configure(options);
        if (options.selection) {
            this.#minSelection = options.selection.min ?? null;
            this.#maxSelection = options.selection.max ?? null;
        }
    }

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
            case "header":   return this._prepareHeaderContext(context);
            case "tabs":     return this._prepareTabsContext(context);
            case "sidebar":  return this._prepareSidebarContext(context);
            case "results":  return this._prepareResultsContext(context);
            case "footer":   return this._prepareFooterContext(context);
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
     * Sidebar context: search name + type checkboxes + filter definitions.
     */
    async _prepareSidebarContext(context) {
        // Search
        context.name = this.#searchName;

        // Types
        const def = this.#activeTabDef;
        const types = def.types ?? [];
        context.types = types.map((typeKey, i) => ({
            "@key": typeKey,
            label: typeKey.charAt(0).toUpperCase() + typeKey.slice(1),
            chosen: i === 0,
        }));
        context.showTypes = types.length > 1;

        // Filters
        const typeSet = def.types ? new Set(def.types) : null;
        context.additional = getFilterDefinitions(def.documentClass, typeSet);
        this.#cachedFilterDefs = context.additional;

        return context;
    }

    /**
     * Read current filter values from the DOM sidebar.
     * @returns {Array<object>} — filter definitions with values populated from DOM state
     */
    #readFilterValues() {
        const filters = this.#cachedFilterDefs || [];
        const html = this.element;
        if (!html) return filters;

        for (const filter of filters) {
            if (filter.type === "boolean") {
                const el = html.querySelector(`input[name="additional.${filter.key}"]`);
                filter.value = el?.checked || false;
            } else if (filter.type === "range") {
                const minEl = html.querySelector(`input[name="additional.${filter.key}.min"]`);
                const maxEl = html.querySelector(`input[name="additional.${filter.key}.max"]`);
                filter.value = {
                    min: minEl?.value || undefined,
                    max: maxEl?.value || undefined,
                };
                // Parse numbers for numeric range filters
                if (filter._transform === "number") {
                    if (filter.value.min) filter.value.min = Number(filter.value.min);
                    if (filter.value.max) filter.value.max = Number(filter.value.max);
                }
            } else if (filter.type === "set") {
                const checked = {};
                const filterEl = html.querySelector(`[data-filter-id="${filter.key}"]`);
                if (filterEl) {
                    filterEl.querySelectorAll("input[type='hidden']").forEach(el => {
                        const parts = el.name.split(".");
                        const choiceKey = parts[parts.length - 1];
                        const val = parseInt(el.value, 10) || 0;
                        if (choiceKey && val !== 0) {
                            checked[choiceKey] = val;  // 1 = include, -1 = exclude
                        }
                    });
                }
                filter.value = Object.keys(checked).length > 0 ? checked : null;
            }
        }
        return filters;
    }

    /**
     * Results context: kick off async fetch, show loading state.
     */
    async _prepareResultsContext(context) {
        const def = this.#activeTabDef;

        // Read current filter values from the DOM sidebar
        const filters = this.#readFilterValues();

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
        context.tabLabel = def.label;
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
        // Source from document data. Black Flag stores source as:
        // - Spells: system.source is a SetField (array of strings)
        // - Other items: may have system.source.value or be a plain string
        const src = entry.system?.source;
        let source = "";
        if (typeof src === "string") source = src;
        else if (Array.isArray(src)) source = src.join(", ");
        else if (src?.value) source = src.value;
        return {
            ...entry,
            name: entry.name,
            img: entry.img,
            uuid: entry.uuid,
            source,
            subtitle: game.i18n.localize(`TYPES.Item.${entry.type}`) !== `TYPES.Item.${entry.type}` ? game.i18n.format(`TYPES.Item.${entry.type}`) : (entry.type.charAt(0).toUpperCase() + entry.type.slice(1)),
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

        // Validate min/max selection
        if (this.#displaySelection) {
            if (this.#minSelection != null && this.#selected.size < this.#minSelection) {
                context.invalid = true;
                context.invalidTooltip = game.i18n.format(
                    "compendium-browser-bf.Footer.Minimum",
                    { min: this.#minSelection }
                );
            }
            if (this.#maxSelection && this.#selected.size > this.#maxSelection) {
                context.invalid = true;
                context.invalidTooltip = game.i18n.format(
                    "compendium-browser-bf.Footer.Maximum",
                    { max: this.#maxSelection }
                );
            }
        }

        context.partId = "footer";
        return context;
    }

    /* -------------------------------------------- */
    /*  Lifecycle                                    */
    /* -------------------------------------------- */

    /**
     * Inject the Configure Sources gear button into the window chrome,
     * matching dnd5e's approach (_renderFrame).
     * @override
     */
    async _renderFrame(options) {
        const frame = await super._renderFrame(options);
        if (game.user.isGM) {
            frame.querySelector('[data-action="close"]')?.insertAdjacentHTML("beforebegin", `
                <button type="button" class="header-control configure-sources fas fa-cog"
                        data-action="configureSources"
                        data-tooltip aria-label="${game.i18n.localize("compendium-browser-bf.ConfigureSources")}"></button>
            `);
        }
        return frame;
    }

    _onRender(context, options) {
        super._onRender(context, options);

        // Static listeners — attach only once (tab clicks, mode toggle, search, etc.)
        if (!this.#listenersAttached) {
            this.#listenersAttached = true;
            this.#attachStaticListeners();
        }

        // Results rendering — run every time the results part is rendered
        if (!options.parts || options.parts.includes("results")) {
            this.#attachResults();
        }
    }

    /**
     * Attach static DOM listeners that survive partial re-renders.
     * These elements are not replaced during tab switches or filter changes.
     */
    #attachStaticListeners() {
        const html = this.element;

        // Mode toggle + Configure Sources are handled by ApplicationV2 actions
        // (registered in DEFAULT_OPTIONS.actions — no manual listeners needed)

        // Search input (debounced)
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

        // Filter value changes
        const sidebarEl = html.querySelector(".sidebar");
        if (sidebarEl) {
            // 3-state filter clicks (off → include → exclude → off)
            sidebarEl.addEventListener("click", (event) => {
                const stateEl = event.target.closest(".filter-state");
                if (stateEl) {
                    event.preventDefault();
                    this.#onFilterStateClick(stateEl);
                }
            });

            // Re-render on filter change (sidebar is now a single part)
            sidebarEl.addEventListener("change", (event) => {
                if (event.target.closest(".sidebar")) {
                    this.#onFilterChange(event);
                }
            });
        }

        // Close button
        html.querySelectorAll("[data-action='close']").forEach(el => {
            el.addEventListener("click", () => this.close());
        });
    }

    /**
     * Attach results-area listeners and kick off async fetch+render.
     * Called on every results re-render (tab switch, filter change, search).
     */
    #attachResults() {
        const resultsEl = this.element.querySelector(".browser-results");
        if (!resultsEl) return;

        // Remove old scroll listener by cloning the node (simple approach)
        const newEl = resultsEl.cloneNode(true);
        resultsEl.parentNode.replaceChild(newEl, resultsEl);

        // Scroll listener for lazy batch loading
        newEl.addEventListener("scroll", (event) => this.#onScrollResults(event), { passive: true });

        // Entry click delegation (only in selection mode)
        if (this.#displaySelection) {
            newEl.addEventListener("click", (event) => {
                const entryEl = event.target.closest("[data-entry-uuid]");
                if (!entryEl) return;
                if (event.target.closest("[data-action='openLink']")) return;
                this.#onClickEntryDelegated(entryEl, event);
            });

            newEl.addEventListener("change", (event) => {
                if (event.target.name === "selected") {
                    const entryEl = event.target.closest("[data-entry-uuid]");
                    if (entryEl) this.#onChangeEntryDelegated(entryEl, event.target);
                }
            });
        }

        // Entry click to open document
        newEl.addEventListener("click", (event) => {
            const openLink = event.target.closest("[data-action='openLink']");
            if (openLink) {
                const entryEl = openLink.closest("[data-entry-uuid]");
                if (entryEl) {
                    const uuid = entryEl.dataset.entryUuid;
                    if (uuid) fromUuid(uuid).then(doc => doc?.sheet?.render(true));
                }
            }
        });

        // Kick off async fetch + render
        this.#renderResults(newEl);
    }

    /* -------------------------------------------- */
    /*  Event Handlers                              */
    /* -------------------------------------------- */

    /**
     * ApplicationV2 tab change hook. Fires when user clicks a tab button.
     * Re-renders tab-dependent parts (search, types, filters, results).
     */
    changeTab(tab, group, options = {}) {
        super.changeTab(tab, group, options);
        this.#activeTab = tab;
        this.#searchName = "";
        this.render({ parts: ["tabs", "sidebar", "results"] });
    }

    /**
     * Handle mode toggle switch (Advanced <-> Basic).
     * @this {CompendiumBrowser}
     */
    static #onToggleMode(event, target) {
        this.#mode = target.checked
            ? CompendiumBrowser.MODES.ADVANCED
            : CompendiumBrowser.MODES.BASIC;
        // Reset to first tab in the new mode
        this.#activeTab = (this.#mode === CompendiumBrowser.MODES.ADVANCED
            ? [...CompendiumBrowser.TABS, ...CompendiumBrowser.ADVANCED_TABS]
            : CompendiumBrowser.TABS)[0].tab;
        this.#searchName = "";
        this.render({ parts: ["header", "tabs", "sidebar", "results"] });
    }

    /**
     * Open the Configure Sources dialog.
     * @this {CompendiumBrowser}
     */
    static #onConfigureSources(event, target) {
        new SourceConfig().render({ force: true });
    }

    /** Debounced search name change. */
    #onSearch(event) {
        this.#searchName = event.target.value;
        this.render({ parts: ["results"] });
    }

    /** Clear search and re-render. */
    #onClearSearch() {
        this.#searchName = "";
        this.render({ parts: ["sidebar", "results"] });
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

    /** Re-render results when a filter value changes. */
    #onFilterChange(event) {
        this.render({ parts: ["results"] });
    }

    /**
     * Cycle 3-state filter: 0 (off) → 1 (include/green) → -1 (exclude/red) → 0
     * Updates the hidden input value and data-value attribute.
     */
    #onFilterStateClick(stateEl) {
        let value = parseInt(stateEl.dataset.value || "0", 10);
        value = value >= 1 ? -1 : value <= -1 ? 0 : 1;  // 0→1, 1→-1, -1→0
        stateEl.dataset.value = value;
        // Update the associated hidden input for form/reading
        const input = stateEl.parentElement?.querySelector("input[name]");
        if (input) input.value = value;
        this.#onFilterChange();
    }

    /** Click an entry row to toggle selection with Shift-range support. */
    #onClickEntryDelegated(entryEl, event) {
        if (!this.#displaySelection) return;

        const uuid = entryEl.dataset.entryUuid;
        const isShift = event.shiftKey;

        if (isShift && this.#lastClickedEntry) {
            // Shift-range select: select all entries between last clicked and this one
            const allUUIDs = this.#allResults.map(e => e.uuid);
            const lastIdx = allUUIDs.indexOf(this.#lastClickedEntry);
            const thisIdx = allUUIDs.indexOf(uuid);

            if (lastIdx >= 0 && thisIdx >= 0) {
                const start = Math.min(lastIdx, thisIdx);
                const end = Math.max(lastIdx, thisIdx);
                for (let i = start; i <= end; i++) {
                    this.#selected.add(allUUIDs[i]);
                }
            }
        } else {
            // Toggle single entry
            if (this.#selected.has(uuid)) {
                this.#selected.delete(uuid);
            } else {
                // Respect max selection
                if (!this.#maxSelection || this.#selected.size < this.#maxSelection) {
                    this.#selected.add(uuid);
                }
            }
        }

        this.#lastClickedEntry = uuid;
        this.render({ parts: ["results", "footer"] });
    }

    /** Checkbox change on an entry row. */
    #onChangeEntryDelegated(entryEl, checkbox) {
        if (!this.#displaySelection) return;

        const uuid = entryEl.dataset.entryUuid;
        if (checkbox.checked) {
            this.#selected.add(uuid);
        } else {
            this.#selected.delete(uuid);
        }

        this.#lastClickedEntry = uuid;
        this.render({ parts: ["footer"] });
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
        html.querySelector(".header-actions")?.append(button);
    });
}
