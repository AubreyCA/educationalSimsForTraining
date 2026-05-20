// Sigma-Delta ADC Visualizer
const SigmaDeltaVisualizer = {
    drawCircuit(ctx, canvas, data) {
        const w = canvas.width, h = canvas.height;
        ctx.fillStyle = getCanvasBg();
        ctx.fillRect(0, 0, w, h);

        ctx.fillStyle = '#00d4ff';
        ctx.font = '11px sans-serif';
        ctx.fillText('Sigma-Delta Modulator (1st Order)', 10, 18);

        const state = data?.history ? data.history[data.history.length - 1] : (data?.steps ? data.steps[data.steps.length - 1] : data);
        const centerY = h / 2;

        // Summing junction (subtractor)
        const sumX = 80, sumY = centerY;
        ctx.beginPath();
        ctx.arc(sumX, sumY, 15, 0, Math.PI * 2);
        ctx.strokeStyle = '#00d4ff';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = '#00d4ff';
        ctx.font = '14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Σ', sumX, sumY + 5);
        ctx.font = '9px sans-serif';
        ctx.fillText('+', sumX - 10, sumY - 5);
        ctx.fillText('−', sumX + 10, sumY + 12);

        // Input arrow
        ctx.strokeStyle = '#00d4ff';
        ctx.beginPath();
        ctx.moveTo(20, sumY);
        ctx.lineTo(sumX - 15, sumY);
        ctx.stroke();
        ctx.fillStyle = '#00d4ff';
        ctx.font = '10px monospace';
        ctx.textAlign = 'left';
        ctx.fillText('x(t)', 15, sumY - 10);
        if (state?.input_voltage !== undefined) {
            ctx.fillText(state.input_voltage.toFixed(3), 15, sumY + 15);
        }

        // Integrator
        const intX = 180, intY = centerY;
        ctx.fillStyle = '#1a3a5c';
        ctx.fillRect(intX - 30, intY - 25, 60, 50);
        ctx.strokeStyle = '#ffaa00';
        ctx.strokeRect(intX - 30, intY - 25, 60, 50);
        ctx.fillStyle = '#ffaa00';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('∫', intX, intY + 5);
        ctx.textAlign = 'left';

        // Integrator state
        if (state?.integrator_current !== undefined) {
            ctx.fillStyle = '#ffaa00';
            ctx.font = '9px monospace';
            ctx.fillText('h=' + state.integrator_current.toFixed(3), intX - 25, intY + 38);
        }

        // Connection: sum → integrator
        ctx.strokeStyle = '#aaa';
        ctx.beginPath();
        ctx.moveTo(sumX + 15, sumY);
        ctx.lineTo(intX - 30, intY);
        ctx.stroke();

        // Comparator
        const compX = 300, compY = centerY;
        ctx.beginPath();
        ctx.moveTo(compX - 15, compY - 20);
        ctx.lineTo(compX + 15, compY);
        ctx.lineTo(compX - 15, compY + 20);
        ctx.closePath();
        ctx.fillStyle = state?.comparator_output === 1 ? '#00ff88' : '#ff4444';
        ctx.fill();
        ctx.strokeStyle = '#aaa';
        ctx.stroke();

        // Connection: integrator → comparator
        ctx.strokeStyle = '#aaa';
        ctx.beginPath();
        ctx.moveTo(intX + 30, intY);
        ctx.lineTo(compX - 15, compY);
        ctx.stroke();

        // Output
        ctx.strokeStyle = '#00ff88';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(compX + 15, compY);
        ctx.lineTo(compX + 80, compY);
        ctx.stroke();
        ctx.fillStyle = '#00ff88';
        ctx.font = '14px monospace';
        ctx.fillText(state?.comparator_output !== undefined ? state.comparator_output.toString() : '?', compX + 85, compY + 5);

        // 1-bit DAC (feedback)
        const dacX = 300, dacY = centerY + 80;
        ctx.fillStyle = '#1a3a5c';
        ctx.fillRect(dacX - 30, dacY - 15, 60, 30);
        ctx.strokeStyle = '#ff4444';
        ctx.strokeRect(dacX - 30, dacY - 15, 60, 30);
        ctx.fillStyle = '#ff4444';
        ctx.font = '9px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('1-bit DAC', dacX, dacY + 4);
        ctx.textAlign = 'left';

        // Feedback path
        ctx.strokeStyle = '#ff4444';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(compX + 50, compY);
        ctx.lineTo(compX + 50, dacY);
        ctx.lineTo(dacX + 30, dacY);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(dacX - 30, dacY);
        ctx.lineTo(sumX, dacY);
        ctx.lineTo(sumX, sumY + 15);
        ctx.stroke();

        if (state?.feedback_value !== undefined) {
            ctx.fillStyle = '#ff4444';
            ctx.font = '9px monospace';
            ctx.fillText('fb=' + state.feedback_value.toFixed(3), dacX - 25, dacY + 25);
        }

        // Bitstream display
        if (state?.bitstream) {
            const bits = state.bitstream.slice(-40);
            ctx.fillStyle = '#888';
            ctx.font = '9px sans-serif';
            ctx.fillText('Bitstream (last 40):', 10, h - 35);
            ctx.fillStyle = '#00ff88';
            ctx.font = '10px monospace';
            ctx.fillText(bits.join(''), 10, h - 20);
        }

        ctx.lineWidth = 1;
    },

    drawRNN(ctx, canvas, data) {
        const w = canvas.width, h = canvas.height;
        ctx.fillStyle = getCanvasBg();
        ctx.fillRect(0, 0, w, h);

        ctx.fillStyle = '#00d4ff';
        ctx.font = '12px sans-serif';
        ctx.fillText('RNN Analogy: Sigma-Delta as Recurrent Network', 10, 18);

        const history = data?.history || (data?.steps ? data.steps : []);
        const numCells = 6; // Always show 6 unrolled cells
        const margin = 60;
        const cellSpacing = (w - margin * 2) / numCells;
        const centerY = h / 2;
        const cellSize = Math.min(36, cellSpacing * 0.4);

        // Draw h₀ (initial hidden state)
        const h0x = margin - cellSpacing * 0.4;
        ctx.beginPath();
        ctx.arc(h0x, centerY, cellSize * 0.5, 0, Math.PI * 2);
        ctx.fillStyle = '#2a1a4a';
        ctx.fill();
        ctx.strokeStyle = '#bb88ff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.fillStyle = '#bb88ff';
        ctx.font = '11px serif';
        ctx.textAlign = 'center';
        ctx.fillText('h₀', h0x, centerY + 4);

        // Arrow from h₀ to first cell
        const firstCellX = margin + cellSpacing / 2;
        ctx.strokeStyle = '#ff8800';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(h0x + cellSize * 0.5, centerY);
        ctx.lineTo(firstCellX - cellSize - 4, centerY);
        ctx.stroke();
        this._drawArrowHead(ctx, firstCellX - cellSize - 4, centerY, 'right', '#ff8800');

        // Draw each unrolled cell
        for (let i = 0; i < numCells; i++) {
            const cx = margin + i * cellSpacing + cellSpacing / 2;
            const isLast = (i === numCells - 1);
            const isDots = (i === numCells - 2); // Second to last shows "..."

            if (isDots) {
                // Draw dots between cells
                ctx.fillStyle = '#aaa';
                ctx.font = '20px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText('· · ·', cx, centerY + 6);

                // Still draw arrows through
                if (i < numCells - 1) {
                    const nextX = margin + (i + 1) * cellSpacing + cellSpacing / 2;
                    ctx.strokeStyle = '#ff8800';
                    ctx.lineWidth = 1.5;
                    ctx.beginPath();
                    ctx.moveTo(cx + 25, centerY);
                    ctx.lineTo(nextX - cellSize - 4, centerY);
                    ctx.stroke();
                    this._drawArrowHead(ctx, nextX - cellSize - 4, centerY, 'right', '#ff8800');
                }
                continue;
            }

            // Get data for this cell if available
            const stepData = history.length > 0 ? history[Math.min(i, history.length - 1)] : null;
            const label = isLast ? 'n' : (i + 1).toString();

            // Hidden state cell (rectangle like reference image)
            const rectW = cellSize * 2;
            const rectH = cellSize * 1.6;
            const hasData = stepData && stepData.integrator_current !== undefined;

            // Cell background
            if (hasData) {
                const val = stepData.integrator_current;
                const norm = Math.min(1, Math.max(0, Math.abs(val) / 20));
                ctx.fillStyle = `rgba(180, 140, 255, ${0.2 + norm * 0.5})`;
            } else {
                ctx.fillStyle = '#1a1a3a';
            }
            ctx.fillRect(cx - rectW / 2, centerY - rectH / 2, rectW, rectH);
            ctx.strokeStyle = '#9966cc';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(cx - rectW / 2, centerY - rectH / 2, rectW, rectH);

            // h_n label inside cell
            ctx.fillStyle = '#ddc0ff';
            ctx.font = '13px serif';
            ctx.textAlign = 'center';
            ctx.fillText(`h${this._subscript(label)}`, cx, centerY + 5);

            // Show integrator value if available
            if (hasData) {
                ctx.fillStyle = '#ffaa00';
                ctx.font = '8px monospace';
                ctx.fillText(stepData.integrator_current.toFixed(2), cx, centerY + rectH / 2 - 4);
            }

            // --- Input x_i (from below) ---
            const inputY = centerY + rectH / 2 + 50;
            // Input circle
            ctx.beginPath();
            ctx.arc(cx, inputY, cellSize * 0.45, 0, Math.PI * 2);
            ctx.fillStyle = '#1a3a4a';
            ctx.fill();
            ctx.strokeStyle = '#00d4ff';
            ctx.lineWidth = 1.5;
            ctx.stroke();
            // x label
            ctx.fillStyle = '#00d4ff';
            ctx.font = '11px serif';
            ctx.textAlign = 'center';
            ctx.fillText(`x${this._subscript(label)}`, cx, inputY + 4);
            // Arrow up from input to cell
            ctx.strokeStyle = '#00d4ff';
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.moveTo(cx, inputY - cellSize * 0.45);
            ctx.lineTo(cx, centerY + rectH / 2 + 4);
            ctx.stroke();
            this._drawArrowHead(ctx, cx, centerY + rectH / 2 + 4, 'up', '#00d4ff');

            // Input value
            if (hasData && stepData.input_voltage !== undefined) {
                ctx.fillStyle = '#00d4ff';
                ctx.font = '8px monospace';
                ctx.fillText(stepData.input_voltage.toFixed(3), cx, inputY + cellSize * 0.45 + 12);
            }

            // --- Output y_i (above) ---
            const outputY = centerY - rectH / 2 - 50;
            // Output circle
            ctx.beginPath();
            ctx.arc(cx, outputY, cellSize * 0.45, 0, Math.PI * 2);
            const outVal = hasData ? stepData.comparator_output : null;
            ctx.fillStyle = outVal === 1 ? '#1a4a2a' : (outVal === 0 ? '#4a1a1a' : '#1a2a1a');
            ctx.fill();
            ctx.strokeStyle = outVal === 1 ? '#00ff88' : (outVal === 0 ? '#ff4444' : '#66aa66');
            ctx.lineWidth = 1.5;
            ctx.stroke();
            // y label
            ctx.fillStyle = outVal === 1 ? '#00ff88' : (outVal === 0 ? '#ff4444' : '#aaffaa');
            ctx.font = '11px serif';
            ctx.textAlign = 'center';
            ctx.fillText(`y${this._subscript(label)}`, cx, outputY + 4);
            // Arrow up from cell to output
            ctx.strokeStyle = outVal === 1 ? '#00ff88' : (outVal === 0 ? '#ff4444' : '#66aa66');
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.moveTo(cx, centerY - rectH / 2 - 4);
            ctx.lineTo(cx, outputY + cellSize * 0.45);
            ctx.stroke();
            this._drawArrowHead(ctx, cx, centerY - rectH / 2 - 4, 'up', ctx.strokeStyle);

            // --- Recurrent connection to next cell ---
            if (i < numCells - 2 && !(i === numCells - 3)) {
                const nextX = margin + (i + 1) * cellSpacing + cellSpacing / 2;
                ctx.strokeStyle = '#ff8800';
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.moveTo(cx + rectW / 2, centerY);
                ctx.lineTo(nextX - rectW / 2 - 4, centerY);
                ctx.stroke();
                this._drawArrowHead(ctx, nextX - rectW / 2 - 4, centerY, 'right', '#ff8800');
            } else if (i === numCells - 3) {
                // Arrow to dots
                ctx.strokeStyle = '#ff8800';
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.moveTo(cx + rectW / 2, centerY);
                const dotsX = margin + (i + 1) * cellSpacing + cellSpacing / 2;
                ctx.lineTo(dotsX - 25, centerY);
                ctx.stroke();
                this._drawArrowHead(ctx, dotsX - 25, centerY, 'right', '#ff8800');
            }
        }

        // "Prediction" label at top
        ctx.fillStyle = '#aaa';
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Prediction (bitstream output)', w / 2, 38);

        // "Input" label at bottom
        ctx.fillText('Input (signal samples)', w / 2, h - 12);

        // Top bracket line
        const firstOut = margin + cellSpacing / 2;
        const lastOut = margin + (numCells - 1) * cellSpacing + cellSpacing / 2;
        ctx.strokeStyle = '#666';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(firstOut, 44);
        ctx.lineTo(lastOut, 44);
        ctx.stroke();

        // Bottom bracket line
        ctx.beginPath();
        ctx.moveTo(firstOut, h - 20);
        ctx.lineTo(lastOut, h - 20);
        ctx.stroke();

        // Equation at bottom-left
        ctx.fillStyle = '#ccc';
        ctx.font = '10px monospace';
        ctx.textAlign = 'left';
        ctx.fillText('h_t = h_(t-1) + (x_t - y_(t-1)·Vref)', 10, h - 40);
        ctx.fillText('y_t = sign(h_t)', 10, h - 26);

        // Step info
        if (history.length > 0) {
            ctx.fillStyle = '#888';
            ctx.font = '9px sans-serif';
            ctx.textAlign = 'right';
            ctx.fillText(`Step ${history.length}`, w - 10, 18);
        }

        ctx.textAlign = 'left';
        ctx.lineWidth = 1;
    },

    _subscript(label) {
        const subs = {'0':'₀','1':'₁','2':'₂','3':'₃','4':'₄','5':'₅','6':'₆','7':'₇','8':'₈','9':'₉','n':'ₙ'};
        return label.split('').map(c => subs[c] || c).join('');
    },

    _drawArrowHead(ctx, x, y, dir, color) {
        ctx.fillStyle = color;
        ctx.beginPath();
        const s = 5;
        if (dir === 'right') {
            ctx.moveTo(x, y);
            ctx.lineTo(x - s, y - s * 0.6);
            ctx.lineTo(x - s, y + s * 0.6);
        } else if (dir === 'up') {
            ctx.moveTo(x, y);
            ctx.lineTo(x - s * 0.6, y + s);
            ctx.lineTo(x + s * 0.6, y + s);
        } else if (dir === 'down') {
            ctx.moveTo(x, y);
            ctx.lineTo(x - s * 0.6, y - s);
            ctx.lineTo(x + s * 0.6, y - s);
        }
        ctx.closePath();
        ctx.fill();
    }
};
