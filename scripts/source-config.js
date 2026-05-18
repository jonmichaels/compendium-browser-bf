const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/**
 * ApplicationV2 dialog for GM-configurable compendium source selection.
 * Shows all compendium packs with enable/disable checkboxes.
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
        position: { width: 500, height: 500 },
        form: {
            handler: SourceConfig.#onSubmit,
            closeOnSubmit: true,
        },
    };

    static PARTS = {
        form: {
            template: "modules/compendium-browser-bf/templates/source-config.hbs",
        },
    };

    /* -------------------------------------------- */

    /**
     * Prepare pack list grouped by document type.
     */
    async _prepareContext(options) {
        const config = game.settings.get("compendium-browser-bf", "packSourceConfiguration") || {};

        const packs = game.packs.map(pack => ({
            id: pack.metadata.id,
            label: pack.metadata.label,
            type: pack.metadata.type,
            enabled: config[pack.metadata.id] !== false,
        }));

        // Group by type
        const items = packs.filter(p => p.type === "Item").sort((a, b) => a.label.localeCompare(b.label));
        const actors = packs.filter(p => p.type === "Actor").sort((a, b) => a.label.localeCompare(b.label));
        const journals = packs.filter(p => p.type === "JournalEntry").sort((a, b) => a.label.localeCompare(b.label));
        const other = packs.filter(p => !["Item", "Actor", "JournalEntry"].includes(p.type))
            .sort((a, b) => a.label.localeCompare(b.label));

        return {
            groups: [
                { label: "Items", packs: items },
                { label: "Actors", packs: actors },
                ...(journals.length ? [{ label: "Journals", packs: journals }] : []),
                ...(other.length ? [{ label: "Other", packs: other }] : []),
            ].filter(g => g.packs.length > 0),
        };
    }

    /* -------------------------------------------- */

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
