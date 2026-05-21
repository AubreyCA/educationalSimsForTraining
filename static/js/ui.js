// UI module - handles controls and parameter management
const UI = {
    fftMode: { input: false, output: false },

    init() {
        this.bindConverterSelect();
        this.bindSliders();
        this.bindSignalControls();
        this.bindPlayback();
        this.bindTabs();
        this.bindFFTToggles();
        this.bindExport();
        this.bindZoom();
        this.bindThemeToggle();
        this.bindSARInternals();
        this.updateVisibility();
        this.updateComputedValues();
        this.drawPlaceholders();
    },

    bindConverterSelect() {
        const select = document.getElementById('converter-select');
        select.addEventListener('change', () => {
            this.updateVisibility();
            this.updateComputedValues();
            // Clear simulation state so ADC/DAC don't cross-contaminate
            App.currentData = null;
            App.stepIndex = 0;
            App.stopPlayback();
            this.drawPlaceholders();
        });
    },

    bindSliders() {
        const sliders = [
            { id: 'param-bits', display: 'param-bits-value' },
            { id: 'param-num-samples', display: 'param-num-samples-value' },
            { id: 'param-stages', display: 'param-stages-value' },
            { id: 'param-bits-per-stage', display: 'param-bits-per-stage-value' },
        ];
        sliders.forEach(({ id, display }) => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('input', () => {
                    document.getElementById(display).textContent = el.value;
                    this.updateComputedValues();
                });
            }
        });

        // Vref input
        const vrefInput = document.getElementById('param-vref');
        if (vrefInput) {
            vrefInput.addEventListener('change', () => {
                if (!this.validateVref()) return;
                this.updateComputedValues();
            });
            vrefInput.addEventListener('input', () => {
                if (!this.validateVref()) return;
                this.updateComputedValues();
            });
        }

        // Sample rate sync
        const srSlider = document.getElementById('param-sample-rate');
        const srNum = document.getElementById('param-sample-rate-num');
        if (srSlider && srNum) {
            srSlider.addEventListener('input', () => {
                srNum.value = srSlider.value;
                this.updateComputedValues();
            });
            srNum.addEventListener('change', () => {
                srSlider.value = srNum.value;
                this.updateComputedValues();
            });
        }

        // Speed slider
        const speed = document.getElementById('playback-speed');
        if (speed) {
            speed.addEventListener('input', () => {
                document.getElementById('playback-speed-value').textContent = speed.value + 'ms';
            });
        }
    },

    bindSignalControls() {
        const typeSelect = document.getElementById('signal-type');
        typeSelect.addEventListener('change', () => {
            const type = typeSelect.value;
            document.getElementById('signal-frequency-group').style.display = type === 'dc' ? 'none' : '';
            document.getElementById('signal-duty-group').style.display = type === 'pulse' ? '' : 'none';
        });

        // Amplitude sync
        const ampSlider = document.getElementById('signal-amplitude');
        const ampNum = document.getElementById('signal-amplitude-num');
        ampSlider.addEventListener('input', () => { ampNum.value = ampSlider.value; this.validateAmplitude(); });
        ampNum.addEventListener('change', () => { ampSlider.value = ampNum.value; this.validateAmplitude(); });
        ampNum.addEventListener('input', () => { this.validateAmplitude(); });

        // Frequency sync
        const freqSlider = document.getElementById('signal-frequency');
        const freqNum = document.getElementById('signal-frequency-num');
        freqSlider.addEventListener('input', () => {
            freqNum.value = freqSlider.value;
            this.validateFrequency();
            this.updateComputedValues();
        });
        freqNum.addEventListener('change', () => {
            freqSlider.value = freqNum.value;
            this.validateFrequency();
            this.updateComputedValues();
        });
        freqNum.addEventListener('input', () => {
            this.validateFrequency();
        });

        // Duty cycle
        const dutySlider = document.getElementById('signal-duty');
        if (dutySlider) {
            dutySlider.addEventListener('input', () => {
                document.getElementById('signal-duty-value').textContent = dutySlider.value + '%';
            });
        }

        // DAC input mode toggle
        const dacMode = document.getElementById('dac-input-mode');
        if (dacMode) {
            dacMode.addEventListener('change', () => {
                const mode = dacMode.value;
                document.getElementById('dac-freq-group').style.display = mode === 'frequency' ? '' : 'none';
                document.getElementById('dac-amp-group').style.display = mode === 'frequency' ? '' : 'none';
                document.getElementById('dac-codes-group').style.display = mode === 'codewords' ? '' : 'none';
                document.getElementById('dac-num-cycles-group').style.display = mode === 'frequency' ? '' : 'none';
            });
        }
    },

    bindPlayback() {
        document.getElementById('btn-simulate').addEventListener('click', () => App.runSimulation());
        document.getElementById('btn-step').addEventListener('click', () => App.stepSimulation());
        document.getElementById('btn-play').addEventListener('click', () => App.startPlayback());
        document.getElementById('btn-pause').addEventListener('click', () => App.stopPlayback());
        document.getElementById('btn-reset').addEventListener('click', () => App.resetSimulation());
    },

    bindTabs() {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                btn.classList.add('active');
                document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
            });
        });
    },

    bindFFTToggles() {
        document.querySelectorAll('.toggle-fft').forEach(btn => {
            btn.addEventListener('click', () => {
                const graph = btn.dataset.graph;
                this.fftMode[graph] = !this.fftMode[graph];
                btn.classList.toggle('active', this.fftMode[graph]);
                App.updateGraphs();
            });
        });
    },

    bindExport() {
        document.getElementById('btn-export-csv').addEventListener('click', () => App.exportCSV());
        document.getElementById('btn-export-png').addEventListener('click', () => App.exportPNG());
        document.getElementById('btn-copy-codes').addEventListener('click', () => App.copyCodewords());
        document.getElementById('btn-clear-codes').addEventListener('click', () => UI.clearCodewordTable());
    },

    bindThemeToggle() {
        const btn = document.getElementById('btn-theme');
        // Load saved preference
        const saved = localStorage.getItem('theme');
        if (saved === 'dark') {
            document.documentElement.setAttribute('data-theme', 'dark');
            btn.textContent = '☀️';
        }
        btn.addEventListener('click', () => {
            const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
            if (isDark) {
                document.documentElement.removeAttribute('data-theme');
                btn.textContent = '🌙';
                localStorage.setItem('theme', 'light');
            } else {
                document.documentElement.setAttribute('data-theme', 'dark');
                btn.textContent = '☀️';
                localStorage.setItem('theme', 'dark');
            }
            // Redraw canvases with new theme
            if (App.currentData) {
                App.updateGraphs();
                App.drawCircuit(App.lastVizType, App.lastVizData);
                App.drawAnalogy(App.lastVizType, App.lastVizData);
            } else {
                UI.drawPlaceholders();
            }
        });
    },

    bindSARInternals() {
        const btn = document.getElementById('btn-sar-internals');
        const canvas = document.getElementById('sar-internals-canvas');
        let visible = false;

        btn.addEventListener('click', () => {
            visible = !visible;
            canvas.style.display = visible ? 'block' : 'none';
            btn.style.background = visible ? '#00d4ff' : '';
            btn.style.color = visible ? '#000' : '';
            if (visible) {
                App.drawSARInternals();
            }
        });
    },

    bindZoom() {
        const vizCanvases = ['circuit-canvas', 'analogy-canvas'];

        document.querySelectorAll('.zoom-in').forEach(btn => {
            btn.addEventListener('click', () => {
                const target = btn.dataset.graph;
                if (vizCanvases.includes(target)) {
                    App.vizZoomIn(target);
                } else {
                    Charts.zoomIn(target);
                    App.updateGraphs();
                }
            });
        });
        document.querySelectorAll('.zoom-out').forEach(btn => {
            btn.addEventListener('click', () => {
                const target = btn.dataset.graph;
                if (vizCanvases.includes(target)) {
                    App.vizZoomOut(target);
                } else {
                    Charts.zoomOut(target);
                    App.updateGraphs();
                }
            });
        });
        document.querySelectorAll('.zoom-reset').forEach(btn => {
            btn.addEventListener('click', () => {
                const target = btn.dataset.graph;
                if (vizCanvases.includes(target)) {
                    App.vizZoomReset(target);
                } else {
                    Charts.zoomReset(target);
                    App.updateGraphs();
                }
            });
        });

        // Drag-to-pan for all graph canvases
        this.bindDragPan();
    },

    bindDragPan() {
        const vizCanvases = ['circuit-canvas', 'analogy-canvas'];
        const graphCanvases = ['graph-input', 'graph-output', 'graph-reconstructed'];
        const allCanvasIds = [...graphCanvases, ...vizCanvases];

        allCanvasIds.forEach(canvasId => {
            const canvas = document.getElementById(canvasId);
            if (!canvas) return;

            let dragging = false;
            let startX = 0;
            let startY = 0;
            let startPanX = 0;
            let startPanY = 0;

            canvas.style.cursor = 'grab';

            canvas.addEventListener('mousedown', (e) => {
                dragging = true;
                startX = e.clientX;
                startY = e.clientY;
                canvas.style.cursor = 'grabbing';

                if (vizCanvases.includes(canvasId)) {
                    const z = App.getVizZoom(canvasId);
                    startPanX = z.panX;
                    startPanY = z.panY;
                } else {
                    const z = Charts.getZoom(canvasId);
                    startPanX = z.panX;
                }

                e.preventDefault();
            });

            window.addEventListener('mousemove', (e) => {
                if (!dragging) return;
                const dx = e.clientX - startX;
                const dy = e.clientY - startY;

                if (vizCanvases.includes(canvasId)) {
                    const z = App.getVizZoom(canvasId);
                    z.panX = startPanX + dx;
                    z.panY = startPanY + dy;
                    App.redrawViz();
                } else {
                    const z = Charts.getZoom(canvasId);
                    if (z.level <= 1.0) return;
                    // Convert pixel drag to panX delta (0-1 range)
                    const plotWidth = canvas.width - 60; // approximate padding
                    const panDelta = dx / plotWidth / z.level;
                    z.panX = Math.max(0, Math.min(1, startPanX - panDelta));
                    App.updateGraphs();
                }
            });

            window.addEventListener('mouseup', () => {
                if (dragging) {
                    dragging = false;
                    canvas.style.cursor = 'grab';
                }
            });
        });
    },

    drawPlaceholders() {
        const type = this.getConverterType();
        const isDAC = type === 'r2r_dac' || type === 'current_dac';
        if (isDAC) {
            Charts.drawPlaceholder(document.getElementById('graph-input'), 'Run simulation to see input codes');
            Charts.drawPlaceholder(document.getElementById('graph-output'), 'Run simulation to see analog output');
            Charts.drawPlaceholder(document.getElementById('graph-reconstructed'), 'Run simulation to see transfer characteristic');
        } else {
            Charts.drawPlaceholder(document.getElementById('graph-input'), 'Run simulation to see input signal');
            Charts.drawPlaceholder(document.getElementById('graph-output'), 'Run simulation to see digital output');
            Charts.drawPlaceholder(document.getElementById('graph-reconstructed'), 'Run simulation to see reconstruction');
        }
    },

    updateVisibility() {
        const type = this.getConverterType();
        const isDAC = type === 'r2r_dac' || type === 'current_dac';
        const isSigmaDelta = type === 'sigma_delta_adc';
        const isPipeline = type === 'pipeline_adc';
        const isFlash = type === 'flash_adc';

        // Parameter visibility
        document.getElementById('param-osr-group').style.display = isSigmaDelta ? '' : 'none';
        document.getElementById('param-stages-group').style.display = isPipeline ? '' : 'none';
        document.getElementById('param-bits-per-stage-group').style.display = isPipeline ? '' : 'none';
        document.getElementById('param-dac-mode-group').style.display = type === 'current_dac' ? '' : 'none';

        // Bits range
        const bitsSlider = document.getElementById('param-bits');
        if (isFlash) { bitsSlider.max = 8; }
        else if (isDAC) { bitsSlider.max = 12; }
        else { bitsSlider.max = 16; }
        if (isPipeline) { bitsSlider.style.display = 'none'; }
        else { bitsSlider.style.display = ''; }

        // Signal section
        document.getElementById('signal-section').style.display = '';
        document.getElementById('adc-signal-controls').style.display = isDAC ? 'none' : '';
        document.getElementById('dac-input-section').style.display = isDAC ? '' : 'none';
        document.getElementById('signal-frequency-group').style.display =
            (isDAC || document.getElementById('signal-type').value === 'dc') ? 'none' : '';

        // Interpolation
        document.getElementById('interpolation-section').style.display = isDAC ? 'none' : '';

        // Sample rate
        document.getElementById('param-sample-rate-group').style.display = isSigmaDelta || isDAC ? 'none' : '';

        // Graph headers based on mode
        const h4s = document.querySelectorAll('#graphs-container .graph-panel h4');
        if (isDAC) {
            if (h4s[0]) h4s[0].textContent = 'Input Codes';
            if (h4s[1]) h4s[1].textContent = 'Analog Output';
            if (h4s[2]) h4s[2].textContent = 'Transfer Characteristic';
        } else {
            if (h4s[0]) h4s[0].textContent = 'Input Signal';
            if (h4s[1]) h4s[1].textContent = 'Digital Codeword Output';
            if (h4s[2]) h4s[2].textContent = 'Reconstructed Output';
        }

        // Analogy panel title
        const analogyTitle = document.getElementById('analogy-title');
        if (type === 'sar_adc') analogyTitle.textContent = 'Binary Search Tree';
        else if (isFlash) analogyTitle.textContent = 'Lookup Table';
        else if (isSigmaDelta) analogyTitle.textContent = 'RNN Analogy';
        else if (isPipeline) analogyTitle.textContent = 'Pipeline Stages';
        else analogyTitle.textContent = 'Visualization';

        // SAR internals button
        const sarBtn = document.getElementById('btn-sar-internals');
        const sarCanvas = document.getElementById('sar-internals-canvas');
        if (type === 'sar_adc') {
            sarBtn.style.display = '';
        } else {
            sarBtn.style.display = 'none';
            if (sarCanvas) sarCanvas.style.display = 'none';
        }
    },

    updateComputedValues() {
        const bits = this.getNumBits();
        const vref = this.getVref();
        const fs = this.getSampleRate();
        const freq = this.getFrequency();

        const lsb = vref / Math.pow(2, bits);
        const nyquist = fs / 2;
        const spp = freq > 0 ? (fs / freq).toFixed(1) : '∞';
        const midCode = Math.floor(Math.pow(2, bits) / 2);

        document.getElementById('computed-lsb').textContent = lsb.toFixed(6) + ' V';
        document.getElementById('computed-midcode').textContent = '0x' + midCode.toString(16).toUpperCase() + ' = ' + (midCode * lsb).toFixed(4) + ' V';
        document.getElementById('computed-nyquist').textContent = nyquist + ' Hz';
        document.getElementById('computed-spp').textContent = spp;
    },

    getConverterType() {
        return document.getElementById('converter-select').value;
    },

    getNumBits() {
        return parseInt(document.getElementById('param-bits').value);
    },

    getSampleRate() {
        return parseInt(document.getElementById('param-sample-rate-num').value) || 1000;
    },

    getNumSamples() {
        return parseInt(document.getElementById('param-num-samples').value);
    },

    getFrequency() {
        return parseFloat(document.getElementById('signal-frequency-num').value) || 100;
    },

    getParams() {
        const type = this.getConverterType();
        const params = {};

        if (type === 'pipeline_adc') {
            params.num_stages = parseInt(document.getElementById('param-stages').value);
            params.bits_per_stage = parseInt(document.getElementById('param-bits-per-stage').value);
        } else if (type === 'sigma_delta_adc') {
            params.osr = parseInt(document.getElementById('param-osr').value);
        } else {
            params.num_bits = this.getNumBits();
        }

        if (type === 'current_dac') {
            params.mode = document.getElementById('param-dac-mode').value;
        }

        params.vref = this.getVref();
        return params;
    },

    getVref() {
        const v = parseFloat(document.getElementById('param-vref').value);
        return (v && v > 0) ? v : 1.0;
    },

    validateVref() {
        const el = document.getElementById('param-vref');
        const v = parseFloat(el.value);
        const banner = document.getElementById('error-banner');
        if (!v || v <= 0) {
            banner.textContent = '⚠️ Vref must be greater than 0. Please enter a positive value.';
            banner.style.display = 'block';
            return false;
        }
        banner.style.display = 'none';
        return true;
    },

    validateFrequency() {
        const type = this.getConverterType();
        const isDAC = type === 'r2r_dac' || type === 'current_dac';
        const signalType = document.getElementById('signal-type').value;
        if (isDAC || signalType === 'dc') return true;

        const el = document.getElementById('signal-frequency-num');
        const f = parseFloat(el.value);
        const banner = document.getElementById('error-banner');
        if (isNaN(f) || f < 0) {
            banner.textContent = '⚠️ Frequency must be 0 or greater. Please enter a non-negative value.';
            banner.style.display = 'block';
            return false;
        }
        banner.style.display = 'none';
        return true;
    },

    validateAmplitude() {
        const type = this.getConverterType();
        const isDAC = type === 'r2r_dac' || type === 'current_dac';
        if (isDAC) return true;

        const el = document.getElementById('signal-amplitude-num');
        const a = parseFloat(el.value);
        const banner = document.getElementById('error-banner');
        if (isNaN(a) || a < 0) {
            banner.textContent = '⚠️ Amplitude must be 0 or greater. Minimum voltage is 0V.';
            banner.style.display = 'block';
            return false;
        }
        banner.style.display = 'none';
        return true;
    },

    getSignalConfig() {
        const type = this.getConverterType();
        const isDAC = type === 'r2r_dac' || type === 'current_dac';

        if (isDAC) {
            const inputMode = document.getElementById('dac-input-mode').value;
            const config = {
                input_mode: inputMode,
                clock_freq: parseFloat(document.getElementById('dac-clock-freq').value) || 10000,
                num_samples: this.getNumSamples(),
            };
            if (inputMode === 'frequency') {
                config.out_freq = parseFloat(document.getElementById('dac-out-freq').value) || 100;
                config.out_amp = parseFloat(document.getElementById('dac-out-amp').value) || 0.8;
                config.num_cycles = parseInt(document.getElementById('dac-num-cycles').value) || 2;
            } else if (inputMode === 'codewords') {
                config.codes = document.getElementById('dac-manual-codes').value;
            }
            return config;
        }

        return {
            type: document.getElementById('signal-type').value,
            amplitude: parseFloat(document.getElementById('signal-amplitude-num').value),
            frequency: this.getFrequency(),
            sample_rate: this.getSampleRate(),
            num_samples: this.getNumSamples(),
            duty_cycle: parseInt(document.getElementById('signal-duty').value) || 50,
        };
    },

    updateCodewordTable(data) {
        const tbody = document.getElementById('codeword-tbody');
        tbody.innerHTML = '';

        if (!data || !data.digital_codes) {
            document.getElementById('codeword-count').textContent = '';
            return;
        }

        const numBits = data.num_bits || 8;
        const lsb = data.lsb || (1.0 / Math.pow(2, numBits));
        const maxRows = 1000;
        const codes = data.digital_codes;
        const count = Math.min(codes.length, maxRows);

        for (let i = 0; i < count; i++) {
            const code = codes[i];
            const tr = document.createElement('tr');
            const time = data.time ? data.time[i].toFixed(6) : (i + '');
            const vin = data.input_signal ? data.input_signal[i].toFixed(4) : '-';
            const binary = code.toString(2).padStart(numBits, '0');
            const vout = (code * lsb).toFixed(4);
            const error = data.input_signal ? (data.input_signal[i] - code * lsb).toFixed(4) : '-';

            tr.innerHTML = `<td>${i + 1}</td><td>${time}</td><td>${vin}</td><td>${binary}</td><td>${code}</td><td>${vout}</td><td>${error}</td>`;
            tbody.appendChild(tr);
        }

        const label = codes.length > maxRows
            ? `Showing ${maxRows} of ${codes.length}`
            : `${codes.length} rows`;
        document.getElementById('codeword-count').textContent = label;
    },

    clearCodewordTable() {
        document.getElementById('codeword-tbody').innerHTML = '';
        document.getElementById('codeword-count').textContent = '';
    },

    updateExplanation(text) {
        document.getElementById('explanation-text').textContent = text || '';
    },

    updateLog(history) {
        const log = document.getElementById('log-content');
        if (!history || history.length === 0) {
            log.textContent = 'No log entries. Run a simulation first.';
            return;
        }
        const items = history.slice(-30);
        const lines = items.map((h, i) => {
            const idx = h.step_index || (history.length - items.length + i + 1);
            if (h.output_voltage !== undefined) {
                // DAC format
                return `[${idx}] Code: ${h.input_code} (${h.binary_code || ''}) → Vout: ${h.output_voltage.toFixed(4)} V`;
            } else if (h.binary_code !== undefined || h.digital_code !== undefined) {
                // ADC format (SAR, Flash, Pipeline)
                const code = h.digital_code !== undefined ? h.digital_code : '-';
                const vin = h.input_voltage !== undefined ? h.input_voltage.toFixed(4) : '-';
                const bin = h.binary_code || '';
                return `[${idx}] Vin: ${vin} → Code: ${code} (${bin})`;
            } else if (h.comparator_output !== undefined) {
                // Sigma-delta format
                const vin = h.input_voltage !== undefined ? h.input_voltage.toFixed(4) : '-';
                const integ = h.integrator_current !== undefined ? h.integrator_current.toFixed(4) : '-';
                return `[${idx}] Vin: ${vin} | Comp: ${h.comparator_output} | Integrator: ${integ}`;
            } else {
                // Generic fallback
                const vin = h.input_voltage !== undefined ? h.input_voltage.toFixed(4) : '-';
                return `[${idx}] Vin: ${vin}`;
            }
        });
        log.textContent = lines.join('\n');
    },

    setAliasingWarning(aliasing) {
        const el = document.getElementById('aliasing-warning');
        if (aliasing && aliasing.is_aliased) {
            el.style.display = '';
            el.textContent = aliasing.message;
        } else {
            el.style.display = 'none';
        }
    },

    showMetrics(data) {
        const panel = document.getElementById('metrics-panel');
        panel.style.display = '';
        // Basic metric computation from data
        if (data.snr_theoretical) {
            document.getElementById('metric-snr').textContent = data.snr_theoretical.snr_db.toFixed(1) + ' dB';
            document.getElementById('metric-enob').textContent = data.snr_theoretical.enob.toFixed(1);
        } else {
            document.getElementById('metric-snr').textContent = '-';
            document.getElementById('metric-enob').textContent = data.num_bits || '-';
        }
        document.getElementById('metric-sfdr').textContent = '-';
        document.getElementById('metric-inl').textContent = '-';
        document.getElementById('metric-dnl').textContent = '-';
    }
};
