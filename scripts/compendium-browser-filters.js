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
            label: "compendium-browser-bf.Filters.MagicSource",
            type: "set",
            keyPath: "system.source",
            config: { con: "spellSources" },
        }],
        ["tags", {
            label: "compendium-browser-bf.Filters.Tags",
            type: "set",
            keyPath: "system.tags",
            config: { con: "spellTags" },
        }],
    ]),

    /* ----- Weapons ----- */
    weapon: new Map([]),

    /* ----- Gear ----- */
    gear: new Map([
        ["attunement", {
            label: "compendium-browser-bf.Filters.Attunement",
            type: "boolean",
            keyPath: "system.attunement.value",
            transform: "boolean",
        }],
        ["price", {
            label: "compendium-browser-bf.Filters.Price",
            type: "range",
            keyPath: "system.price.value",
            config: { min: 0, max: 100000 },
            transform: "number",
        }],
        ["rarity", {
            label: "compendium-browser-bf.Filters.Rarity",
            type: "set",
            keyPath: "system.rarity",
            config: { con: "rarities", prepend: { mundane: "Mundane" } },
        }],
    ]),

    /* ----- Armor ----- */
    armor: new Map([
        ["attunement", {
            label: "compendium-browser-bf.Filters.Attunement",
            type: "boolean",
            keyPath: "system.attunement.value",
            transform: "boolean",
        }],
        ["price", {
            label: "compendium-browser-bf.Filters.Price",
            type: "range",
            keyPath: "system.price.value",
            config: { min: 0, max: 100000 },
            transform: "number",
        }],
        ["rarity", {
            label: "compendium-browser-bf.Filters.Rarity",
            type: "set",
            keyPath: "system.rarity",
            config: { con: "rarities" },
        }],
    ]),

    /* ----- Tools ----- */
    tool: new Map([
        ["attunement", {
            label: "compendium-browser-bf.Filters.Attunement",
            type: "boolean",
            keyPath: "system.attunement.value",
            transform: "boolean",
        }],
        ["price", {
            label: "compendium-browser-bf.Filters.Price",
            type: "range",
            keyPath: "system.price.value",
            config: { min: 0, max: 100000 },
            transform: "number",
        }],
        ["rarity", {
            label: "compendium-browser-bf.Filters.Rarity",
            type: "set",
            keyPath: "system.rarity",
            config: { con: "rarities" },
        }],
    ]),

    /* ----- Containers ----- */
    container: new Map([
        ["price", {
            label: "compendium-browser-bf.Filters.Price",
            type: "range",
            keyPath: "system.price.value",
            config: { min: 0, max: 100000 },
            transform: "number",
        }],
        ["rarity", {
            label: "compendium-browser-bf.Filters.Rarity",
            type: "set",
            keyPath: "system.rarity",
            config: { con: "rarities" },
        }],
    ]),

    /* ----- Sundry ----- */
    sundry: new Map([
        ["price", {
            label: "compendium-browser-bf.Filters.Price",
            type: "range",
            keyPath: "system.price.value",
            config: { min: 0, max: 100000 },
            transform: "number",
        }],
        ["rarity", {
            label: "compendium-browser-bf.Filters.Rarity",
            type: "set",
            keyPath: "system.rarity",
            config: { con: "rarities" },
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
        ["attunement", {
            label: "compendium-browser-bf.Filters.Attunement",
            type: "boolean",
            keyPath: "system.attunement.value",
            transform: "boolean",
        }],
        ["rarity", {
            label: "compendium-browser-bf.Filters.Rarity",
            type: "set",
            keyPath: "system.rarity",
            config: { con: "rarities" },
        }],
    ]),

    /* ----- Talents ----- */
    talent: new Map([
        ["category", {
            label: "compendium-browser-bf.Filters.Category",
            type: "set",
            keyPath: "system.type.category",
        }],
    ]),

    // lineage, heritage, background — no extra filters (darkvision filter researched 2026-05-19,
    // saved to ~/Documents/jon_vault/research/2026-05-19_darkvision-filter-compendium-browser.md)
    // Black Flag stores parent class at system.identifier.class on the full document,
    // which is NOT in the compendium index (only system.container is indexed).
    // Use _documentCheck to load full subclass documents for filtering.
    subclass: new Map([
        ["class", {
            label: "Classes",
            type: "set",
            _documentCheck(doc, filterValue) {
                const classId = doc?.system?.identifier?.class;
                if (!classId || !filterValue) return true;  // no class or filter off — pass
                const state = filterValue[classId] || 0;
                const hasIncludes = Object.values(filterValue).some(v => v === 1);
                if (state === -1) return false;               // explicitly excluded
                if (hasIncludes && state !== 1) return false; // include-only mode — not included
                return true;
            },
        }],
    ]),

    // lineage, heritage, background — no extra filters
};

/**
 * Actor type → Map<filterKey, FilterDef>
 */
const ACTOR_FILTERS = {
    /* ----- Monsters ----- */
    npc: new Map([
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
    ]),

    /* ----- Vehicles ----- */
    vehicle: new Map([
        ["size", {
            label: "compendium-browser-bf.Filters.Size",
            type: "set",
            keyPath: "system.traits.size",
            config: { con: "sizes" },
        }],
    ]),
};

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

    // Function call (e.g. spellCircles) or externally-resolved (e.g. classIdentifiers set by _prepareSidebarContext)
    if (cfg.fn && typeof CONFIG.BlackFlag?.[cfg.fn] === "function") {
        const result = CONFIG.BlackFlag[cfg.fn]();
        return mergePrepend(result, cfg.prepend);
    }

    // Standard CONFIG key
    if (cfg.con) {
        const con = CONFIG.BlackFlag[cfg.con];
        if (!con) return null;

        let result;

        // Has .localized (normal case)
        if (con.localized) result = con.localized;

        // Plain array (e.g. weaponProperties) — build keyed object
        else if (Array.isArray(con)) {
            result = {};
            for (const val of con) {
                result[val] = val;  // Capitalize? Use i18n? For now, the raw string
            }
        }

        // Plain object — use as-is
        else result = con;

        return mergePrepend(result, cfg.prepend);
    }

    return null;
}

/**
 * Merge prepend entries into a choices object, preserving insertion order.
 * Prepend entries appear first, then the base choices.
 * Keys in prepend that already exist in base are skipped (prepend wins).
 */
function mergePrepend(base, prepend) {
    if (!prepend) return base;
    const merged = { ...prepend };
    if (base) {
        for (const [k, v] of Object.entries(base)) {
            if (!(k in merged)) merged[k] = v;
        }
    }
    return merged;
}

/* ------------------------------------------------------------------ */
/*  Public API                                                        */
/* ------------------------------------------------------------------ */

/**
 * Create a standard single-choice 3-state _documentCheck handler.
 *
 * This encapsulates the common pattern: filterValue has one key whose
 * value is 0 (off), 1 (include), or -1 (exclude). Pass a checkFn that
 * returns true if the document possesses the trait.
 *
 * Usage:
 *   _documentCheck: docCheckFilter(doc => doc.system.advancement
 *       .byType("trait").some(a => a.configuration.grants?.has("darkvision")))
 *
 * @param {function} checkFn — (doc) => boolean — true if the doc has the trait
 * @returns {function} _documentCheck handler
 */
export function docCheckFilter(checkFn) {
    return function(doc, filterValue) {
        if (!filterValue) return true;
        const entries = Object.entries(filterValue).filter(([, v]) => v !== 0);
        if (entries.length === 0) return true;  // no active filter — pass all
        const [key, state] = entries[0];        // first active key wins
        const has = checkFn(doc);
        if (state === 1) return has;            // include: must have
        if (state === -1) return !has;          // exclude: must NOT have
        return true;
    };
}

/**
 * Get all filter definitions applicable to a document class and its types,
 * with CONFIG choices resolved at runtime.
 *
 * @param {string} documentClass — "Item" or "Actor"
 * @param {Set<string>} [types]  — restrict to these types (null = all)
 * @returns {Array<object>}       — array of resolved filter objects for template rendering
 */
export function getFilterDefinitions(documentClass, types) {
    const typeSet = types && types.size > 0 ? types : null;

    if (documentClass === "Actor") {
        // Merge filters for all matching actor types (same pattern as items)
        const merged = new Map();
        for (const [typeKey, filterMap] of Object.entries(ACTOR_FILTERS)) {
            if (typeSet && !typeSet.has(typeKey)) continue;
            for (const [key, def] of filterMap) {
                if (!merged.has(key)) merged.set(key, def);
            }
        }
        return resolveAll(merged);
    }

    // Merge filters for all matching item types
    const merged = new Map();

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
        resolved._keyPath = def.keyPath || null;
        resolved._transform = def.transform || null;

        // Preserve _documentCheck for filters that need full documents (e.g., BF class filter)
        if (def._documentCheck) {
            resolved._documentCheck = def._documentCheck;
        }

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

    const transform = filter._transform;

    switch (filter.type) {
        case "boolean": {
            // hasSpellcasting 3-state pattern: 0=off 1=include(spellcasting) -1=exclude(spellcasting)
            if (filter.config?.notValue !== undefined) {
                const val = filter.value || 0;
                if (val === 0) return true;                        // filter off — pass all
                const has = rawValue !== null && rawValue !== undefined
                    && rawValue !== "" && rawValue !== filter.config.notValue;
                return val === 1 ? has : !has;                    // 1=include, -1=exclude
            }
            // For regular boolean filters, undefined/null = no value = pass
            if (rawValue === undefined || rawValue === null) return true;
            // true if the value is truthy / non-empty string
            if (transform === "boolean") {
                return !!rawValue && rawValue !== "";
            }
            return !!rawValue;
        }

        case "range": {
            if (rawValue === undefined || rawValue === null) return true;
            let num = transform === "number" ? Number(rawValue) : rawValue;
            if (isNaN(num)) return true;  // can't compare, pass
            const val = filter.value || {};
            if (val.min !== undefined && val.min !== "" && num < Number(val.min)) return false;
            if (val.max !== undefined && val.max !== "" && num > Number(val.max)) return false;
            return true;
        }

        case "set": {
            if (rawValue === undefined || rawValue === null) return true;
            if (!filter.value) return true;  // nothing selected, pass all

            // Separate includes (value=1) and excludes (value=-1)
            const includes = {};
            const excludes = {};
            let hasIncludes = false;
            let hasExcludes = false;
            for (const [key, val] of Object.entries(filter.value)) {
                if (key === "_blank" || key === "mundane") continue;  // handled via _blank mapping
                if (val === 1) { includes[key] = true; hasIncludes = true; }
                else if (val === -1) { excludes[key] = true; hasExcludes = true; }
            }

            // Map "mundane" key to _blank — Black Flag stores mundane items
            // with an empty/null rarity; "Mundane" is just a display label.
            if (filter.value.mundane !== undefined && filter.value._blank === undefined) {
                filter.value._blank = filter.value.mundane;
                // When including mundane items (_blank=1), set hasIncludes so
                // non-empty rarities are filtered out by the include check below.
                if (filter.value.mundane === 1) hasIncludes = true;
                else if (filter.value.mundane === -1) hasExcludes = true;
            }

            // Handle _blank (empty value)
            const blankVal = filter.value._blank;
            const isEmpty = !rawValue || rawValue === "" || (Array.isArray(rawValue) && rawValue.length === 0);

            // ---- Scalar value ---- //
            if (!Array.isArray(rawValue)) {
                const strVal = String(rawValue);

                // Check includes: entry must match at least one include
                if (hasIncludes && !includes[strVal]) {
                    // If _blank is in include mode and value is empty, let it pass
                    if (!(blankVal === 1 && isEmpty)) return false;
                }

                // Check excludes: entry must NOT match any exclude
                if (excludes[strVal]) return false;

                // _blank handling
                if (isEmpty) {
                    if (blankVal === 1) return true;   // include blank
                    if (blankVal === -1) return false; // exclude blank (non-blank entries pass)
                    return !hasIncludes && !hasExcludes; // blank not selected = pass if no active filters
                }
                // Non-empty with no matching includes or excludes → passes
                if (!isEmpty && !hasIncludes && !hasExcludes) return true;

                return true;
            }

            // ---- Array value (SetField) ---- //
            // Check excludes first: if ANY array element is excluded, fail
            if (hasExcludes) {
                for (const elem of rawValue) {
                    if (excludes[String(elem)]) return false;
                }
            }

            // Check includes: at least one array element must match an include
            if (hasIncludes) {
                let matched = false;
                for (const elem of rawValue) {
                    if (includes[String(elem)]) { matched = true; break; }
                }
                if (!matched) return false;
            }

            // _blank handling for arrays
            if (isEmpty) {
                if (blankVal === 1) return true;
                if (blankVal === -1) return false;
            }

            return true;
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
