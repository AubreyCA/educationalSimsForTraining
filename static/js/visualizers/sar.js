// SAR ADC Visualizer
const SARVisualizer = {
    drawCircuit(ctx, canvas, data) {
        const w = canvas.width, h = canvas.height;
        ctx.fillStyle = getCanvasBg();
        ctx.fillRect(0, 0, w, h);

        const state = data?.history ? data.history[data.history.length - 1] : data;
        const numBits = state?.num_bits || 4;

        // Title
        ctx.fillStyle = '#00d4ff';
        ctx.font = '11px sans-serif';
        ctx.fillText('SAR ADC Architecture', 10, 18);

        // Sample & Hold
        ctx.fillStyle = '#1a3a5c';
        ctx.fillRect(20, 60, 80, 40);
        ctx.strokeStyle = '#00d4ff';
        ctx.strokeRect(20, 60, 80, 40);
        ctx.fillStyle = '#ccc';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('S/H', 60, 84);
        ctx.textAlign = 'left';

        // Vin label
        if (state?.input_voltage !== undefined) {
            ctx.fillStyle = '#00d4ff';
            ctx.font = '10px monospace';
            ctx.fillText(`Vin=${state.input_voltage.toFixed(4)}V`, 15, 55);
        }

        // Comparator
        const compX = 160, compY = 80;
        ctx.fillStyle = '#1a3a5c';
        ctx.beginPath();
        ctx.moveTo(compX, compY - 20);
        ctx.lineTo(compX + 30, compY);
        ctx.lineTo(compX, compY + 20);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#ffaa00';
        ctx.stroke();
        ctx.fillStyle = '#ccc';
        ctx.font = '9px sans-serif';
        ctx.fillText('+', compX + 3, compY - 5);
        ctx.fillText('−', compX + 3, compY + 12);

        // Connection S/H to comparator
        ctx.strokeStyle = '#00d4ff';
        ctx.beginPath();
        ctx.moveTo(100, 80);
        ctx.lineTo(compX, 70);
        ctx.stroke();

        // SAR Logic block
        const sarX = 250, sarY = 40;
        ctx.fillStyle = '#1a3a5c';
        ctx.fillRect(sarX, sarY, 120, 50);
        ctx.strokeStyle = '#00ff88';
        ctx.strokeRect(sarX, sarY, 120, 50);
        ctx.fillStyle = '#00ff88';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('SAR Logic', sarX + 60, sarY + 18);

        // Register display
        if (state?.bit_trials) {
            const lastTrial = state.bit_trials[state.bit_trials.length - 1];
            const reg = lastTrial?.binary_so_far || state.binary_code || '';
            ctx.font = '14px monospace';
            ctx.fillStyle = '#00ff88';
            ctx.fillText(reg, sarX + 60, sarY + 40);
        } else if (state?.binary_code) {
            ctx.font = '14px monospace';
            ctx.fillStyle = '#00ff88';
            ctx.fillText(state.binary_code, sarX + 60, sarY + 40);
        }
        ctx.textAlign = 'left';

        // Comparator to SAR
        ctx.strokeStyle = '#ffaa00';
        ctx.beginPath();
        ctx.moveTo(compX + 30, compY);
        ctx.lineTo(sarX, sarY + 25);
        ctx.stroke();

        // Internal DAC
        const dacX = 250, dacY = 140;
        ctx.fillStyle = '#1a3a5c';
        ctx.fillRect(dacX, dacY, 120, 40);
        ctx.strokeStyle = '#ff8800';
        ctx.strokeRect(dacX, dacY, 120, 40);
        ctx.fillStyle = '#ff8800';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Internal DAC', dacX + 60, dacY + 16);

        if (state?.bit_trials) {
            const lastTrial = state.bit_trials[state.bit_trials.length - 1];
            ctx.font = '10px monospace';
            ctx.fillText((lastTrial?.dac_voltage_after || 0).toFixed(4) + 'V', dacX + 60, dacY + 32);
        }
        ctx.textAlign = 'left';

        // SAR to DAC
        ctx.strokeStyle = '#00ff88';
        ctx.beginPath();
        ctx.moveTo(sarX + 60, sarY + 50);
        ctx.lineTo(dacX + 60, dacY);
        ctx.stroke();

        // DAC to comparator (-)
        ctx.strokeStyle = '#ff8800';
        ctx.beginPath();
        ctx.moveTo(dacX, dacY + 20);
        ctx.lineTo(compX, compY + 10);
        ctx.stroke();

        // Voltage bar showing convergence
        const barX = 30, barY = 140, barW = 100, barH = 180;
        ctx.fillStyle = '#111';
        ctx.fillRect(barX, barY, barW, barH);
        ctx.strokeStyle = '#444';
        ctx.strokeRect(barX, barY, barW, barH);

        ctx.fillStyle = '#666';
        ctx.font = '9px sans-serif';
        ctx.fillText('Vref', barX, barY - 3);
        ctx.fillText('0', barX, barY + barH + 10);

        if (state?.input_voltage !== undefined) {
            const vinPos = barY + barH * (1 - state.input_voltage / (state.vref || 1));
            ctx.strokeStyle = '#00d4ff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(barX, vinPos);
            ctx.lineTo(barX + barW, vinPos);
            ctx.stroke();
            ctx.fillStyle = '#00d4ff';
            ctx.fillText('Vin', barX + barW + 3, vinPos + 3);
        }

        // Show search range narrowing
        if (state?.bit_trials) {
            state.bit_trials.forEach((trial, i) => {
                const low = trial.search_range_low / (state.vref || 1);
                const high = trial.search_range_high / (state.vref || 1);
                const yLow = barY + barH * (1 - low);
                const yHigh = barY + barH * (1 - high);
                ctx.fillStyle = `rgba(0, 255, 136, ${0.1 + i * 0.05})`;
                ctx.fillRect(barX + 2, yHigh, barW - 4, yLow - yHigh);
            });
        }

        ctx.lineWidth = 1;
    },

    drawBST(ctx, canvas, data) {
        const w = canvas.width, h = canvas.height;
        ctx.fillStyle = getCanvasBg();
        ctx.fillRect(0, 0, w, h);

        const state = data?.history ? data.history[data.history.length - 1] : data;
        const numBits = state?.num_bits || 4;
        const vref = state?.vref || 1.0;
        const maxDepth = Math.min(numBits, 6);

        ctx.fillStyle = '#00d4ff';
        ctx.font = '11px sans-serif';
        ctx.fillText('Binary Search Tree (SAR = tree traversal)', 10, 18);

        const bitTrials = state?.bit_trials || [];

        // Draw tree recursively
        const drawNode = (x, y, depth, low, high, path) => {
            if (depth > maxDepth) return;

            const mid = (low + high) / 2;
            const radius = 14;
            const levelSpacing = (h - 60) / (maxDepth + 1);
            const childY = y + levelSpacing;
            const spread = (w - 40) / Math.pow(2, depth + 1);

            // Determine if this node is on the path taken
            let onPath = false;
            let decision = null;
            if (depth < bitTrials.length) {
                const expectedMid = this._getNodeVoltage(depth, bitTrials);
                if (Math.abs(mid - expectedMid) < vref / Math.pow(2, depth + 2)) {
                    onPath = true;
                    decision = bitTrials[depth].decision;
                }
            }

            // Check if node is in the path sequence
            let isVisited = depth < bitTrials.length;
            let isPruned = false;

            // Draw connections to children
            if (depth < maxDepth) {
                const leftX = x - spread;
                const rightX = x + spread;

                // Left child line
                ctx.strokeStyle = isVisited && bitTrials[depth]?.decision === 0 ? '#4488ff' : '#333';
                ctx.lineWidth = isVisited && bitTrials[depth]?.decision === 0 ? 2 : 1;
                ctx.beginPath();
                ctx.moveTo(x, y + radius);
                ctx.lineTo(leftX, childY - radius);
                ctx.stroke();

                // Right child line
                ctx.strokeStyle = isVisited && bitTrials[depth]?.decision === 1 ? '#00ff88' : '#333';
                ctx.lineWidth = isVisited && bitTrials[depth]?.decision === 1 ? 2 : 1;
                ctx.beginPath();
                ctx.moveTo(x, y + radius);
                ctx.lineTo(rightX, childY - radius);
                ctx.stroke();

                // Recurse
                if (depth < maxDepth - 1) {
                    // Only draw subtrees that are relevant
                    if (!isVisited || bitTrials[depth]?.decision === 0) {
                        drawNode(leftX, childY, depth + 1, low, mid, path + '0');
                    } else {
                        // Draw pruned indicator
                        ctx.fillStyle = 'rgba(68, 136, 255, 0.3)';
                        ctx.beginPath();
                        ctx.arc(leftX, childY, 8, 0, Math.PI * 2);
                        ctx.fill();
                    }
                    if (!isVisited || bitTrials[depth]?.decision === 1) {
                        drawNode(rightX, childY, depth + 1, mid, high, path + '1');
                    } else {
                        ctx.fillStyle = 'rgba(68, 136, 255, 0.3)';
                        ctx.beginPath();
                        ctx.arc(rightX, childY, 8, 0, Math.PI * 2);
                        ctx.fill();
                    }
                }
            }

            // Draw node circle
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            if (isVisited) {
                ctx.fillStyle = decision === 1 ? '#00ff88' : '#4488ff';
            } else {
                ctx.fillStyle = '#2a2a4a';
            }
            ctx.fill();
            ctx.strokeStyle = isVisited ? '#fff' : '#444';
            ctx.lineWidth = 1;
            ctx.stroke();

            // Node label
            ctx.fillStyle = isVisited ? '#000' : '#888';
            ctx.font = '8px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(mid.toFixed(2), x, y + 3);
            ctx.textAlign = 'left';
        };

        drawNode(w / 2, 40, 0, 0, vref, '');
        ctx.lineWidth = 1;
    },

    _getNodeVoltage(depth, bitTrials) {
        let low = 0, high = 1;
        for (let i = 0; i < depth; i++) {
            const mid = (low + high) / 2;
            if (bitTrials[i]?.decision === 1) {
                low = mid;
            } else {
                high = mid;
            }
        }
        return (low + high) / 2;
    },

    drawInternals(ctx, canvas, data) {
        const w = canvas.width, h = canvas.height;
        ctx.fillStyle = getCanvasBg();
        ctx.fillRect(0, 0, w, h);

        const state = data?.history ? data.history[data.history.length - 1] : data;
        const numBits = state?.num_bits || 4;
        const bitTrials = state?.bit_trials || [];
        const currentBit = bitTrials.length - 1;

        ctx.fillStyle = '#00d4ff';
        ctx.font = '12px sans-serif';
        ctx.fillText('SAR Logic Internals — Register & Shift Register', 10, 20);

        const boxW = Math.min(50, (w - 120) / numBits);
        const startX = 60;

        // --- Ring Counter (Shift Register) ---
        const ringY = 55;
        ctx.fillStyle = '#888';
        ctx.font = '10px sans-serif';
        ctx.fillText('Ring Counter (bit selector):', 10, ringY - 5);

        for (let i = 0; i < numBits; i++) {
            const x = startX + i * (boxW + 4);
            const active = (i === currentBit + 1) || (bitTrials.length === 0 && i === 0);
            const done = i <= currentBit;

            // Box
            ctx.fillStyle = active ? '#ffaa00' : done ? '#1a3a5c' : '#111';
            ctx.fillRect(x, ringY, boxW, 28);
            ctx.strokeStyle = active ? '#ffaa00' : done ? '#00d4ff' : '#444';
            ctx.lineWidth = active ? 2 : 1;
            ctx.strokeRect(x, ringY, boxW, 28);

            // Bit position label
            ctx.fillStyle = active ? '#000' : '#aaa';
            ctx.font = '9px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(`B${numBits - 1 - i}`, x + boxW / 2, ringY + 12);

            // Value in shift register
            ctx.fillStyle = active ? '#000' : '#ffaa00';
            ctx.font = '11px monospace';
            ctx.fillText(active ? '1' : '0', x + boxW / 2, ringY + 24);
            ctx.textAlign = 'left';
        }

        // Shift arrow
        ctx.strokeStyle = '#ffaa00';
        ctx.lineWidth = 1;
        const arrowY = ringY + 32;
        ctx.beginPath();
        ctx.moveTo(startX, arrowY);
        ctx.lineTo(startX + numBits * (boxW + 4) - 4, arrowY);
        ctx.stroke();
        ctx.fillStyle = '#ffaa00';
        ctx.beginPath();
        ctx.moveTo(startX + numBits * (boxW + 4) - 4, arrowY - 4);
        ctx.lineTo(startX + numBits * (boxW + 4) + 4, arrowY);
        ctx.lineTo(startX + numBits * (boxW + 4) - 4, arrowY + 4);
        ctx.fill();
        ctx.fillStyle = '#ffaa00';
        ctx.font = '9px sans-serif';
        ctx.fillText('shift →', startX + numBits * (boxW + 4) + 8, arrowY + 3);

        // --- SAR Register (N flip-flops) ---
        const regY = 115;
        ctx.fillStyle = '#888';
        ctx.font = '10px sans-serif';
        ctx.fillText('SAR Register (N flip-flops):', 10, regY - 5);

        for (let i = 0; i < numBits; i++) {
            const x = startX + i * (boxW + 4);
            const trial = bitTrials[i];
            const decided = i <= currentBit;
            const isCurrent = i === currentBit + 1;

            // Flip-flop box
            ctx.fillStyle = decided ? (trial?.decision === 1 ? '#003322' : '#220000') : '#111';
            ctx.fillRect(x, regY, boxW, 36);
            ctx.strokeStyle = decided ? (trial?.decision === 1 ? '#00ff88' : '#ff4444') : isCurrent ? '#ffaa00' : '#444';
            ctx.lineWidth = isCurrent ? 2 : 1;
            ctx.strokeRect(x, regY, boxW, 36);

            // Bit label
            ctx.fillStyle = '#aaa';
            ctx.font = '8px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(`MSB-${i}`, x + boxW / 2, regY + 10);

            // Bit value
            if (decided) {
                ctx.fillStyle = trial.decision === 1 ? '#00ff88' : '#ff4444';
                ctx.font = '16px monospace';
                ctx.fillText(trial.decision.toString(), x + boxW / 2, regY + 28);
            } else if (isCurrent) {
                ctx.fillStyle = '#ffaa00';
                ctx.font = '14px monospace';
                ctx.fillText('?', x + boxW / 2, regY + 28);
            } else {
                ctx.fillStyle = '#444';
                ctx.font = '14px monospace';
                ctx.fillText('-', x + boxW / 2, regY + 28);
            }
            ctx.textAlign = 'left';
        }

        // --- Logic gate per bit ---
        const gateY = 170;
        ctx.fillStyle = '#888';
        ctx.font = '10px sans-serif';
        ctx.fillText('Decision logic per bit:', 10, gateY - 5);

        ctx.fillStyle = '#666';
        ctx.font = '9px monospace';
        ctx.fillText('bit[i] = (my_turn AND comp_out) OR (NOT my_turn AND prev_value)', 10, gateY + 10);

        // --- Comparator output ---
        const compY = gateY + 30;
        if (bitTrials.length > 0) {
            const lastTrial = bitTrials[bitTrials.length - 1];
            ctx.fillStyle = '#888';
            ctx.font = '10px sans-serif';
            ctx.fillText('Comparator output:', 10, compY);
            ctx.fillStyle = lastTrial.decision === 1 ? '#00ff88' : '#ff4444';
            ctx.font = '12px monospace';
            ctx.fillText(lastTrial.decision === 1 ? '1 (Vin ≥ DAC)' : '0 (Vin < DAC)', 140, compY);
        }

        // --- DAC register value ---
        const dacY = compY + 25;
        ctx.fillStyle = '#888';
        ctx.font = '10px sans-serif';
        ctx.fillText('DAC Input (from register):', 10, dacY);
        if (bitTrials.length > 0) {
            const lastTrial = bitTrials[bitTrials.length - 1];
            ctx.fillStyle = '#ff8800';
            ctx.font = '12px monospace';
            ctx.fillText(`${lastTrial.binary_so_far}  →  ${lastTrial.dac_voltage_after.toFixed(4)}V`, 170, dacY);
        } else {
            ctx.fillStyle = '#444';
            ctx.font = '12px monospace';
            ctx.fillText('${"0".repeat(numBits)}  →  0.0000V', 170, dacY);
        }

        // --- Clock cycle counter ---
        const clockY = dacY + 25;
        ctx.fillStyle = '#888';
        ctx.font = '10px sans-serif';
        ctx.fillText('Clock cycle:', 10, clockY);
        ctx.fillStyle = '#00d4ff';
        ctx.font = '12px monospace';
        ctx.fillText(`${bitTrials.length} / ${numBits}`, 100, clockY);

        if (bitTrials.length >= numBits) {
            ctx.fillStyle = '#00ff88';
            ctx.font = '11px sans-serif';
            ctx.fillText('✓ Conversion complete', 180, clockY);
        }
    }
};
