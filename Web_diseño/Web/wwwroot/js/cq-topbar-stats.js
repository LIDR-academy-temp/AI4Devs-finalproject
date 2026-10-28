(function () {
    'use strict';

    function relocateHeroStats() {
        var topbarRight = document.querySelector('.cq-topbar-inner .cq-tb-right');
        var strip = document.querySelector('.cq-reserva-hero .cq-reserva-stat-strip');

        if (!topbarRight || !strip) {
            return;
        }

        var sep = document.createElement('div');
        sep.className = 'cq-tb-sep';
        sep.setAttribute('aria-hidden', 'true');

        strip.classList.remove('d-flex', 'flex-wrap', 'gap-2', 'cq-reserva-stat-strip');
        strip.classList.add('cq-tb-stat-strip');

        strip.querySelectorAll('.cq-reserva-stat').forEach(function (stat) {
            stat.classList.remove('cq-reserva-stat');
            stat.classList.add('cq-tb-stat');
        });

        topbarRight.appendChild(sep);
        topbarRight.appendChild(strip);
        document.body.classList.add('cq-stats-in-topbar');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', relocateHeroStats);
    } else {
        relocateHeroStats();
    }
})();
