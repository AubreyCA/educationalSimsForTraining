// API communication module
const API = {
    baseUrl: '',

    async simulate(converterType, params, signal) {
        const response = await fetch(`${this.baseUrl}/api/simulate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ converter_type: converterType, params, signal })
        });
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || 'Simulation failed');
        }
        return response.json();
    },

    async step(sessionId, converterType, inputValue, params, bitIndex) {
        const body = {
            session_id: sessionId,
            converter_type: converterType,
            input_value: inputValue,
            params: params
        };
        if (bitIndex !== undefined) body.bit_index = bitIndex;

        const response = await fetch(`${this.baseUrl}/api/step`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || 'Step failed');
        }
        return response.json();
    },

    async reset(sessionId) {
        const response = await fetch(`${this.baseUrl}/api/reset`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ session_id: sessionId })
        });
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || 'Reset failed');
        }
        return response.json();
    },

    async interpolate(codes, method, numBits, vref, sampleRate) {
        const response = await fetch(`${this.baseUrl}/api/interpolate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ codes, method, num_bits: numBits, vref, sample_rate: sampleRate })
        });
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || 'Interpolation failed');
        }
        return response.json();
    },

    async computeFFT(signal, sampleRate) {
        const response = await fetch(`${this.baseUrl}/api/fft`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ signal, sample_rate: sampleRate })
        });
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || 'FFT failed');
        }
        return response.json();
    }
};
