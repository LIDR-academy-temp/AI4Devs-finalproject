/**
 * cq-table-filter.js  v2 — filtrado + paginado
 *
 * Se activa con class="cq-filterable" en <table>.
 * Paginado: predeterminado 10 filas/página; se puede sobreescribir con
 *   data-page-size="25" en el <table>.
 *
 * data-type en <th>:
 *   text | number | date | bool | select | none
 */
(function () {
    'use strict';

    var DEFAULT_PAGE_SIZE = 10;
    var PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

    document.addEventListener('DOMContentLoaded', function () {
        document.querySelectorAll('table.cq-filterable').forEach(initTable);
    });

    function initTable(table) {
        var wrapper = table.closest('.table-responsive') || table.parentElement;
        var thead = table.tHead;
        if (!thead) return;

        var pageSize = parseInt(table.dataset.pageSize, 10) || DEFAULT_PAGE_SIZE;
        var currentPage = 1;
        var filteredRows = [];

        /* ── Toolbar: búsqueda global + selector de página ── */
        var toolbar = document.createElement('div');
        toolbar.className = 'cq-tf-toolbar';
        toolbar.innerHTML =
            '<div class="cq-tf-search-wrap">' +
                '<span class="cq-tf-search-icon"><i class="mdi mdi-magnify"></i></span>' +
                '<input type="search" class="cq-tf-search" placeholder="Buscar en tabla…" aria-label="Buscar" />' +
                '<span class="cq-tf-count"></span>' +
            '</div>' +
            '<div class="cq-tf-page-size-wrap">' +
                '<label class="cq-tf-page-size-label">Filas:' +
                    '<select class="cq-tf-page-size-select">' +
                        PAGE_SIZE_OPTIONS.map(function (n) {
                            return '<option value="' + n + '"' + (n === pageSize ? ' selected' : '') + '>' + n + '</option>';
                        }).join('') +
                    '</select>' +
                '</label>' +
            '</div>';
        wrapper.parentElement.insertBefore(toolbar, wrapper);

        var globalInput  = toolbar.querySelector('.cq-tf-search');
        var countBadge   = toolbar.querySelector('.cq-tf-count');
        var pageSizeSel  = toolbar.querySelector('.cq-tf-page-size-select');

        /* ── Paginador inferior ── */
        var pagerWrap = document.createElement('div');
        pagerWrap.className = 'cq-tf-pager';
        wrapper.parentElement.insertBefore(pagerWrap, wrapper.nextSibling);

        /* ── Fila de filtros por columna ── */
        var headerRow = thead.rows[0];
        var filterRow = thead.insertRow();
        filterRow.className = 'cq-tf-filter-row';
        var colFilters = [];

        Array.from(headerRow.cells).forEach(function (th, i) {
            var td = document.createElement('th');
            td.className = 'cq-tf-col-cell';
            var type = (th.dataset.type || 'text').toLowerCase();

            if (type === 'none') {
                filterRow.appendChild(td);
                colFilters.push({ type: 'none', el: null, idx: i });
                return;
            }

            var el;
            if (type === 'select' || type === 'bool') {
                el = document.createElement('select');
                el.className = 'cq-tf-select';
                el.setAttribute('aria-label', 'Filtrar ' + th.textContent.trim());
                if (type === 'bool') {
                    el.innerHTML = '<option value="">Todos</option><option value="si">Sí</option><option value="no">No</option>';
                } else {
                    el.innerHTML = '<option value="">Todos</option>';
                    populateSelect(table, i, el);
                }
            } else if (type === 'number') {
                el = document.createElement('input');
                el.type = 'number';
                el.className = 'cq-tf-input';
                el.placeholder = '=';
                el.setAttribute('aria-label', 'Filtrar ' + th.textContent.trim());
            } else if (type === 'date') {
                el = document.createElement('input');
                el.type = 'date';
                el.className = 'cq-tf-input cq-tf-date';
                el.setAttribute('aria-label', 'Filtrar ' + th.textContent.trim());
            } else {
                el = document.createElement('input');
                el.type = 'search';
                el.className = 'cq-tf-input';
                el.placeholder = '…';
                el.setAttribute('aria-label', 'Filtrar ' + th.textContent.trim());
            }

            el.addEventListener('input',  function () { resetPage(); applyFilters(); });
            el.addEventListener('change', function () { resetPage(); applyFilters(); });
            td.appendChild(el);
            filterRow.appendChild(td);
            colFilters.push({ type: type, el: el, idx: i });
        });

        globalInput.addEventListener('input', function () { resetPage(); applyFilters(); });

        pageSizeSel.addEventListener('change', function () {
            pageSize = parseInt(this.value, 10);
            resetPage();
            applyFilters();
        });

        applyFilters();

        /* ── Core: filtrar + paginar ── */
        function applyFilters() {
            var globalVal = globalInput.value.toLowerCase().trim();
            var allRows = Array.from(table.tBodies[0]?.rows || []);

            /* 1. Determinar qué filas pasan el filtro */
            filteredRows = allRows.filter(function (row) {
                var allText = Array.from(row.cells).map(function (c) {
                    return c.textContent.toLowerCase();
                }).join(' ');

                if (globalVal && !allText.includes(globalVal)) return false;

                return colFilters.every(function (f) {
                    if (f.type === 'none' || !f.el) return true;
                    var val = f.el.value.trim().toLowerCase();
                    if (!val) return true;
                    var cellText = (row.cells[f.idx]?.textContent || '').toLowerCase().trim();
                    if (f.type === 'number') return cellText === val || cellText.includes(val);
                    if (f.type === 'date')   return cellText.includes(val) || matchDate(cellText, val);
                    return cellText.includes(val);
                });
            });

            /* 2. Ocultar todas las filas */
            allRows.forEach(function (r) { r.style.display = 'none'; });

            /* 3. Mostrar solo la página actual */
            var totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
            if (currentPage > totalPages) currentPage = totalPages;

            var start = (currentPage - 1) * pageSize;
            var end   = start + pageSize;
            filteredRows.slice(start, end).forEach(function (r) { r.style.display = ''; });

            /* 4. Actualizar badge y paginador */
            updateCount(countBadge, filteredRows.length, allRows.length);
            renderPager(totalPages);
        }

        function resetPage() { currentPage = 1; }

        function goToPage(p) {
            currentPage = p;
            applyFilters();
        }

        /* ── Renderizar paginador ── */
        function renderPager(totalPages) {
            pagerWrap.innerHTML = '';
            if (totalPages <= 1) return;

            var nav = document.createElement('nav');
            nav.setAttribute('aria-label', 'Paginado');
            nav.className = 'cq-tf-pager-nav';

            function btn(label, page, disabled, active, isIcon) {
                var b = document.createElement('button');
                b.type = 'button';
                b.className = 'cq-tf-page-btn' +
                    (active   ? ' cq-tf-page-active'    : '') +
                    (disabled ? ' cq-tf-page-disabled'   : '');
                if (isIcon) b.innerHTML = label;
                else        b.textContent = label;
                if (!disabled) {
                    b.addEventListener('click', function () { goToPage(page); });
                }
                return b;
            }

            /* Prev */
            nav.appendChild(btn('<i class="mdi mdi-chevron-left"></i>', currentPage - 1, currentPage === 1, false, true));

            /* Page numbers — max 7 visible with ellipsis */
            var pages = buildPageList(currentPage, totalPages);
            pages.forEach(function (p) {
                if (p === '…') {
                    var sp = document.createElement('span');
                    sp.className = 'cq-tf-page-ellipsis';
                    sp.textContent = '…';
                    nav.appendChild(sp);
                } else {
                    nav.appendChild(btn(p, p, false, p === currentPage, false));
                }
            });

            /* Next */
            nav.appendChild(btn('<i class="mdi mdi-chevron-right"></i>', currentPage + 1, currentPage === totalPages, false, true));

            /* Info */
            var info = document.createElement('span');
            info.className = 'cq-tf-pager-info';
            var start = (currentPage - 1) * pageSize + 1;
            var end   = Math.min(currentPage * pageSize, filteredRows.length);
            info.textContent = start + '–' + end + ' / ' + filteredRows.length;

            pagerWrap.appendChild(nav);
            pagerWrap.appendChild(info);
        }

        /* Devuelve array de números de página con '…' donde corresponde */
        function buildPageList(cur, total) {
            if (total <= 7) return range(1, total);
            var pages = [];
            if (cur <= 4) {
                pages = range(1, 5).concat(['…', total]);
            } else if (cur >= total - 3) {
                pages = [1, '…'].concat(range(total - 4, total));
            } else {
                pages = [1, '…'].concat(range(cur - 1, cur + 1)).concat(['…', total]);
            }
            return pages;
        }

        function range(a, b) {
            var r = [];
            for (var i = a; i <= b; i++) r.push(i);
            return r;
        }

        function matchDate(cellText, filterVal) {
            var m = cellText.match(/(\d{2})\/(\d{2})\/(\d{4})/);
            if (!m) return false;
            return (m[3] + '-' + m[2] + '-' + m[1]).startsWith(filterVal);
        }
    }

    /* ── Helpers ── */

    function populateSelect(table, colIdx, selectEl) {
        var seen = new Set();
        Array.from(table.tBodies[0]?.rows || []).forEach(function (row) {
            var text = (row.cells[colIdx]?.textContent || '').trim();
            if (text && !seen.has(text)) {
                seen.add(text);
                var opt = document.createElement('option');
                opt.value = text.toLowerCase();
                opt.textContent = text;
                selectEl.appendChild(opt);
            }
        });
    }

    function updateCount(badge, visible, total) {
        if (!badge) return;
        if (visible === total) {
            badge.textContent = total + ' registro' + (total !== 1 ? 's' : '');
            badge.className = 'cq-tf-count';
        } else {
            badge.textContent = visible + ' de ' + total;
            badge.className = 'cq-tf-count cq-tf-count-filtered';
        }
    }
})();
