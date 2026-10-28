(() => {
    const root = document.querySelector('[data-pase-qr-validator]');

    if (!root) {
        return;
    }

    const video = root.querySelector('[data-qr-video]');
    const status = root.querySelector('[data-qr-status]');
    const startButton = root.querySelector('[data-qr-start]');
    const stopButton = root.querySelector('[data-qr-stop]');
    const form = root.querySelector('[data-qr-form]');
    const codeInput = root.querySelector('#codigo');

    const validationBase = (root.dataset.validationBase || '/Gestion/Pase-QR/Validar').replace(/\/+$/, '');

    let stream = null;
    let detector = null;
    let intervalId = null;
    let active = false;
    let busy = false;
    let redirecting = false;
    let lastScanError = '';

    const setStatus = (message, state = 'neutral') => {
        if (!status) {
            return;
        }

        status.textContent = message;
        status.dataset.state = state;
    };

    const normalizeCode = (value) => {
        const text = String(value ?? '').trim();

        if (!text) {
            return '';
        }

        try {
            return decodeURIComponent(text);
        } catch {
            return text;
        }
    };

    const buildValidationUrl = (code) => {
        const normalizedCode = normalizeCode(code);
        return `${validationBase}/${encodeURIComponent(normalizedCode)}`;
    };

    const extractCodeFromUrl = (url) => {
        const isValidationRoute = url.pathname.toLowerCase().includes('/gestion/pase-qr/validar');

        if (!isValidationRoute) {
            return '';
        }

        const queryCode = url.searchParams.get('codigo') || url.searchParams.get('code');

        if (queryCode) {
            return normalizeCode(queryCode);
        }

        const segments = url.pathname.split('/').filter(Boolean);
        const validarIndex = segments.findIndex((segment) => segment.toLowerCase() === 'validar');

        if (validarIndex >= 0 && validarIndex + 1 < segments.length) {
            return normalizeCode(segments[validarIndex + 1]);
        }

        return '';
    };

    const resolveTarget = (rawValue) => {
        const text = String(rawValue ?? '').trim();

        if (!text) {
            return '';
        }

        if (/^[a-z][a-z0-9+.-]*:\/\//i.test(text) || text.startsWith('/')) {
            try {
                const url = new URL(text, window.location.origin);

                if (url.origin !== window.location.origin) {
                    return '';
                }

                const code = extractCodeFromUrl(url);
                return code ? buildValidationUrl(code) : '';
            } catch {
                return '';
            }
        }

        return buildValidationUrl(text);
    };

    const stopScanner = async () => {
        active = false;
        busy = false;
        lastScanError = '';

        if (intervalId !== null) {
            window.clearInterval(intervalId);
            intervalId = null;
        }

        if (video) {
            try {
                video.pause();
            } catch {
                // Ignore media cleanup errors.
            }

            video.srcObject = null;
        }

        if (stream) {
            stream.getTracks().forEach((track) => track.stop());
            stream = null;
        }

        if (startButton) {
            startButton.disabled = false;
        }

        if (stopButton) {
            stopButton.disabled = true;
        }
    };

    const handleDetection = async (value) => {
        if (redirecting) {
            return;
        }

        const target = resolveTarget(value);

        if (!target) {
            setStatus('El QR detectado no corresponde a un pase válido de Cuarta Quinientos.', 'error');
            return;
        }

        redirecting = true;
        setStatus('Código detectado. Validando pase...', 'success');
        await stopScanner();
        window.location.assign(target);
    };

    const scanFrame = async () => {
        if (!active || busy || !detector || !video || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
            return;
        }

        busy = true;

        try {
            const barcodes = await detector.detect(video);

            if (barcodes.length > 0) {
                const rawValue = barcodes[0].rawValue || '';

                if (rawValue) {
                    await handleDetection(rawValue);
                }
            } else if (lastScanError) {
                lastScanError = '';
                setStatus('Apunta la cámara al QR. La validación se ejecutará automáticamente.', 'success');
            }
        } catch {
            const errorMessage = 'No se pudo leer el QR en este momento. Reintenta o usa el código manual.';

            if (lastScanError !== errorMessage) {
                setStatus(errorMessage, 'warning');
                lastScanError = errorMessage;
            }
        } finally {
            busy = false;
        }
    };

    const startScanner = async () => {
        if (redirecting) {
            return;
        }

        if (!navigator.mediaDevices?.getUserMedia) {
            setStatus('Tu navegador no permite abrir la cámara. Usa el campo manual.', 'error');
            return;
        }

        if (!('BarcodeDetector' in window)) {
            setStatus('Este navegador no soporta lectura QR automática. Usa el campo manual.', 'warning');
            return;
        }

        if (!detector) {
            try {
                detector = new BarcodeDetector({ formats: ['qr_code'] });
            } catch {
                setStatus('La lectura automática no está disponible en este navegador. Usa el campo manual.', 'warning');
                return;
            }
        }

        try {
            setStatus('Solicitando acceso a la cámara...', 'info');
            stream = await navigator.mediaDevices.getUserMedia({
                audio: false,
                video: {
                    facingMode: { ideal: 'environment' },
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                }
            });

            if (!video) {
                await stopScanner();
                return;
            }

            video.srcObject = stream;
            await video.play();

            active = true;
            busy = false;
            lastScanError = '';

            if (startButton) {
                startButton.disabled = true;
            }

            if (stopButton) {
                stopButton.disabled = false;
            }

            setStatus('Apunta la cámara al QR. La validación se ejecutará automáticamente.', 'success');

            if (intervalId !== null) {
                window.clearInterval(intervalId);
            }

            intervalId = window.setInterval(scanFrame, 250);
            await scanFrame();
        } catch {
            await stopScanner();
            setStatus('No se pudo iniciar la cámara. Revisa permisos y vuelve a intentar.', 'error');
        }
    };

    if (startButton) {
        startButton.addEventListener('click', () => {
            void startScanner();
        });
    }

    if (stopButton) {
        stopButton.addEventListener('click', () => {
            void stopScanner().then(() => setStatus('Cámara detenida. Puedes reactivarla cuando quieras.', 'neutral'));
        });
    }

    if (codeInput) {
        codeInput.addEventListener('input', () => {
            codeInput.value = codeInput.value.trim();
        });
    }

    if (form) {
        form.addEventListener('submit', () => {
            if (codeInput && !codeInput.value.trim()) {
                setStatus('Escribe el código o la URL del pase antes de validar.', 'warning');
            }
        });
    }

    const initialCode = codeInput?.value?.trim() || '';

    if (!initialCode) {
        void startScanner();
    } else {
        setStatus('Código cargado. Si quieres usar la cámara, puedes iniciar un nuevo escaneo.', 'neutral');
    }

    window.addEventListener('beforeunload', () => {
        if (stream) {
            stream.getTracks().forEach((track) => track.stop());
        }
    });
})();
