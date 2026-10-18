import { revealChange, syncThemeColor } from './color-transition.js';

export const initTheme = () => {
    const STORAGE_KEY = "theme-preference";
    const THEMES = { light: "light", dark: "dark" };
    const htmlElement = document.documentElement;
    const darkModeMediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    let themePreference = null;

    const isValidTheme = (theme) => theme === THEMES.light || theme === THEMES.dark;

    const getStoredPreference = () => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            return isValidTheme(stored) ? stored : null;
        } catch {
            return null;
        }
    };

    const storePreference = (theme) => {
        try {
            if (isValidTheme(theme)) {
                localStorage.setItem(STORAGE_KEY, theme);
            } else {
                localStorage.removeItem(STORAGE_KEY);
            }
        } catch {}
    };

    const getEffectiveTheme = (preference) => isValidTheme(preference) ? preference : (darkModeMediaQuery.matches ? THEMES.dark : THEMES.light);

    const toggleBtn = document.getElementById("themeToggle");

    const applyTheme = (preference) => {
        const effective = getEffectiveTheme(preference);
        htmlElement.setAttribute("data-theme", effective);
        if (toggleBtn) {
            const zh = document.documentElement.lang.startsWith("zh");
            const label = zh ? `切換成${effective === THEMES.dark ? "淺色" : "深色"}主題` : `Switch to ${effective === THEMES.dark ? "light" : "dark"} theme`;
            toggleBtn.setAttribute("aria-label", label);
            toggleBtn.title = label;
        }
        window.dispatchEvent(new CustomEvent("themechange", { detail: { theme: effective } }));
    };

    const toggleTheme = () => {
        const effective = getEffectiveTheme(themePreference);
        themePreference = effective === THEMES.dark ? THEMES.light : THEMES.dark;
        storePreference(themePreference);
        revealChange(toggleBtn, () => applyTheme(themePreference));
    };

    themePreference = getStoredPreference();
    applyTheme(themePreference);
    syncThemeColor();

    if (toggleBtn) toggleBtn.addEventListener("click", toggleTheme);

    darkModeMediaQuery.addEventListener("change", () => {
        themePreference = null;
        storePreference(null);
        applyTheme(themePreference);
        syncThemeColor();
    });
};