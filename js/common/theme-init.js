(function () {
    const STORAGE_KEY = "theme-preference";
    let pref = null;
    try {
        pref = localStorage.getItem(STORAGE_KEY);
    } catch {}
    const effective = (pref === "light" || pref === "dark") ? pref : (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    document.documentElement.setAttribute("data-theme", effective);
})();