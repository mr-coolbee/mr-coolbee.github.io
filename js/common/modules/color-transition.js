const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const root = document.documentElement;

export const revealChange = (origin, apply) => {
    if (root.hasAttribute("data-page-bg")) {
        root.setAttribute("data-theme-soft", "");
        apply();
        setTimeout(() => {
            root.removeAttribute("data-theme-soft");
            syncThemeColor();
        }, 400);
        return;
    }

    root.setAttribute("data-theme-switching", "");
    const done = () => {
        root.removeAttribute("data-theme-switching");
        syncThemeColor();
    };

    if (!document.startViewTransition || reducedMotion.matches) {
        apply();
        requestAnimationFrame(() => requestAnimationFrame(done));
        return;
    }

    const rect = origin?.getBoundingClientRect?.();
    const x = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
    const y = rect ? rect.top + rect.height / 2 : 0;
    const r = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y)) * 1.12;
    root.style.setProperty("--reveal-x", `${x}px`);
    root.style.setProperty("--reveal-y", `${y}px`);
    root.style.setProperty("--reveal-r", `${r}px`);

    const transition = document.startViewTransition(apply);
    transition.finished.finally(done);
};

const toRgb = (color) => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 1;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 1, 1);
    const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
    return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
};

export const syncThemeColor = () => {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) return;
    const surface = getComputedStyle(root).getPropertyValue("--surface").trim();
    const hex = surface && toRgb(surface);
    if (hex) meta.setAttribute("content", hex);
};