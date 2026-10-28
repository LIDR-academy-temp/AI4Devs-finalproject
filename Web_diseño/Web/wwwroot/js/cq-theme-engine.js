(function () {
    'use strict';

    var STORAGE_KEY = 'cq-theme';

    function getConfig() {
        return window.__CQ_SITE_THEME__ || null;
    }

    function resolveThemeId(config, themeId) {
        if (!config || !config.themes) return 'ocean';
        if (themeId && config.themes[themeId]) return themeId;
        if (config.defaultTheme && config.themes[config.defaultTheme]) return config.defaultTheme;
        var keys = Object.keys(config.themes);
        return keys.length ? keys[0] : 'ocean';
    }

    function applyFonts(config) {
        if (!config || !config.fonts) return;
        var root = document.documentElement;
        if (config.fonts.body) root.style.setProperty('--cq-font-body', config.fonts.body);
        if (config.fonts.heading) root.style.setProperty('--cq-font-heading', config.fonts.heading);
    }

    function applyTheme(themeId, config) {
        config = config || getConfig();
        if (!config) return themeId;

        var resolvedId = resolveThemeId(config, themeId);
        var theme = config.themes[resolvedId];
        if (!theme) return resolvedId;

        var root = document.documentElement;
        root.setAttribute('data-theme', resolvedId);

        applyFonts(config);

        if (theme.tokens) {
            Object.keys(theme.tokens).forEach(function (name) {
                root.style.setProperty(name, theme.tokens[name]);
            });
        }

        updateMetaThemeColor(theme.metaThemeColor);
        updateToggleLabel(theme.label);
        return resolvedId;
    }

    function updateMetaThemeColor(color) {
        if (!color) return;
        var meta = document.querySelector('meta[name="theme-color"]');
        if (meta) meta.setAttribute('content', color);
    }

    function updateToggleLabel(label) {
        var labelEl = document.getElementById('cq-theme-label');
        if (labelEl && label) labelEl.textContent = label.toUpperCase();
    }

    function getStoredThemeId(config) {
        try {
            return localStorage.getItem(STORAGE_KEY);
        } catch (e) {
            return null;
        }
    }

    function storeThemeId(themeId) {
        try {
            localStorage.setItem(STORAGE_KEY, themeId);
        } catch (e) {
            /* ignore */
        }
    }

    function getActiveThemeId(config) {
        config = config || getConfig();
        if (!config) return 'ocean';
        if (!config.allowUserSwitch) return resolveThemeId(config, config.defaultTheme);
        return resolveThemeId(config, getStoredThemeId(config) || config.defaultTheme);
    }

    function toggleTheme() {
        var config = getConfig();
        if (!config || !config.allowUserSwitch) return;

        var themeIds = Object.keys(config.themes);
        if (themeIds.length <= 1) return;

        var current = getActiveThemeId(config);
        var index = themeIds.indexOf(current);
        var next = themeIds[(index + 1) % themeIds.length];
        storeThemeId(next);
        applyTheme(next, config);
    }

    function initToggleButton() {
        var config = getConfig();
        if (!config || !config.allowUserSwitch) return;

        var btn = document.getElementById('cq-theme-toggle');
        if (!btn) return;

        btn.addEventListener('click', toggleTheme);
    }

    function bootstrap() {
        var config = getConfig();
        if (!config) return;

        var themeId = getActiveThemeId(config);
        applyTheme(themeId, config);
        initToggleButton();
    }

    function previewTokenOverrides(themeId, overrides, metaThemeColor) {
        var config = getConfig();
        if (!config) return themeId;

        var resolvedId = resolveThemeId(config, themeId);
        var theme = config.themes[resolvedId];
        if (!theme) return resolvedId;

        var root = document.documentElement;
        root.setAttribute('data-theme', resolvedId);
        applyFonts(config);

        var merged = Object.assign({}, theme.tokens || {}, overrides || {});
        Object.keys(merged).forEach(function (name) {
            root.style.setProperty(name, merged[name]);
        });

        updateMetaThemeColor(metaThemeColor || theme.metaThemeColor);
        updateToggleLabel(theme.label);
        return resolvedId;
    }

    window.CqThemeEngine = {
        applyTheme: applyTheme,
        toggleTheme: toggleTheme,
        getActiveThemeId: getActiveThemeId,
        previewTokenOverrides: previewTokenOverrides,
        bootstrap: bootstrap
    };

    bootstrap();
})();
