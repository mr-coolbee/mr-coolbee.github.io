export const initRipple = () => {
    document.addEventListener("pointerdown", (event) => {
        if (event.button !== 0) return;
        const host = event.target.closest(".btn, .icon-btn, a.list-item");
        if (!host || host.disabled) return;

        const rect = host.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        const size = Math.hypot(Math.max(x, rect.width - x), Math.max(y, rect.height - y)) * 2;

        const ripple = document.createElement("span");
        ripple.className = "ripple";
        ripple.style.width = ripple.style.height = `${size}px`;
        ripple.style.left = `${x - size / 2}px`;
        ripple.style.top = `${y - size / 2}px`;
        host.append(ripple);

        const release = () => {
            ripple.setAttribute("data-releasing", "");
            setTimeout(() => ripple.remove(), 450);
            window.removeEventListener("pointerup", release);
            window.removeEventListener("pointercancel", release);
        };
        window.addEventListener("pointerup", release);
        window.addEventListener("pointercancel", release);
    });
};