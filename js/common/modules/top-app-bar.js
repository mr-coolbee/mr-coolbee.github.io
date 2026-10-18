export const initTopAppBar = () => {
    const bar = document.querySelector(".top-bar");
    const title = document.querySelector(".top-title-large");
    if (!bar || !title) return;

    const SMALL_FONT_PX = 22;
    const root = document.documentElement;
    let range = 1;
    let progress = -1;

    const measure = () => {
        const barHeight = bar.offsetHeight;
        const titleHeight = title.offsetHeight;
        const stickTop = (barHeight - titleHeight) / 2;
        const back = bar.querySelector(".top-bar-inner > a.icon-btn");
        const inner = bar.querySelector(".top-bar-inner");
        const targetLeft = back ? back.getBoundingClientRect().right + 8 : inner.getBoundingClientRect().left + 16;
        const naturalLeft = title.offsetLeft;
        const largeFont = parseFloat(getComputedStyle(title).fontSize);
        const naturalTop = barHeight + parseFloat(getComputedStyle(title).marginTop);

        title.style.setProperty("--title-stick-top", `${stickTop}px`);
        title.style.setProperty("--title-dx", `${targetLeft - naturalLeft}px`);
        title.style.setProperty("--title-scale-end", String(SMALL_FONT_PX / largeFont));
        range = Math.max(1, naturalTop - stickTop);
        progress = -1;
        update();
    };

    const update = () => {
        const next = Math.min(1, Math.max(0, window.scrollY / range));
        if (next === progress) return;
        progress = next;
        title.style.setProperty("--title-p", String(next));
        bar.style.setProperty("--title-p", String(next));
    };

    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", measure);
    window.addEventListener("pageshow", measure);
    document.fonts?.ready.then(measure);
    measure();
};