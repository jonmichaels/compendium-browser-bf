import { initCompendiumBrowser } from "./compendium-browser.js";
import "../scss/module.scss";

Hooks.once("init", () => {
    initCompendiumBrowser();
});
