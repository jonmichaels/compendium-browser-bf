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
    /*  Initialization                              */
    /* -------------------------------------------- */
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
