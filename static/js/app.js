// Theme helper for canvas backgrounds
function getCanvasBg() {
    return document.documentElement.getAttribute('data-theme') === 'dark' ? '#0d1b2a' : '#ffffff';
}
function getCanvasTextColor() {
    return document.documentElement.getAttribute('data-theme') === 'dark' ? '#e0e0e0' : '#1a1a1a';
}

// Main application logic
const App = {
    currentData: null,
    playbackInterval: null,
    stepIndex: 0,
    sessionId: 'session_' + Date.now(),

    init() {
        UI.init();
        this.resizeCanvases();
        this.loadTheory();
        window.addEventListener('resize', () => this.resizeCanvases());
        console.log('ADC/DAC Simulator initialized');
    },

    resizeCanvases() {
        // Redraw placeholders or data
        if (this.currentData) {
            this.updateGraphs();
        } else {
            UI.drawPlaceholders();
        }
    },

    async runSimulation() {
        if (!UI.validateVref()) return;
        try {
            const converterType = UI.getConverterType();
            const params = UI.getParams();
            const signal = UI.getSignalConfig();

            const data = await API.simulate(converterType, params, signal);
            this.currentData = data;
            this.stepIndex = 0;
            this.enablePlayback();

            this.updateGraphs();
            UI.updateCodewordTable(data);
            UI.updateExplanation(data.explanation || 'Simulation complete.');
            UI.setAliasingWarning(data.aliasing);
            UI.showMetrics(data);
            UI.updateLog(data.history || data.results || []);

            // Draw circuit and analogy
            this.lastVizType = converterType;
            this.lastVizData = data;
            this.drawCircuit(converterType, data);
            this.drawAnalogy(converterType, data);

        } catch (err) {
            console.error('Simulation error:', err);
            UI.updateExplanation('Error: ' + err.message);
        }
    },

    async stepSimulation() {
        if (!UI.validateVref()) return;
        try {
            const converterType = UI.getConverterType();
            const params = UI.getParams();
            const isDAC = converterType === 'r2r_dac' || converterType === 'current_dac';
            const vref = parseFloat(document.getElementById('param-vref').value) || 1.0;
            const numBits = UI.getNumBits();
            const numLevels = Math.pow(2, numBits);

            let inputValue;

            if (isDAC) {
                // DACs expect an integer code; generate a time-varying code sequence
                const clockFreq = parseFloat(document.getElementById('dac-clock-freq').value) || 10000;
                const inputMode = document.getElementById('dac-input-mode').value;
                if (inputMode === 'frequency') {
                    const outFreq = parseFloat(document.getElementById('dac-out-freq').value) || 100;
                    const outAmp = parseFloat(document.getElementById('dac-out-amp').value) || 0.8;
                    const t = this.stepIndex / clockFreq;
                    const ampNorm = Math.min(outAmp / (vref || 1), 1.0);
                    const normalized = (Math.sin(2 * Math.PI * outFreq * t) * ampNorm + 1) / 2;
                    inputValue = Math.round(normalized * (numLevels - 1));
                } else if (inputMode === 'codewords') {
                    const codesStr = document.getElementById('dac-manual-codes').value || '0';
                    const codes = codesStr.split(',').map(c => parseInt(c.trim())).filter(c => !isNaN(c));
                    inputValue = codes[this.stepIndex % codes.length];
                } else if (inputMode === 'ramp') {
                    inputValue = this.stepIndex % numLevels;
                } else {
                    // step mode
                    inputValue = this.stepIndex % (numLevels * 2) < numLevels ? 0 : Math.floor(numLevels / 2);
                }
                inputValue = Math.max(0, Math.min(numLevels - 1, inputValue));
            } else {
                // ADCs expect a voltage; generate time-varying sine
                const amplitude = parseFloat(document.getElementById('signal-amplitude-num').value);
                const frequency = parseFloat(document.getElementById('signal-frequency-num').value) || 100;
                const sampleRate = parseFloat(document.getElementById('param-sample-rate-num').value) || 1000;
                const t = this.stepIndex / sampleRate;
                inputValue = amplitude * Math.sin(2 * Math.PI * frequency * t);
            }

            // For SAR, step through bits
            const isSAR = converterType === 'sar_adc';
            let bitIndex = isSAR ? (this.stepIndex % numBits) : undefined;

            const data = await API.step(this.sessionId, converterType, inputValue, params, bitIndex);
            this.stepIndex++;

            // For SAR, reset after full bit sequence; for others, reset each sample to allow next
            if (isSAR && data.state && (data.state.complete || data.state.completed)) {
                await API.reset(this.sessionId);
                this.sessionId = 'session_' + Date.now();
            } else if (!isSAR) {
                // Non-SAR converters complete in one step; reset session for next sample
                await API.reset(this.sessionId);
                this.sessionId = 'session_' + Date.now();
            }

            UI.updateExplanation(data.explanation);
            this.lastVizType = converterType;
            this.lastVizData = data.state;
            this.drawCircuit(converterType, data.state);
            this.drawAnalogy(converterType, data.state);

        } catch (err) {
            console.error('Step error:', err);
            // On error, reset session and keep going
            await API.reset(this.sessionId);
            this.sessionId = 'session_' + Date.now();
            this.stepIndex = 0;
        }
    },

    startPlayback() {
        const speed = parseInt(document.getElementById('playback-speed').value);
        document.getElementById('btn-play').disabled = true;
        document.getElementById('btn-pause').disabled = false;

        this.playbackInterval = setInterval(() => {
            this.stepSimulation();
        }, speed);
    },

    stopPlayback() {
        if (this.playbackInterval) {
            clearInterval(this.playbackInterval);
            this.playbackInterval = null;
        }
        document.getElementById('btn-play').disabled = false;
        document.getElementById('btn-pause').disabled = true;
    },

    enablePlayback() {
        document.getElementById('btn-reset').disabled = false;
        document.getElementById('btn-step').disabled = false;
        document.getElementById('btn-play').disabled = false;
        document.getElementById('playback-speed').disabled = false;
    },

    async resetSimulation() {
        this.stopPlayback();
        this.stepIndex = 0;
        await API.reset(this.sessionId);
        this.sessionId = 'session_' + Date.now();
        UI.updateExplanation('Reset. Ready for new simulation.');
        UI.setAliasingWarning(null);
    },

    updateGraphs() {
        if (!this.currentData) return;
        const data = this.currentData;

        if (data.type === 'adc') {
            this.updateADCGraphs(data);
        } else {
            this.updateDACGraphs(data);
        }
    },

    updateADCGraphs(data) {
        const inputCanvas = document.getElementById('graph-input');
        const outputCanvas = document.getElementById('graph-output');
        const reconCanvas = document.getElementById('graph-reconstructed');

        // Reset graph headers for ADC context
        document.querySelector('#graphs-container .graph-panel:nth-child(1) h4').textContent = 'Input Signal';
        document.querySelector('#graphs-container .graph-panel:nth-child(2) h4').textContent = 'Digital Codeword Output';
        document.querySelector('#graphs-container .graph-panel:nth-child(3) h4').textContent = 'Reconstructed Output';

        // Input graph
        if (UI.fftMode.input && data.input_fft) {
            Charts.plotFFT(inputCanvas, data.input_fft.frequencies, data.input_fft.magnitudes, {
                color: Charts.colors.input,
                nyquist: data.nyquist
            });
        } else {
            Charts.plotTimeDomain(inputCanvas, {
                x: data.time,
                y: data.input_signal
            }, {
                xLabel: 'Time (s)',
                yLabel: 'Voltage (V)',
                color: Charts.colors.input,
                showPoints: true,
                yMin: 0,
                yMax: data.vref
            });
        }

        // Output graph
        if (UI.fftMode.output && data.output_fft) {
            Charts.plotFFT(outputCanvas, data.output_fft.frequencies, data.output_fft.magnitudes, {
                color: Charts.colors.output,
                nyquist: data.nyquist
            });
        } else {
            Charts.plotTimeDomain(outputCanvas, {
                x: data.time,
                y: data.digital_codes
            }, {
                xLabel: 'Time (s)',
                yLabel: 'Code',
                color: Charts.colors.output,
                staircase: true,
                showPoints: true,
                yMin: 0,
                yMax: Math.pow(2, data.num_bits) - 1
            });
        }

        // Reconstructed graph
        Charts.plotTimeDomain(reconCanvas, {
            x: data.time,
            y: data.reconstructed,
            overlay: data.input_signal
        }, {
            xLabel: 'Time (s)',
            yLabel: 'Voltage (V)',
            color: Charts.colors.reconstructed,
            overlayColor: Charts.colors.input,
            staircase: true,
            yMin: 0,
            yMax: data.vref
        });
    },

    updateDACGraphs(data) {
        const inputCanvas = document.getElementById('graph-input');
        const outputCanvas = document.getElementById('graph-output');
        const reconCanvas = document.getElementById('graph-reconstructed');

        const numBits = data.results[0]?.num_bits || 8;
        const vref = data.results[0]?.vref || 1.0;
        const maxCode = Math.pow(2, numBits) - 1;

        // Update graph headers for DAC context
        document.querySelector('#graphs-container .graph-panel:nth-child(1) h4').textContent = 'Input Codes';
        document.querySelector('#graphs-container .graph-panel:nth-child(2) h4').textContent = 'Analog Output';
        document.querySelector('#graphs-container .graph-panel:nth-child(3) h4').textContent = 'Transfer Characteristic';

        // Input codes
        Charts.plotTimeDomain(inputCanvas, {
            y: data.input_codes
        }, {
            xLabel: 'Sample',
            yLabel: 'Code',
            color: Charts.colors.input,
            staircase: true,
            yMin: 0,
            yMax: maxCode,
            noPad: true
        });

        // Analog output
        const outputVoltages = data.results.map(r => r.output_voltage);
        Charts.plotTimeDomain(outputCanvas, {
            y: outputVoltages
        }, {
            xLabel: 'Sample',
            yLabel: 'Voltage (V)',
            color: Charts.colors.output,
            staircase: true,
            yMin: 0,
            yMax: vref,
            noPad: true
        });

        // Transfer characteristic
        if (data.transfer_characteristic) {
            const tc = data.transfer_characteristic;
            Charts.plotTimeDomain(reconCanvas, {
                x: tc.codes,
                y: tc.actual_voltages,
                overlay: tc.ideal_voltages
            }, {
                xLabel: 'Input Code',
                yLabel: 'Output Voltage (V)',
                color: Charts.colors.output,
                overlayColor: Charts.colors.input,
                yMin: 0,
                yMax: vref,
                noPad: true
            });
        }
    },

    // Zoom state for visualizer canvases (scale-based)
    vizZoom: {},
    lastVizType: null,
    lastVizData: null,

    getVizZoom(canvasId) {
        if (!this.vizZoom[canvasId]) {
            this.vizZoom[canvasId] = { scale: 1.0, panX: 0, panY: 0 };
        }
        return this.vizZoom[canvasId];
    },

    vizZoomIn(canvasId) {
        const z = this.getVizZoom(canvasId);
        z.scale = Math.min(z.scale * 1.4, 100);
        this.redrawViz();
    },

    vizZoomOut(canvasId) {
        const z = this.getVizZoom(canvasId);
        z.scale = Math.max(z.scale / 1.4, 0.001);
        this.redrawViz();
    },

    vizZoomReset(canvasId) {
        this.vizZoom[canvasId] = { scale: 1.0, panX: 0, panY: 0 };
        this.redrawViz();
    },

    redrawViz() {
        const type = this.lastVizType || UI.getConverterType();
        const data = this.lastVizData || this.currentData;
        if (data) {
            this.drawCircuit(type, data);
            this.drawAnalogy(type, data);
            if (type === 'sar_adc') this.drawSARInternals();
        }
    },

    drawSARInternals() {
        const canvas = document.getElementById('sar-internals-canvas');
        if (!canvas || canvas.style.display === 'none') return;
        const ctx = canvas.getContext('2d');
        const data = this.lastVizData || this.currentData;
        SARVisualizer.drawInternals(ctx, canvas, data);
    },

    drawCircuit(type, data) {
        const canvas = document.getElementById('circuit-canvas');
        const ctx = canvas.getContext('2d');
        const z = this.getVizZoom('circuit-canvas');

        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (z.scale !== 1.0 || z.panX !== 0 || z.panY !== 0) {
            const cx = canvas.width / 2;
            const cy = canvas.height / 2;
            ctx.translate(cx + z.panX, cy + z.panY);
            ctx.scale(z.scale, z.scale);
            ctx.translate(-cx, -cy);
        }

        switch (type) {
            case 'flash_adc': FlashVisualizer.drawCircuit(ctx, canvas, data); break;
            case 'sar_adc': SARVisualizer.drawCircuit(ctx, canvas, data); break;
            case 'sigma_delta_adc': SigmaDeltaVisualizer.drawCircuit(ctx, canvas, data); break;
            case 'pipeline_adc': PipelineVisualizer.drawCircuit(ctx, canvas, data); break;
            case 'r2r_dac': R2RVisualizer.drawCircuit(ctx, canvas, data); break;
            case 'current_dac': CurrentDACVisualizer.drawCircuit(ctx, canvas, data); break;
        }

        ctx.restore();

        // Zoom indicator
        if (z.scale !== 1.0) {
            ctx.fillStyle = 'rgba(0, 212, 255, 0.8)';
            ctx.font = '10px sans-serif';
            ctx.fillText(`${Math.round(z.scale * 100)}%`, canvas.width - 40, canvas.height - 8);
        }
    },

    drawAnalogy(type, data) {
        const canvas = document.getElementById('analogy-canvas');
        const ctx = canvas.getContext('2d');
        const z = this.getVizZoom('analogy-canvas');

        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (z.scale !== 1.0 || z.panX !== 0 || z.panY !== 0) {
            const cx = canvas.width / 2;
            const cy = canvas.height / 2;
            ctx.translate(cx + z.panX, cy + z.panY);
            ctx.scale(z.scale, z.scale);
            ctx.translate(-cx, -cy);
        }

        switch (type) {
            case 'flash_adc': FlashVisualizer.drawLUT(ctx, canvas, data); break;
            case 'sar_adc': SARVisualizer.drawBST(ctx, canvas, data); break;
            case 'sigma_delta_adc': SigmaDeltaVisualizer.drawRNN(ctx, canvas, data); break;
            case 'pipeline_adc': PipelineVisualizer.drawStages(ctx, canvas, data); break;
            case 'r2r_dac': R2RVisualizer.drawLadder(ctx, canvas, data); break;
            case 'current_dac': CurrentDACVisualizer.drawSources(ctx, canvas, data); break;
        }

        ctx.restore();

        // Zoom indicator
        if (z.scale !== 1.0) {
            ctx.fillStyle = 'rgba(0, 212, 255, 0.8)';
            ctx.font = '10px sans-serif';
            ctx.fillText(`${Math.round(z.scale * 100)}%`, canvas.width - 40, canvas.height - 8);
        }
    },

    exportCSV() {
        if (!this.currentData) return;
        const data = this.currentData;
        let csv = 'Sample,Time,Input,Code_Decimal,Code_Binary,Reconstructed,Error\n';

        if (data.digital_codes) {
            const numBits = data.num_bits || 8;
            const lsb = data.lsb || 1.0 / Math.pow(2, numBits);
            data.digital_codes.forEach((code, i) => {
                const time = data.time ? data.time[i].toFixed(6) : i;
                const input = data.input_signal ? data.input_signal[i].toFixed(6) : '';
                const binary = code.toString(2).padStart(numBits, '0');
                const recon = (code * lsb).toFixed(6);
                const error = data.input_signal ? (data.input_signal[i] - code * lsb).toFixed(6) : '';
                csv += `${i + 1},${time},${input},${code},${binary},${recon},${error}\n`;
            });
        }

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'simulation_data.csv';
        a.click();
        URL.revokeObjectURL(url);
    },

    exportPNG() {
        const canvas = document.getElementById('graph-output');
        const url = canvas.toDataURL('image/png');
        const a = document.createElement('a');
        a.href = url;
        a.download = 'simulation_plot.png';
        a.click();
    },

    copyCodewords() {
        if (!this.currentData || !this.currentData.digital_codes) return;
        const codes = this.currentData.digital_codes.join(', ');
        navigator.clipboard.writeText(codes).then(() => {
            alert('Codewords copied to clipboard!');
        });
    },

    loadTheory() {
        const theories = {
            flash_adc: `<h5>Flash ADC</h5><p>A Flash ADC uses 2^N-1 comparators in parallel to convert an analog input in a single clock cycle. Each comparator threshold is set by a resistor ladder.</p><h5>Tradeoffs</h5><p>Fastest architecture (1 cycle) but exponential hardware cost. Used for low-resolution, high-speed applications (video, oscilloscopes, 6-8 bits at GHz rates).</p><h5>Key Equation</h5><p>Resolution = 2^N levels, requires 2^N - 1 comparators</p>`,
            sar_adc: `<h5>SAR ADC</h5><p>Successive Approximation Register ADC performs a binary search on voltage levels. It tests one bit per clock cycle, from MSB to LSB, using an internal DAC and comparator.</p><h5>Tradeoffs</h5><p>Good balance of speed and resolution (10-18 bits, up to ~10 MSPS). Low power. Used in data acquisition, sensors, and medical devices.</p><h5>Key Equation</h5><p>Conversion time = N clock cycles for N bits. Equivalent to binary search O(log₂(2^N)) = O(N).</p>`,
            sigma_delta_adc: `<h5>Sigma-Delta ADC</h5><p>Uses oversampling and noise shaping to achieve high resolution with simple hardware (1-bit quantizer). A feedback loop with an integrator shapes quantization noise to higher frequencies, then a decimation filter removes it.</p><h5>Tradeoffs</h5><p>Very high resolution (16-24 bits) but low speed. Used for audio, precision measurement, and weighing scales.</p><h5>Key Equation</h5><p>SNR = 6.02N + 1.76 + 30·log₁₀(OSR) dB for first-order modulator</p>`,
            pipeline_adc: `<h5>Pipeline ADC</h5><p>Splits conversion across multiple stages, each resolving a few bits. Stages operate in parallel on different samples (pipelining), achieving high throughput with moderate resolution.</p><h5>Tradeoffs</h5><p>High throughput (10-14 bits at 100+ MSPS). Latency of N stages. Used in communications, radar, and imaging.</p><h5>Key Equation</h5><p>Total bits = stages × bits_per_stage. Latency = num_stages cycles.</p>`,
            r2r_dac: `<h5>R-2R Ladder DAC</h5><p>Uses a network of only two resistor values (R and 2R) to create binary-weighted voltage division. Each bit switches between Vref and GND, contributing its weighted portion to the output.</p><h5>Tradeoffs</h5><p>Simple, only needs 2 resistor values (good for IC fabrication). Moderate speed. 8-16 bit resolutions common.</p><h5>Key Equation</h5><p>Vout = Vref × Σ(bₙ × 2^(-n)) for n = 1 to N</p>`,
            current_dac: `<h5>Current-Steering DAC</h5><p>Uses an array of current sources that are switched to either the output or a dump node. Binary-weighted uses sources of I, 2I, 4I... while thermometer-coded uses 2^N-1 equal unit sources.</p><h5>Tradeoffs</h5><p>Very fast (current switching is faster than voltage). Thermometer coding eliminates major-carry glitches. Used in high-speed communications and waveform generation.</p><h5>Key Equation</h5><p>Vout = I_total × R_load. Glitch energy ∝ number of simultaneously switching bits.</p>`,
        };

        document.getElementById('theory-content').innerHTML = theories[UI.getConverterType()] || '';
        document.getElementById('converter-select').addEventListener('change', () => {
            document.getElementById('theory-content').innerHTML = theories[UI.getConverterType()] || '';
        });
    }
};

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => App.init());
