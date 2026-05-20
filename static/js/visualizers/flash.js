// Flash ADC Visualizer
const FlashVisualizer = {
    drawCircuit(ctx, canvas, data) {
        const w = canvas.width, h = canvas.height;
        ctx.fillStyle = getCanvasBg();
        ctx.fillRect(0, 0, w, h);

        const numBits = data?.num_bits || data?.history?.[0]?.num_bits || 3;
        const numComparators = Math.pow(2, numBits) - 1;
        const maxDraw = Math.min(numComparators, 15); // Limit drawing
        const vref = data?.vref || 1.0;

        // Draw resistor ladder on left
        ctx.strokeStyle = '#666';
        ctx.lineWidth = 2;
        const ladderX = 60;
        const ladderTop = 30;
        const ladderBot = h - 30;
        ctx.beginPath();
        ctx.moveTo(ladderX, ladderTop);
        ctx.lineTo(ladderX, ladderBot);
        ctx.stroke();

        // Vref label
        ctx.fillStyle = '#00d4ff';
        ctx.font = '11px monospace';
        ctx.fillText('Vref', ladderX - 20, ladderTop - 5);
        ctx.fillText('GND', ladderX - 20, ladderBot + 15);

        // Draw comparators
        const spacing = (ladderBot - ladderTop) / (maxDraw + 1);
        const compX = 180;
        const state = data?.history ? data.history[data.history.length - 1] : data;

        for (let i = 0; i < maxDraw; i++) {
            const y = ladderBot - (i + 1) * spacing;
            const threshold = ((i + 1) / (numComparators + 1)) * vref;

            // Resistor tick
            ctx.strokeStyle = '#555';
            ctx.beginPath();
            ctx.moveTo(ladderX, y);
            ctx.lineTo(ladderX + 20, y);
            ctx.stroke();

            // Threshold label
            ctx.fillStyle = '#888';
            ctx.font = '9px monospace';
            ctx.fillText(threshold.toFixed(3), ladderX + 5, y - 3);

            // Comparator triangle
            const compActive = state?.comparator_outputs?.[i];
            ctx.fillStyle = compActive === 1 ? '#00ff88' : compActive === 0 ? '#ff4444' : '#333';
            ctx.beginPath();
            ctx.moveTo(compX, y - 10);
            ctx.lineTo(compX + 25, y);
            ctx.lineTo(compX, y + 10);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = '#aaa';
            ctx.lineWidth = 1;
            ctx.stroke();

            // Connection line
            ctx.strokeStyle = '#444';
            ctx.beginPath();
            ctx.moveTo(ladderX + 20, y);
            ctx.lineTo(compX, y);
            ctx.stroke();

            // Output
            ctx.strokeStyle = compActive === 1 ? '#00ff88' : '#444';
            ctx.beginPath();
            ctx.moveTo(compX + 25, y);
            ctx.lineTo(compX + 60, y);
            ctx.stroke();
            ctx.fillStyle = compActive === 1 ? '#00ff88' : '#666';
            ctx.fillText(compActive !== undefined ? compActive.toString() : '?', compX + 65, y + 4);
        }

        // Input line (Vin)
        const vin = state?.input_voltage || 0.5;
        const vinY = ladderBot - (vin / vref) * (ladderBot - ladderTop);
        ctx.strokeStyle = '#00d4ff';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 3]);
        ctx.beginPath();
        ctx.moveTo(30, vinY);
        ctx.lineTo(compX, vinY);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = '#00d4ff';
        ctx.fillText(`Vin=${vin.toFixed(3)}`, 5, vinY - 5);

        // Priority encoder block
        const encX = compX + 90;
        ctx.fillStyle = '#1a3a5c';
        ctx.fillRect(encX, h / 2 - 40, 80, 80);
        ctx.strokeStyle = '#00d4ff';
        ctx.strokeRect(encX, h / 2 - 40, 80, 80);
        ctx.fillStyle = '#00d4ff';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Priority', encX + 40, h / 2 - 10);
        ctx.fillText('Encoder', encX + 40, h / 2 + 5);
        ctx.textAlign = 'left';

        // Output
        if (state?.binary_code) {
            ctx.fillStyle = '#00ff88';
            ctx.font = '14px monospace';
            ctx.fillText(state.binary_code, encX + 90, h / 2);
            ctx.font = '10px monospace';
            ctx.fillText(`(${state.digital_code})`, encX + 90, h / 2 + 16);
        }
    },

    drawLUT(ctx, canvas, data) {
        const w = canvas.width, h = canvas.height;
        ctx.fillStyle = getCanvasBg();
        ctx.fillRect(0, 0, w, h);

        const numBits = data?.num_bits || data?.history?.[0]?.num_bits || 3;
        const numLevels = Math.pow(2, numBits);
        const state = data?.history ? data.history[data.history.length - 1] : data;
        const activeCode = state?.digital_code;

        ctx.fillStyle = '#00d4ff';
        ctx.font = '11px monospace';
        ctx.fillText('Lookup Table (Flash = O(1) access)', 10, 18);

        // Table headers
        const startY = 35;
        const rowH = Math.min(20, (h - startY - 10) / Math.min(numLevels, 16));
        const maxRows = Math.floor((h - startY - 10) / rowH);
        const visibleRows = Math.min(numLevels, maxRows);

        // Determine scroll offset
        let startRow = 0;
        if (numLevels > visibleRows && activeCode !== undefined) {
            startRow = Math.max(0, Math.min(activeCode - Math.floor(visibleRows / 2), numLevels - visibleRows));
        }

        ctx.fillStyle = '#666';
        ctx.font = '9px monospace';
        ctx.fillText('Code', 10, startY);
        ctx.fillText('Binary', 60, startY);
        ctx.fillText('Voltage', 140, startY);

        for (let i = 0; i < visibleRows; i++) {
            const code = startRow + i;
            const y = startY + 14 + i * rowH;
            const isActive = code === activeCode;

            if (isActive) {
                ctx.fillStyle = 'rgba(0, 255, 136, 0.15)';
                ctx.fillRect(5, y - 10, w - 10, rowH);
            }

            ctx.fillStyle = isActive ? '#00ff88' : '#888';
            ctx.font = '9px monospace';
            const binary = code.toString(2).padStart(numBits, '0');
            const voltage = (code / numLevels).toFixed(4);
            ctx.fillText(code.toString().padStart(3), 10, y);
            ctx.fillText(binary, 60, y);
            ctx.fillText(voltage + ' V', 140, y);
        }

        // Minimap if scrolling
        if (numLevels > visibleRows) {
            const mapX = w - 15;
            const mapH = h - startY - 10;
            ctx.fillStyle = '#1a1a2e';
            ctx.fillRect(mapX, startY, 10, mapH);
            const viewStart = (startRow / numLevels) * mapH;
            const viewSize = (visibleRows / numLevels) * mapH;
            ctx.fillStyle = '#00d4ff';
            ctx.fillRect(mapX, startY + viewStart, 10, viewSize);
        }
    }
};
