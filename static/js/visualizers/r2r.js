// R-2R DAC Visualizer
const R2RVisualizer = {
    drawCircuit(ctx, canvas, data) {
        const w = canvas.width, h = canvas.height;
        ctx.fillStyle = getCanvasBg();
        ctx.fillRect(0, 0, w, h);

        const state = data?.history ? data.history[data.history.length - 1] :
                      (data?.results ? data.results[data.results.length - 1] : data);
        const numBits = state?.num_bits || 4;

        ctx.fillStyle = '#00d4ff';
        ctx.font = '11px sans-serif';
        ctx.fillText(`R-2R Ladder DAC (${numBits} bits)`, 10, 18);

        // Draw simplified ladder
        const ladderY = h / 2;
        const segmentW = Math.min((w - 80) / numBits, 80);
        const startX = 40;
        const bits = state?.bits || [];

        // Main horizontal bus
        ctx.strokeStyle = '#666';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(startX, ladderY);
        ctx.lineTo(startX + numBits * segmentW, ladderY);
        ctx.stroke();

        for (let i = 0; i < numBits; i++) {
            const x = startX + i * segmentW;
            const bitVal = bits[i] !== undefined ? bits[i] : 0;
            const contribution = state?.contributions?.[i];

            // R resistor (horizontal)
            ctx.strokeStyle = '#ffaa00';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(x, ladderY);
            ctx.lineTo(x + segmentW, ladderY);
            ctx.stroke();
            // R label
            ctx.fillStyle = '#ffaa00';
            ctx.font = '8px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('R', x + segmentW / 2, ladderY - 8);

            // 2R resistor (vertical) and switch
            ctx.strokeStyle = '#ff8800';
            ctx.beginPath();
            ctx.moveTo(x + segmentW / 2, ladderY);
            ctx.lineTo(x + segmentW / 2, ladderY + 40);
            ctx.stroke();
            ctx.fillStyle = '#ff8800';
            ctx.fillText('2R', x + segmentW / 2 + 12, ladderY + 25);

            // Switch
            const switchY = ladderY + 45;
            ctx.fillStyle = bitVal ? '#00ff88' : '#ff4444';
            ctx.fillRect(x + segmentW / 2 - 8, switchY, 16, 12);
            ctx.fillStyle = '#000';
            ctx.font = '8px sans-serif';
            ctx.fillText(bitVal ? 'V' : 'G', x + segmentW / 2, switchY + 9);

            // Bit label
            ctx.fillStyle = '#ccc';
            ctx.font = '9px monospace';
            ctx.fillText(`b${numBits - 1 - i}=${bitVal}`, x + segmentW / 2, ladderY + 75);

            // Contribution
            if (contribution) {
                ctx.fillStyle = contribution.contribution > 0 ? '#00ff88' : '#666';
                ctx.font = '8px monospace';
                ctx.fillText(contribution.contribution.toFixed(4) + 'V', x + segmentW / 2, ladderY + 88);
            }
            ctx.textAlign = 'left';
        }

        // Output
        const outX = startX + numBits * segmentW + 20;
        ctx.strokeStyle = '#00ff88';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(startX + numBits * segmentW, ladderY);
        ctx.lineTo(outX, ladderY);
        ctx.stroke();

        if (state?.output_voltage !== undefined) {
            ctx.fillStyle = '#00ff88';
            ctx.font = '12px monospace';
            ctx.fillText(`Vout = ${state.output_voltage.toFixed(4)} V`, outX + 5, ladderY + 4);
        }

        // Input code
        if (state?.binary_code) {
            ctx.fillStyle = '#00d4ff';
            ctx.font = '11px monospace';
            ctx.fillText(`Input: ${state.binary_code} (${state.input_code})`, 10, h - 15);
        }

        ctx.lineWidth = 1;
    },

    drawLadder(ctx, canvas, data) {
        const w = canvas.width, h = canvas.height;
        ctx.fillStyle = getCanvasBg();
        ctx.fillRect(0, 0, w, h);

        const state = data?.history ? data.history[data.history.length - 1] :
                      (data?.results ? data.results[data.results.length - 1] : data);

        ctx.fillStyle = '#00d4ff';
        ctx.font = '11px sans-serif';
        ctx.fillText('Bit Contributions (Superposition)', 10, 18);

        if (!state?.contributions) {
            ctx.fillStyle = '#666';
            ctx.fillText('Run simulation to see contributions', 10, h / 2);
            return;
        }

        const contributions = state.contributions;
        const barW = (w - 60) / contributions.length;
        const maxV = state.vref || 1.0;
        const plotH = h - 80;

        contributions.forEach((c, i) => {
            const x = 30 + i * barW;

            // Weight bar (ideal weight)
            const weightH = (c.ideal_weight / maxV) * plotH;
            ctx.fillStyle = 'rgba(255, 170, 0, 0.3)';
            ctx.fillRect(x + 2, 40 + plotH - weightH, barW / 2 - 2, weightH);

            // Contribution bar (actual contribution)
            const contH = (c.contribution / maxV) * plotH;
            ctx.fillStyle = c.bit_value ? '#00ff88' : '#333';
            ctx.fillRect(x + barW / 2, 40 + plotH - contH, barW / 2 - 2, contH);

            // Labels
            ctx.fillStyle = '#ccc';
            ctx.font = '8px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(`b${contributions.length - 1 - i}`, x + barW / 2, 40 + plotH + 15);
            ctx.fillText(c.bit_value.toString(), x + barW / 2, 40 + plotH + 27);
            if (c.contribution > 0) {
                ctx.fillStyle = '#00ff88';
                ctx.fillText(c.contribution.toFixed(3), x + barW / 2, 35 + plotH - contH);
            }
            ctx.textAlign = 'left';
        });

        // Running total line
        ctx.fillStyle = '#00ff88';
        ctx.font = '10px monospace';
        ctx.fillText(`Total: ${state.output_voltage.toFixed(4)} V`, 10, h - 10);
    }
};
