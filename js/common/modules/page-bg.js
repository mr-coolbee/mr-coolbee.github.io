const root = document.documentElement;

export const setPageBackground = (url) => {
    if (!url) {
        root.removeAttribute("data-page-bg");
        root.style.removeProperty("--page-bg-image");
        return;
    }
    root.style.setProperty("--page-bg-image", `url("${url}")`);
    root.setAttribute("data-page-bg", "");
};

export const hasPageBackground = () => root.hasAttribute("data-page-bg");