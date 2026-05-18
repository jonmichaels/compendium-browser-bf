/**
 * Filter definitions for the Black Flag compendium browser.
 *
 * Each filter definition describes a filterable property on a compendium
 * index entry. Filters are used both for rendering the sidebar UI (choices)
 * and for filtering fetched results (keyPath matching).
 *
 * @typedef {object} FilterDef
 * @property {string}  label          — i18n key for the filter label
 * @property {"boolean"|"range"|"set"} type   — filter UI type
 * @property {string}  keyPath        — dot-separated path on the compendium index entry
 * @property {object}  [config]       — configuration for choices/range
 * @property {string}  [config.con]   — CONFIG.BlackFlag key for set choices (resolved at runtime)
 * @property {string}  [config.fn]    — CONFIG.BlackFlag function name for set choices (e.g. "spellCircles")
 * @property {number}  [config.min]   — min value for range filter
 * @property {number}  [config.max]   — max value for range filter
 * @property {string}  [transform]    — transformation to apply before comparison ("number", "boolean")
 */

/* ------------------------------------------------------------------ */
/*  Filter Definitions                                                */
/* ------------------------------------------------------------------ */

/**
 * Item type → Map<filterKey, FilterDef>
 * Each Map is keyed by a short filter identifier (e.g. "circle", "school").
 */
const ITEM_FILTERS = {
    /* ----- Features ----- */
    feature: new Map([
        ["category", {
            label: "compendium-browser-bf.Filters.Category",
            type: "set",
            keyPath: "system.type.category",
            config: { con: "featureCategories" },
        }],
    ]),

    /* ----- Spells ----- */
    spell: new Map([
        ["circle", {
            label: "compendium-browser-bf.Filters.Level",
            type: "range",
            keyPath: "system.circle.base",
            config: { min: 0, max: 9 },
            transform: "number",
        }],
        ["school", {
            label: "compendium-browser-bf.Filters.School",
            type: "set",
            keyPath: "system.school",
            config: { con: "spellSchools" },
        }],
        ["source", {
            label: "BF.SPELL.FIELDS.source.label",  // Black Flag's own i18n
            type: "set",
            keyPath: "system.source",
            config: { con: "spellSources" },
        }],
        ["tags", {
            label: "BF.SPELL.FIELDS.tags.label",
            type: "set",
            keyPath: "system.tags",
            config: { con: "spellTags" },
        }],
    ]),

    /* ----- Weapons ----- */
    weapon: new Map([
        ["weaponType", {
            label: "BF.WEAPON.FIELDS.type.value.label",
            type: "set",
            keyPath: "system.type.value",
            config: { con: "weaponTypes" },
        }],
        ["properties", {
            label: "compendium-browser-bf.Filters.Properties",
            type: "set",
            keyPath: "system.properties",
            config: { con: "weaponProperties" },  // NOTE: plain array, not .localized object
        }],
    ]),

    /* ----- Gear ----- */
    gear: new Map([
        ["rarity", {
            label: "compendium-browser-bf.Filters.Rarity",
            type: "set",
            keyPath: "system.rarity",
            config: { con: "rarities", blank: "No Rarity" },
        }],
        ["price", {
            label: "compendium-browser-bf.Filters.Price",
            type: "range",
            keyPath: "system.price.value",
            config: { min: 0, max: 100000 },
            transform: "number",
        }],
        ["attunement", {
            label: "compendium-browser-bf.Filters.Attunement",
            type: "boolean",
            keyPath: "system.attunement.value",
            transform: "boolean",
        }],
    ]),

    /* ----- Armor ----- */
    armor: new Map([
        ["rarity", {
            label: "compendium-browser-bf.Filters.Rarity",
            type: "set",
            keyPath: "system.rarity",
            config: { con: "rarities", blank: "No Rarity" },
        }],
        ["price", {
            label: "compendium-browser-bf.Filters.Price",
            type: "range",
            keyPath: "system.price.value",
            config: { min: 0, max: 100000 },
            transform: "number",
        }],
        ["attunement", {
            label: "compendium-browser-bf.Filters.Attunement",
            type: "boolean",
            keyPath: "system.attunement.value",
            transform: "boolean",
        }],
    ]),

    /* ----- Tools ----- */
    tool: new Map([
        ["rarity", {
            label: "compendium-browser-bf.Filters.Rarity",
            type: "set",
            keyPath: "system.rarity",
            config: { con: "rarities", blank: "No Rarity" },
        }],
        ["price", {
            label: "compendium-browser-bf.Filters.Price",
            type: "range",
            keyPath: "system.price.value",
            config: { min: 0, max: 100000 },
            transform: "number",
        }],
        ["attunement", {
            label: "compendium-browser-bf.Filters.Attunement",
            type: "boolean",
            keyPath: "system.attunement.value",
            transform: "boolean",
        }],
    ]),

    /* ----- Containers ----- */
    container: new Map([
        ["rarity", {
            label: "compendium-browser-bf.Filters.Rarity",
            type: "set",
            keyPath: "system.rarity",
            config: { con: "rarities", blank: "No Rarity" },
        }],
        ["price", {
            label: "compendium-browser-bf.Filters.Price",
            type: "range",
            keyPath: "system.price.value",
            config: { min: 0, max: 100000 },
            transform: "number",
        }],
    ]),

    /* ----- Sundry ----- */
    sundry: new Map([
        ["rarity", {
            label: "compendium-browser-bf.Filters.Rarity",
            type: "set",
            keyPath: "system.rarity",
            config: { con: "rarities", blank: "No Rarity" },
        }],
        ["price", {
            label: "compendium-browser-bf.Filters.Price",
            type: "range",
            keyPath: "system.price.value",
            config: { min: 0, max: 100000 },
            transform: "number",
        }],
    ]),

    /* ----- Currency ----- */
    currency: new Map([
        ["price", {
            label: "compendium-browser-bf.Filters.Price",
            type: "range",
            keyPath: "system.price.value",
            config: { min: 0, max: 100000 },
            transform: "number",
        }],
    ]),

    /* ----- Consumables ----- */
    consumable: new Map([
        ["category", {
            label: "compendium-browser-bf.Filters.Category",
            type: "set",
            keyPath: "system.type.category",
            config: { con: "consumableCategories" },
        }],
        ["rarity", {
            label: "compendium-browser-bf.Filters.Rarity",
            type: "set",
            keyPath: "system.rarity",
            config: { con: "rarities", blank: "No Rarity" },
        }],
        ["attunement", {
            label: "compendium-browser-bf.Filters.Attunement",
            type: "boolean",
            keyPath: "system.attunement.value",
            transform: "boolean",
        }],
    ]),

    /* ----- Talents ----- */
    talent: new Map([
        ["category", {
            label: "compendium-browser-bf.Filters.Category",
            type: "set",
            keyPath: "system.type.category",
            config: { con: "featureCategories" },
        }],
    ]),

    // class, subclass, lineage, heritage, background — no extra filters
};

/**
 * Actor type → Map<filterKey, FilterDef>
 */
const ACTOR_FILTERS = new Map([
    ["cr", {
        label: "compendium-browser-bf.Filters.CR",
        type: "range",
        keyPath: "system.attributes.cr",
        config: { min: 0, max: 30 },
        transform: "number",
    }],
    ["size", {
        label: "compendium-browser-bf.Filters.Size",
        type: "set",
        keyPath: "system.traits.size",
        config: { con: "sizes" },
    }],
    ["creatureType", {
        label: "compendium-browser-bf.Filters.CreatureType",
        type: "set",
        keyPath: "system.traits.type.value",
        config: { con: "creatureTypes" },
    }],
]);

/* ------------------------------------------------------------------ */
/*  Runtime Resolution                                                */
/* ------------------------------------------------------------------ */

/**
 * Resolve filter choices from CONFIG.BlackFlag at runtime.
 *
 * Handles three cases:
 * 1. `config.fn` — call a CONFIG function (e.g. spellCircles())
 * 2. `config.con` with `.localized` — standard localized object
 * 3. `config.con` without `.localized` — plain array (e.g. weaponProperties)
 *
 * @param {FilterDef} def — filter definition with config.con or config.fn
 * @returns {object<string,string>|null} choices object { key: label }, or null if n/a
 */
function resolveChoices(def) {
    const cfg = def.config;
    if (!cfg) return null;

    // Function call (e.g. spellCircles)
    if (cfg.fn && typeof CONFIG.BlackFlag[cfg.fn] === "function") {
        const result = CONFIG.BlackFlag[cfg.fn]();
        return result;  // { 0: "Cantrip", 1: "1st Level", ... }
    }

    // Standard CONFIG key
    if (cfg.con) {
        const con = CONFIG.BlackFlag[cfg.con];
        if (!con) return null;

        // Has .localized (normal case)
        if (con.localized) return con.localized;

        // Plain array (e.g. weaponProperties) — build keyed object
        if (Array.isArray(con)) {
            const obj = {};
            for (const val of con) {
                obj[val] = val;  // Capitalize? Use i18n? For now, the raw string
            }
            return obj;
        }

        // Plain object — use as-is
        return con;
    }

    return null;
}

/* ------------------------------------------------------------------ */
/*  Public API                                                        */
/* ------------------------------------------------------------------ */

/**
 * Get all filter definitions applicable to a document class and its types,
 * with CONFIG choices resolved at runtime.
 *
 * @param {string} documentClass — "Item" or "Actor"
 * @param {Set<string>} [types]  — restrict to these types (null = all)
 * @returns {Array<object>}       — array of resolved filter objects for template rendering
 */
export function getFilterDefinitions(documentClass, types) {
    if (documentClass === "Actor") {
        return resolveAll(ACTOR_FILTERS);
    }

    // Merge filters for all matching item types
    const merged = new Map();
    const typeSet = types && types.size > 0 ? types : null;

    for (const [typeKey, filterMap] of Object.entries(ITEM_FILTERS)) {
        if (typeSet && !typeSet.has(typeKey)) continue;
        for (const [key, def] of filterMap) {
            if (!merged.has(key)) merged.set(key, def);
        }
    }

    return resolveAll(merged);
}

/**
 * Resolve all filter definitions in a Map to template-ready objects.
 */
function resolveAll(filterMap) {
    const result = [];
    for (const [key, def] of filterMap) {
        const resolved = {
            key,
            label: def.label,
            type: def.type,
            config: { ...def.config },
            value: null,  // filled by _prepareFiltersContext from active filter state
            locked: {},
        };

        // Resolve choices for sets and range labels
        if (def.type === "set") {
            resolved.config.choices = resolveChoices(def);
        }
        if (def.type === "range" && def.config.fn) {
            // For range filters where choices come from a function (spellCircles)
            resolved.config.choices = resolveChoices(def);
        }

        // Store the raw def for filtering logic
        resolved._keyPath = def.keyPath;
        resolved._transform = def.transform || null;

        result.push(resolved);
    }
    return result;
}

/**
 * Apply a single filter to a compendium index entry.
 *
 * @param {object} entry  — compendium index entry
 * @param {object} filter — resolved filter object with _keyPath and _transform
 * @returns {boolean}      — true if the entry passes the filter
 */
export function applyFilter(entry, filter) {
    const rawValue = foundry.utils.getProperty(entry, filter._keyPath);
    if (rawValue === undefined || rawValue === null) {
        // If the entry doesn't have this path, skip the filter (pass)
        return true;
    }

    const transform = filter._transform;

    switch (filter.type) {
        case "boolean": {
            // true if the value is truthy / non-empty string
            if (transform === "boolean") {
                return !!rawValue && rawValue !== "";
            }
            return !!rawValue;
        }

        case "range": {
            let num = transform === "number" ? Number(rawValue) : rawValue;
            if (isNaN(num)) return true;  // can't compare, pass
            const val = filter.value || {};
            if (val.min !== undefined && val.min !== "" && num < Number(val.min)) return false;
            if (val.max !== undefined && val.max !== "" && num > Number(val.max)) return false;
            return true;
        }

        case "set": {
            if (!filter.value) return true;  // nothing selected, pass all
            // Handle _blank (e.g. "No Rarity") - matches empty/falsy values
            const hasBlank = filter.value._blank;
            // Handle SetField values (arrays) vs scalar values
            if (Array.isArray(rawValue)) {
                if (rawValue.length === 0 && hasBlank) return true;
                // At least one value must match (for SetField source/tags)
                for (const val of Object.keys(filter.value)) {
                    if (val === "_blank") continue;
                    if (filter.value[val] && rawValue.includes(val)) return true;
                }
                return false;
            }
            // Empty string check
            if (!rawValue || rawValue === "") return !!hasBlank;
            // Scalar check
            const scalarMatch = !!filter.value[rawValue];
            if (scalarMatch) return true;
            return false;
        }

        default:
            return true;
    }
}

/**
 * Apply all active filters to a compendium index entry.
 *
 * @param {object} entry   — compendium index entry
 * @param {Array<object>} filters — resolved filter objects with values set
 * @returns {boolean}       — true if the entry passes all filters
 */
export function applyAllFilters(entry, filters) {
    for (const filter of filters) {
        if (!applyFilter(entry, filter)) return false;
    }
    return true;
}
