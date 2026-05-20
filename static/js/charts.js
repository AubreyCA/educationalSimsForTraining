// Charts module - Canvas-based plotting
const Charts = {
    colors: {
        input: '#00d4ff',
        output: '#00ff88',
        reconstructed: '#ff8800',
        error: '#ff4444',
        grid: '#2a2a4a',
        axis: '#666',
        nyquist: '#ff4444',
        alias: '#ffaa00',
        text: '#a0a0a0',
    },

    getThemeColors() {
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        if (isDark) {
            return { bg: '#0d1b2a', grid: '#2a2a4a', axis: '#666', text: '#a0a0a0' };
        }
        return { bg: '#ffffff', grid: '#e0e0e0', axis: '#999', text: '#555' };
    },

    // Zoom state per canvas id
    zoomState: {},

    getZoom(canvasId) {
        if (!this.zoomState[canvasId]) {
            this.zoomState[canvasId] = { level: 1.0, panX: 0.5 };
        }
        return this.zoomState[canvasId];
    },

    zoomIn(canvasId) {
        const z = this.getZoom(canvasId);
        z.level = Math.min(z.level * 1.5, 20);
    },

    zoomOut(canvasId) {
        const z = this.getZoom(canvasId);
        z.level = Math.max(z.level / 1.5, 1.0);
        if (z.level === 1.0) z.panX = 0.5;
    },

    zoomReset(canvasId) {
        this.zoomState[canvasId] = { level: 1.0, panX: 0.5 };
    },

    applyZoom(xMin, xMax, canvasId) {
        const z = this.getZoom(canvasId);
        if (z.level <= 1.0) return [xMin, xMax];
        const range = xMax - xMin;
        const visibleRange = range / z.level;
        const center = xMin + range * z.panX;
        let newMin = center - visibleRange / 2;
        let newMax = center + visibleRange / 2;
        // Clamp
        if (newMin < xMin) { newMax += (xMin - newMin); newMin = xMin; }
        if (newMax > xMax) { newMin -= (newMax - xMax); newMax = xMax; }
        newMin = Math.max(newMin, xMin);
        newMax = Math.min(newMax, xMax);
        return [newMin, newMax];
    },

    drawPlaceholder(canvas, text) {
        const ctx = canvas.getContext('2d');
        const w = canvas.width;
        const h = canvas.height;
        const theme = this.getThemeColors();
        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = theme.bg;
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = theme.text;
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(text || 'Run simulation to see data', w / 2, h / 2);
        ctx.textAlign = 'left';
    },

    drawLine(ctx, points, color, lineWidth = 1.5) {
        if (points.length < 2) return;
        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;
        ctx.moveTo(points[0][0], points[0][1]);
        for (let i = 1; i < points.length; i++) {
            ctx.lineTo(points[i][0], points[i][1]);
        }
        ctx.stroke();
    },

    drawPoints(ctx, points, color, radius = 3) {
        ctx.fillStyle = color;
        for (const [x, y] of points) {
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fill();
        }
    },

    drawStaircase(ctx, points, color, lineWidth = 1.5) {
        if (points.length < 2) return;
        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;
        ctx.moveTo(points[0][0], points[0][1]);
        for (let i = 1; i < points.length; i++) {
            ctx.lineTo(points[i][0], points[i - 1][1]); // horizontal
            ctx.lineTo(points[i][0], points[i][1]); // vertical
        }
        ctx.stroke();
    },

    drawGrid(ctx, width, height, padding) {
        const theme = this.getThemeColors();
        ctx.strokeStyle = theme.grid;
        ctx.lineWidth = 0.5;
        const gridLinesX = 8;
        const gridLinesY = 5;
        for (let i = 0; i <= gridLinesX; i++) {
            const x = padding.left + (i / gridLinesX) * (width - padding.left - padding.right);
            ctx.beginPath();
            ctx.moveTo(x, padding.top);
            ctx.lineTo(x, height - padding.bottom);
            ctx.stroke();
        }
        for (let i = 0; i <= gridLinesY; i++) {
            const y = padding.top + (i / gridLinesY) * (height - padding.top - padding.bottom);
            ctx.beginPath();
            ctx.moveTo(padding.left, y);
            ctx.lineTo(width - padding.right, y);
            ctx.stroke();
        }
    },

    drawAxes(ctx, width, height, padding, xLabel, yLabel, xRange, yRange) {
        const theme = this.getThemeColors();
        ctx.strokeStyle = theme.axis;
        ctx.lineWidth = 1;
        // Y axis
        ctx.beginPath();
        ctx.moveTo(padding.left, padding.top);
        ctx.lineTo(padding.left, height - padding.bottom);
        ctx.stroke();
        // X axis
        ctx.beginPath();
        ctx.moveTo(padding.left, height - padding.bottom);
        ctx.lineTo(width - padding.right, height - padding.bottom);
        ctx.stroke();

        // Labels
        ctx.fillStyle = theme.text;
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(xLabel, (padding.left + width - padding.right) / 2, height - 2);
        ctx.save();
        ctx.translate(10, (padding.top + height - padding.bottom) / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText(yLabel, 0, 0);
        ctx.restore();

        // Tick labels
        ctx.font = '9px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(xRange[0].toFixed(2), padding.left, height - padding.bottom + 12);
        ctx.fillText(xRange[1].toFixed(2), width - padding.right, height - padding.bottom + 12);
        ctx.textAlign = 'right';
        ctx.fillText(yRange[1].toFixed(2), padding.left - 4, padding.top + 4);
        ctx.fillText(yRange[0].toFixed(2), padding.left - 4, height - padding.bottom + 4);
    },

    mapToCanvas(value, min, max, canvasMin, canvasMax) {
        if (max === min) return (canvasMin + canvasMax) / 2;
        return canvasMin + (1 - (value - min) / (max - min)) * (canvasMax - canvasMin);
    },

    mapXToCanvas(value, min, max, canvasMin, canvasMax) {
        if (max === min) return (canvasMin + canvasMax) / 2;
        return canvasMin + (value - min) / (max - min) * (canvasMax - canvasMin);
    },

    clear(canvas) {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    },

    plotTimeDomain(canvas, data, options = {}) {
        const ctx = canvas.getContext('2d');
        const w = canvas.width;
        const h = canvas.height;
        ctx.clearRect(0, 0, w, h);

        if (!data || !data.y || data.y.length === 0) {
            this.drawPlaceholder(canvas, 'No data');
            return;
        }

        const padding = { top: 15, right: 15, bottom: 25, left: 45 };
        const plotW = w - padding.left - padding.right;
        const plotH = h - padding.top - padding.bottom;

        // Determine ranges
        const xData = data.x || Array.from({ length: data.y.length }, (_, i) => i);
        let xMin = options.xMin !== undefined ? options.xMin : Math.min(...xData);
        let xMax = options.xMax !== undefined ? options.xMax : Math.max(...xData);
        const yMin = options.yMin !== undefined ? options.yMin : Math.min(...data.y);
        const yMax = options.yMax !== undefined ? options.yMax : Math.max(...data.y);
        const yPad = options.noPad ? 0 : ((yMax - yMin) * 0.1 || 0.1);

        // Apply zoom
        const canvasId = canvas.id;
        [xMin, xMax] = this.applyZoom(xMin, xMax, canvasId);

        // Theme-aware background
        const theme = this.getThemeColors();
        ctx.fillStyle = theme.bg;
        ctx.fillRect(0, 0, w, h);

        this.drawGrid(ctx, w, h, padding);
        this.drawAxes(ctx, w, h, padding,
            options.xLabel || 'Time',
            options.yLabel || 'Value',
            [xMin, xMax],
            [yMin - yPad, yMax + yPad]
        );

        // Plot main signal
        const points = xData.map((x, i) => [
            this.mapXToCanvas(x, xMin, xMax, padding.left, w - padding.right),
            this.mapToCanvas(data.y[i], yMin - yPad, yMax + yPad, padding.top, h - padding.bottom)
        ]);

        if (options.staircase) {
            this.drawStaircase(ctx, points, options.color || this.colors.input);
        } else {
            this.drawLine(ctx, points, options.color || this.colors.input);
        }

        // Sample points
        if (options.showPoints) {
            this.drawPoints(ctx, points, options.color || this.colors.input, 2);
        }

        // Overlay signal (e.g., original on reconstructed)
        if (data.overlay) {
            const overlayPoints = xData.map((x, i) => [
                this.mapXToCanvas(x, xMin, xMax, padding.left, w - padding.right),
                this.mapToCanvas(data.overlay[i], yMin - yPad, yMax + yPad, padding.top, h - padding.bottom)
            ]);
            this.drawLine(ctx, overlayPoints, options.overlayColor || this.colors.reconstructed, 1);
        }

        // Nyquist line (for FFT)
        if (options.nyquistLine !== undefined) {
            const nx = this.mapXToCanvas(options.nyquistLine, xMin, xMax, padding.left, w - padding.right);
            ctx.setLineDash([4, 4]);
            ctx.strokeStyle = this.colors.nyquist;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(nx, padding.top);
            ctx.lineTo(nx, h - padding.bottom);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.fillStyle = this.colors.nyquist;
            ctx.font = '9px sans-serif';
            ctx.fillText('fs/2', nx + 2, padding.top + 10);
        }
    },

    plotFFT(canvas, freqs, magnitudes, options = {}) {
        const data = { x: freqs, y: magnitudes };
        this.plotTimeDomain(canvas, data, {
            xLabel: 'Frequency (Hz)',
            yLabel: 'Magnitude (dB)',
            color: options.color || this.colors.input,
            nyquistLine: options.nyquist,
            yMin: options.yMin || -80,
            yMax: options.yMax || 0,
            ...options
        });
    }
};
