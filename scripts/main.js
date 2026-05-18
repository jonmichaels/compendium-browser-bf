import { initCompendiumBrowser } from "./compendium-browser.js";

Hooks.once("init", () => {
    initCompendiumBrowser();
});
