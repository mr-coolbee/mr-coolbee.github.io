import { initCommon } from '/js/common/init.js';
import { setPageBackground } from '/js/common/modules/page-bg.js';

initCommon();

const $ = (selector) => document.querySelector(selector);
const root = document.documentElement;

const envRows = [
    ["data-theme", () => root.dataset.theme],
    ["System color scheme", () => (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")],
    ["Stored preference", () => { try { return localStorage.getItem("theme-preference") ?? "(none, follows system)"; } catch { return "(localStorage unavailable)"; } }],
    ["Viewport (px)", () => `${innerWidth} × ${innerHeight}`],
    ["devicePixelRatio", () => String(devicePixelRatio)],
    ["Scroll Y", () => String(Math.round(scrollY))],
    ["Title progress --title-p", () => (Number(document.querySelector(".top-title-large")?.style.getPropertyValue("--title-p") || 0)).toFixed(3)],
    ["Reduced motion", () => (matchMedia("(prefers-reduced-motion: reduce)").matches ? "on" : "off"), true],
    ["Hover device", () => (matchMedia("(hover: hover)").matches ? "yes" : "no")],
    ["View Transitions", () => (document.startViewTransition ? "supported" : "unsupported")],
    ["data-theme-switching", () => (root.hasAttribute("data-theme-switching") ? "yes" : "no")],
    ["Google Sans Flex", () => (document.fonts.check('16px "Google Sans Flex"') ? "loaded" : "not loaded")],
    ["theme-color meta", () => document.querySelector('meta[name="theme-color"]')?.content ?? "—"],
    ["User-Agent", () => navigator.userAgent]
];

const envList = $("#envReadout");
const envCells = envRows.map(([label]) => {
    const wrap = document.createElement("div");
    const dt = document.createElement("dt");
    const dd = document.createElement("dd");
    dt.textContent = label;
    wrap.append(dt, dd);
    envList.append(wrap);
    return dd;
});
const renderEnv = () => envRows.forEach(([, read], i) => { envCells[i].textContent = read(); });
renderEnv();
["resize", "scroll", "themechange"].forEach((name) => addEventListener(name, renderEnv, { passive: true }));
new MutationObserver(renderEnv).observe(root, { attributes: true });
setInterval(renderEnv, 500);

const TOKENS = [
    ["primary", "on-primary"], ["primary-container", "on-primary-container"],
    ["secondary", "on-secondary"], ["secondary-container", "on-secondary-container"],
    ["tertiary", "on-tertiary"], ["tertiary-container", "on-tertiary-container"],
    ["error", "on-error"], ["error-container", "on-error-container"],
    ["surface", "on-surface"], ["surface-dim", "on-surface"],
    ["surface-container-lowest", "on-surface"], ["surface-container-low", "on-surface"],
    ["surface-container", "on-surface"], ["surface-container-high", "on-surface"],
    ["surface-container-highest", "on-surface"], ["on-surface-variant", "surface"],
    ["outline", "surface"], ["outline-variant", "on-surface"],
    ["inverse-surface", "inverse-on-surface"], ["scrim", "surface"]
];

const grid = $("#tokenGrid");
const tokenButtons = TOKENS.map(([name, on]) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "token";
    button.dataset.name = name;
    button.dataset.on = on;
    button.innerHTML = `<b>--${name}</b><small></small>`;
    grid.append(button);
    return button;
});

const renderTokens = () => {
    const style = getComputedStyle(root);
    tokenButtons.forEach((button) => {
        const bg = style.getPropertyValue(`--${button.dataset.name}`).trim();
        button.style.backgroundColor = `var(--${button.dataset.name})`;
        button.style.color = `var(--${button.dataset.on})`;
        button.querySelector("small").textContent = bg;
    });
};
renderTokens();
addEventListener("themechange", () => requestAnimationFrame(renderTokens));

grid.addEventListener("click", async (event) => {
    const button = event.target.closest(".token");
    if (!button) return;
    try {
        await navigator.clipboard.writeText(`var(--${button.dataset.name})`);
        const label = button.querySelector("b");
        const original = label.textContent;
        label.textContent = "Copied";
        setTimeout(() => { label.textContent = original }, 900);
    } catch {}
});

const MOTIONS = [
    ["emphasized · 300ms", "var(--ease-emphasized)", "var(--duration-medium)"],
    ["decelerate · 300ms", "var(--ease-emphasized-decelerate)", "var(--duration-medium)"],
    ["accelerate · 300ms", "var(--ease-emphasized-accelerate)", "var(--duration-medium)"],
    ["emphasized · 150ms", "var(--ease-emphasized)", "var(--duration-short)"],
    ["emphasized · 500ms", "var(--ease-emphasized)", "var(--duration-long)"]
];
const motionRows = $("#motionRows");
const dots = MOTIONS.map(([label, ease, duration]) => {
    const row = document.createElement("div");
    row.className = "motion-row";
    row.innerHTML = `<span>${label}</span><i></i>`;
    const dot = row.querySelector("i");
    dot.style.transitionTimingFunction = ease;
    dot.style.transitionDuration = duration;
    motionRows.append(row);
    return dot;
});
const sizeTravel = () => dots.forEach((dot) => dot.style.setProperty("--travel", `${dot.parentElement.clientWidth - 32}px`));
sizeTravel();
addEventListener("resize", sizeTravel);
$("#motionPlay").addEventListener("click", () => dots.forEach((dot) => dot.toggleAttribute("data-go")));

$("#spinCookie").addEventListener("click", () => {
    const next = (Number(root.dataset.spin ?? 0) + 40);
    root.dataset.spin = String(next);
    document.querySelectorAll(".shape-cookie").forEach((el) => el.style.setProperty("--cookie-turn", `${next}deg`));
});

$("#chipDemo").addEventListener("click", (event) => {
    const chip = event.target.closest(".chip");
    if (chip) chip.setAttribute("aria-pressed", String(chip.getAttribute("aria-pressed") !== "true"));
});

const SAMPLE_BG = "/web-assets/common/backgrounds/sample.webp";
$("#bgToggle").addEventListener("change", (event) => { setPageBackground(event.target.checked ? SAMPLE_BG : null)});