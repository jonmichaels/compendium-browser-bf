const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

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
     * Filters context: active filter definitions and values.
     */
    async _prepareFiltersContext(context) {
        // Filter definitions come from compendium-browser-filters.js (Task 6).
        // For now, return empty filter list so the UI renders without errors.
        context.additional = [];
        context.partId = "filters";
        return context;
    }

    /**
     * Results context: compendium entries after fetch.
     */
    async _prepareResultsContext(context) {
        // Results are fetched lazily after initial render (Task 7).
        // For now, show a hint that no results are loaded yet.
        context.hint = "Select a tab to browse compendium content.";
        context.results = [];
        context.displaySelection = this.#displaySelection;
        context.partId = "results";
        return context;
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
        html[0].querySelector(".header-actions")?.append(button);
    });
}
