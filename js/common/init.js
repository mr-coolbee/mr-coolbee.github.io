import { initTheme } from './modules/theme.js';
import { initTopAppBar } from './modules/top-app-bar.js';
import { initRipple } from './modules/ripple.js';

export const initCommon = () => {
    initTheme();
    initTopAppBar();
    initRipple();
};