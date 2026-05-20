// Current-Steering DAC Visualizer
const CurrentDACVisualizer = {
    drawCircuit(ctx, canvas, data) {
        const w = canvas.width, h = canvas.height;
        ctx.fillStyle = getCanvasBg();
        ctx.fillRect(0, 0, w, h);

        const state = data?.history ? data.history[data.history.length - 1] :
                      (data?.results ? data.results[data.results.length - 1] : data);
        const mode = state?.mode || 'binary';
        const numBits = state?.num_bits || 4;

        ctx.fillStyle = '#00d4ff';
        ctx.font = '11px sans-serif';
        ctx.fillText(`Current-Steering DAC (${mode}-weighted, ${numBits} bits)`, 10, 18);

        if (mode === 'binary') {
            this._drawBinaryWeighted(ctx, w, h, state);
        } else {
            this._drawThermometer(ctx, w, h, state);
        }
    },

    _drawBinaryWeighted(ctx, w, h, state) {
        const sources = state?.sources || [];
        const numSources = Math.min(sources.length, 12);
        const srcW = Math.min((w - 40) / numSources, 60);
        const srcY = 60;
        const busY = h - 80;

        // Output bus
        ctx.strokeStyle = '#00ff88';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(20, busY);
        ctx.lineTo(w - 20, busY);
        ctx.stroke();
        ctx.fillStyle = '#00ff88';
        ctx.font = '10px sans-serif';
        ctx.fillText('Output Bus (R_load)', w - 130, busY - 8);

        for (let i = 0; i < numSources; i++) {
            const x = 20 + i * srcW + srcW / 2;
            const src = sources[i];
            const isActive = src?.bit_value === 1;

            // Current source symbol (circle with arrow)
            ctx.beginPath();
            ctx.arc(x, srcY + 15, 12, 0, Math.PI * 2);
            ctx.fillStyle = isActive ? 'rgba(0, 255, 136, 0.2)' : 'rgba(255, 68, 68, 0.1)';
            ctx.fill();
            ctx.strokeStyle = isActive ? '#00ff88' : '#666';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // Arrow inside
            ctx.beginPath();
            ctx.moveTo(x, srcY + 5);
            ctx.lineTo(x, srcY + 22);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(x - 3, srcY + 18);
            ctx.lineTo(x, srcY + 22);
            ctx.lineTo(x + 3, srcY + 18);
            ctx.fill();

            // Weight label
            ctx.fillStyle = '#ffaa00';
            ctx.font = '8px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(src?.label || `${Math.pow(2, numSources - 1 - i)}I`, x, srcY - 2);

            // Switch
            const switchY = srcY + 40;
            ctx.fillStyle = isActive ? '#00ff88' : '#ff4444';
            ctx.fillRect(x - 10, switchY, 20, 10);
            ctx.fillStyle = '#000';
            ctx.font = '7px sans-serif';
            ctx.fillText(isActive ? 'OUT' : 'DMP', x, switchY + 8);

            // Connection to bus
            if (isActive) {
                ctx.strokeStyle = '#00ff88';
                ctx.lineWidth = 1.5;
            } else {
                ctx.strokeStyle = '#333';
                ctx.lineWidth = 0.5;
            }
            ctx.beginPath();
            ctx.moveTo(x, switchY + 10);
            ctx.lineTo(x, busY);
            ctx.stroke();

            ctx.textAlign = 'left';
        }

        // Output voltage
        if (state?.output_voltage !== undefined) {
            ctx.fillStyle = '#00ff88';
            ctx.font = '12px monospace';
            ctx.fillText(`Vout = ${state.output_voltage.toFixed(4)} V`, 20, h - 30);
            ctx.fillStyle = '#ccc';
            ctx.font = '10px monospace';
            ctx.fillText(`I_total = ${state.total_current.toFixed(6)} A`, 20, h - 15);
        }

        // Glitch info
        if (state?.glitch?.is_major_carry) {
            ctx.fillStyle = '#ff4444';
            ctx.font = '10px sans-serif';
            ctx.fillText('⚠ MAJOR CARRY GLITCH', w - 180, h - 15);
        }

        ctx.lineWidth = 1;
    },

    _drawThermometer(ctx, w, h, state) {
        const numActive = state?.active_sources || 0;
        const numTotal = state?.num_unit_sources || 7;
        const maxDraw = Math.min(numTotal, 20);

        const srcSize = Math.min(30, (w - 40) / Math.ceil(Math.sqrt(maxDraw)));
        const cols = Math.floor((w - 40) / srcSize);
        const busY = h - 60;

        for (let i = 0; i < maxDraw; i++) {
            const row = Math.floor(i / cols);
            const col = i % cols;
            const x = 20 + col * srcSize;
            const y = 50 + row * srcSize;
            const isActive = i < numActive;

            ctx.fillStyle = isActive ? 'rgba(0, 255, 136, 0.4)' : 'rgba(100, 100, 100, 0.2)';
            ctx.fillRect(x + 2, y + 2, srcSize - 4, srcSize - 4);
            ctx.strokeStyle = isActive ? '#00ff88' : '#444';
            ctx.strokeRect(x + 2, y + 2, srcSize - 4, srcSize - 4);

            ctx.fillStyle = isActive ? '#fff' : '#666';
            ctx.font = '8px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('I', x + srcSize / 2, y + srcSize / 2 + 3);
            ctx.textAlign = 'left';
        }

        ctx.fillStyle = '#00ff88';
        ctx.font = '11px monospace';
        ctx.fillText(`Active: ${numActive} / ${numTotal} sources`, 20, busY + 10);
        if (state?.output_voltage !== undefined) {
            ctx.fillText(`Vout = ${state.output_voltage.toFixed(4)} V`, 20, busY + 28);
        }
    },

    drawSources(ctx, canvas, data) {
        const w = canvas.width, h = canvas.height;
        ctx.fillStyle = getCanvasBg();
        ctx.fillRect(0, 0, w, h);

        const state = data?.history ? data.history[data.history.length - 1] :
                      (data?.results ? data.results[data.results.length - 1] : data);

        ctx.fillStyle = '#00d4ff';
        ctx.font = '11px sans-serif';
        ctx.fillText('Glitch Analysis', 10, 18);

        // Show glitch history
        const history = data?.history || (data?.results || []);
        if (history.length < 2) {
            ctx.fillStyle = '#666';
            ctx.fillText('Need multiple transitions to show glitch data', 10, h / 2);
            return;
        }

        const glitches = history.filter(h => h.glitch).map(h => h.glitch);
        const maxGlitch = Math.max(...glitches.map(g => g.glitch_magnitude), 0.01);
        const barW = Math.min((w - 60) / glitches.length, 30);
        const plotH = h - 80;

        glitches.slice(-20).forEach((g, i) => {
            const x = 30 + i * barW;
            const barH = (g.glitch_magnitude / maxGlitch) * plotH;
            const y = 40 + plotH - barH;

            ctx.fillStyle = g.is_major_carry ? '#ff4444' : '#ffaa00';
            ctx.fillRect(x + 1, y, barW - 2, barH);

            if (barW > 15) {
                ctx.fillStyle = '#ccc';
                ctx.font = '7px monospace';
                ctx.textAlign = 'center';
                ctx.fillText(g.bits_changed.toString(), x + barW / 2, 40 + plotH + 12);
                ctx.textAlign = 'left';
            }
        });

        ctx.fillStyle = '#ccc';
        ctx.font = '9px sans-serif';
        ctx.fillText('Bits changed per transition', 10, h - 10);
        ctx.fillStyle = '#ff4444';
        ctx.fillText('■ Major carry', w - 100, h - 10);
    }
};
