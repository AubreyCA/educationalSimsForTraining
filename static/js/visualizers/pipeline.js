// Pipeline ADC Visualizer
const PipelineVisualizer = {
    drawCircuit(ctx, canvas, data) {
        const w = canvas.width, h = canvas.height;
        ctx.fillStyle = getCanvasBg();
        ctx.fillRect(0, 0, w, h);

        const state = data?.history ? data.history[data.history.length - 1] : data;
        const numStages = state?.num_stages || 3;
        const bitsPerStage = state?.bits_per_stage || 2;

        ctx.fillStyle = '#00d4ff';
        ctx.font = '11px sans-serif';
        ctx.fillText(`Pipeline ADC (${numStages} stages × ${bitsPerStage} bits)`, 10, 18);

        const stageW = (w - 40) / numStages;
        const stageH = 200;
        const startY = 50;

        const stages = state?.stages || [];

        for (let i = 0; i < numStages; i++) {
            const x = 20 + i * stageW;
            const y = startY;
            const stage = stages[i];

            // Stage box
            ctx.fillStyle = '#1a2a3c';
            ctx.fillRect(x, y, stageW - 10, stageH);
            ctx.strokeStyle = stage ? '#00d4ff' : '#333';
            ctx.lineWidth = stage ? 2 : 1;
            ctx.strokeRect(x, y, stageW - 10, stageH);

            ctx.fillStyle = '#00d4ff';
            ctx.font = '10px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(`Stage ${i + 1}`, x + (stageW - 10) / 2, y + 15);

            // Sub-blocks within stage
            const bx = x + 5;
            const bw = stageW - 20;

            // S/H
            ctx.fillStyle = '#2a3a4c';
            ctx.fillRect(bx, y + 25, bw, 25);
            ctx.strokeStyle = '#666';
            ctx.strokeRect(bx, y + 25, bw, 25);
            ctx.fillStyle = '#aaa';
            ctx.font = '8px sans-serif';
            ctx.fillText('S/H', bx + bw / 2, y + 41);

            // Sub-ADC
            ctx.fillStyle = '#2a3a4c';
            ctx.fillRect(bx, y + 55, bw, 25);
            ctx.strokeStyle = '#00ff88';
            ctx.strokeRect(bx, y + 55, bw, 25);
            ctx.fillStyle = '#00ff88';
            ctx.fillText(`${bitsPerStage}-bit ADC`, bx + bw / 2, y + 71);

            // Sub-DAC
            ctx.fillStyle = '#2a3a4c';
            ctx.fillRect(bx, y + 85, bw, 25);
            ctx.strokeStyle = '#ff8800';
            ctx.strokeRect(bx, y + 85, bw, 25);
            ctx.fillStyle = '#ff8800';
            ctx.fillText('Sub-DAC', bx + bw / 2, y + 101);

            // Subtractor + Gain
            ctx.fillStyle = '#2a3a4c';
            ctx.fillRect(bx, y + 115, bw, 25);
            ctx.strokeStyle = '#ffaa00';
            ctx.strokeRect(bx, y + 115, bw, 25);
            ctx.fillStyle = '#ffaa00';
            ctx.fillText(`×${Math.pow(2, bitsPerStage)} Gain`, bx + bw / 2, y + 131);

            // Stage data
            if (stage) {
                ctx.fillStyle = '#ccc';
                ctx.font = '8px monospace';
                ctx.fillText(`In: ${stage.input_voltage.toFixed(3)}V`, bx + bw / 2, y + 155);
                ctx.fillText(`Code: ${stage.sub_adc_binary}`, bx + bw / 2, y + 167);
                ctx.fillText(`Res: ${stage.residue_after_gain.toFixed(3)}V`, bx + bw / 2, y + 179);
            }

            // Arrow to next stage
            if (i < numStages - 1) {
                ctx.strokeStyle = '#ffaa00';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(x + stageW - 10, y + 130);
                ctx.lineTo(x + stageW, y + 130);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(x + stageW - 5, y + 127);
                ctx.lineTo(x + stageW, y + 130);
                ctx.lineTo(x + stageW - 5, y + 133);
                ctx.stroke();
            }

            ctx.textAlign = 'left';
        }

        // Output
        if (state?.binary_code) {
            ctx.fillStyle = '#00ff88';
            ctx.font = '12px monospace';
            ctx.fillText(`Output: ${state.binary_code} (${state.digital_code})`, 20, startY + stageH + 30);
        }

        ctx.lineWidth = 1;
    },

    drawStages(ctx, canvas, data) {
        const w = canvas.width, h = canvas.height;
        ctx.fillStyle = getCanvasBg();
        ctx.fillRect(0, 0, w, h);

        const state = data?.history ? data.history[data.history.length - 1] : data;
        const stages = state?.stages || [];

        ctx.fillStyle = '#00d4ff';
        ctx.font = '11px sans-serif';
        ctx.fillText('Residue Voltages per Stage', 10, 18);

        if (stages.length === 0) {
            ctx.fillStyle = '#666';
            ctx.fillText('Run simulation to see residue plot', 10, h / 2);
            return;
        }

        // Bar chart of residue voltages
        const barW = (w - 60) / stages.length;
        const maxV = state?.vref || 1.0;
        const plotH = h - 80;

        stages.forEach((stage, i) => {
            const x = 30 + i * barW;
            const barH = (stage.residue_after_gain / maxV) * plotH;
            const y = 40 + plotH - barH;

            ctx.fillStyle = `hsl(${200 + i * 30}, 70%, 50%)`;
            ctx.fillRect(x + 5, y, barW - 10, barH);
            ctx.strokeStyle = '#fff';
            ctx.strokeRect(x + 5, y, barW - 10, barH);

            ctx.fillStyle = '#ccc';
            ctx.font = '9px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(`S${i + 1}`, x + barW / 2, 40 + plotH + 15);
            ctx.fillText(stage.residue_after_gain.toFixed(3), x + barW / 2, y - 5);
            ctx.fillText(stage.sub_adc_binary, x + barW / 2, 40 + plotH + 28);
            ctx.textAlign = 'left';
        });
    }
};
