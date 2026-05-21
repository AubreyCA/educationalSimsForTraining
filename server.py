import json
import numpy as np
from flask import Flask, request, jsonify, send_from_directory
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from converters import CONVERTERS

app = Flask(__name__, static_folder='static')

# Store active converter sessions
sessions = {}


def generate_signal(signal_type, amplitude, frequency, sample_rate, num_samples, duty_cycle=50, vref=1.0):
    """Generate an input signal array."""
    t = np.arange(num_samples) / sample_rate
    offset = vref / 2  # Center signal around Vref/2

    if signal_type == 'dc':
        signal = np.full(num_samples, amplitude)
    elif signal_type == 'sine':
        signal = offset + amplitude / 2 * np.sin(2 * np.pi * frequency * t)
    elif signal_type == 'sawtooth':
        period = 1.0 / frequency if frequency > 0 else 1.0
        signal = offset + amplitude / 2 * (2 * (t % period) / period - 1)
    elif signal_type == 'pulse':
        period = 1.0 / frequency if frequency > 0 else 1.0
        duty = duty_cycle / 100.0
        phase = (t % period) / period
        signal = np.where(phase < duty, offset + amplitude / 2, offset - amplitude / 2)
    else:
        signal = np.full(num_samples, amplitude)

    # Clamp to [0, vref]
    signal = np.clip(signal, 0, vref - 1e-10)
    return t.tolist(), signal.tolist()


def compute_fft(signal, sample_rate):
    """Compute FFT magnitude spectrum in dB."""
    from scipy.fft import fft, fftfreq
    N = len(signal)
    if N == 0:
        return [], []
    # Apply Hanning window
    window = np.hanning(N)
    windowed = np.array(signal) * window
    yf = fft(windowed)
    xf = fftfreq(N, 1.0 / sample_rate)

    # Only positive frequencies
    positive_mask = xf >= 0
    freqs = xf[positive_mask].tolist()
    magnitudes = np.abs(yf[positive_mask])

    # Convert to dB (avoid log(0))
    magnitudes_db = 20 * np.log10(magnitudes + 1e-12)
    # Normalize to max
    max_mag = max(magnitudes_db) if len(magnitudes_db) > 0 else 0
    magnitudes_db = (magnitudes_db - max_mag).tolist()

    return freqs, magnitudes_db


def interpolate_signal(codes, method, num_bits, vref, sample_rate):
    """Apply interpolation to codeword sequence."""
    lsb = vref / (2 ** num_bits)
    analog = [c * lsb for c in codes]
    N = len(analog)

    if method == 'zoh' or N < 2:
        return analog
    elif method == 'linear':
        # Upsample 4x with linear interpolation
        result = []
        for i in range(N - 1):
            result.append(analog[i])
            for k in range(1, 4):
                frac = k / 4.0
                result.append(analog[i] * (1 - frac) + analog[i + 1] * frac)
        result.append(analog[-1])
        return result
    elif method == 'sinc':
        # Ideal sinc interpolation (upsample 4x)
        upsample = 4
        result = np.zeros(N * upsample)
        for i in range(N):
            for j in range(len(result)):
                t = j / upsample - i
                if abs(t) < 1e-10:
                    result[j] += analog[i]
                else:
                    result[j] += analog[i] * np.sin(np.pi * t) / (np.pi * t)
        return result.tolist()
    return analog


@app.route('/')
def index():
    return send_from_directory('static', 'index.html')


@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory('static', path)


@app.route('/api/simulate', methods=['POST'])
def simulate():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No JSON data provided'}), 400

        converter_type = data.get('converter_type')
        if converter_type not in CONVERTERS:
            return jsonify({'error': f'Unknown converter type: {converter_type}. Valid: {list(CONVERTERS.keys())}'}), 400

        params = data.get('params', {})
        signal_config = data.get('signal', {})

        # Create converter instance
        converter_class = CONVERTERS[converter_type]
        converter = converter_class(**params)

        # Determine if ADC or DAC
        is_dac = converter_type in ('r2r_dac', 'current_dac')

        if is_dac:
            # Generate DAC input codes
            signal_config['vref'] = params.get('vref', 1.0)
            input_codes = _generate_dac_input(signal_config, params.get('num_bits', 8))
            results = converter.simulate(input_codes)
            transfer = converter.get_transfer_characteristic()
            return jsonify({
                'type': 'dac',
                'converter_type': converter_type,
                'input_codes': input_codes,
                'results': results,
                'transfer_characteristic': transfer,
                'explanation': converter.get_explanation(),
                'clock_freq': signal_config.get('clock_freq', 10000),
                'num_samples': len(input_codes),
            })
        else:
            # Generate ADC input signal
            vref = params.get('vref', 1.0)
            sample_rate = signal_config.get('sample_rate', 1000)
            num_samples = signal_config.get('num_samples', 64)
            signal_type = signal_config.get('type', 'sine')
            amplitude = signal_config.get('amplitude', vref * 0.8)
            frequency = signal_config.get('frequency', 100)
            duty_cycle = signal_config.get('duty_cycle', 50)

            t, input_signal = generate_signal(signal_type, amplitude, frequency, sample_rate, num_samples, duty_cycle, vref)

            # Check aliasing
            nyquist = sample_rate / 2
            aliasing_info = None
            if frequency > nyquist and signal_type != 'dc':
                f_alias = abs(frequency - round(frequency / sample_rate) * sample_rate)
                aliasing_info = {
                    'is_aliased': True,
                    'input_frequency': frequency,
                    'nyquist_frequency': nyquist,
                    'aliased_frequency': f_alias,
                    'message': f'⚠️ Aliasing! Input frequency ({frequency} Hz) exceeds Nyquist ({nyquist} Hz). Aliased to {f_alias:.1f} Hz.'
                }

            # Simulate
            if converter_type == 'sigma_delta_adc':
                results = converter.simulate(input_signal)
                digital_codes = []
                dec = results.get('decimation', {})
                for r in dec.get('decimated_results', []):
                    # Map average to code
                    avg = r['average']
                    code = int(round(avg * (2 ** 8 - 1)))  # Approximate 8-bit equivalent
                    digital_codes.append(max(0, min(255, code)))
                sim_results = results
            else:
                sim_results = converter.simulate(input_signal)
                digital_codes = [r['digital_code'] for r in sim_results]

            # Compute FFTs
            input_fft_freqs, input_fft_mag = compute_fft(input_signal, sample_rate)
            output_fft_freqs, output_fft_mag = compute_fft(digital_codes, sample_rate)

            # Get num_bits for reconstruction
            num_bits = params.get('num_bits', 8)
            if converter_type == 'pipeline_adc':
                num_bits = params.get('num_stages', 3) * params.get('bits_per_stage', 2)

            # Reconstruct
            lsb = vref / (2 ** num_bits)
            reconstructed = [c * lsb for c in digital_codes]

            response = {
                'type': 'adc',
                'converter_type': converter_type,
                'time': t,
                'input_signal': input_signal,
                'digital_codes': digital_codes,
                'reconstructed': reconstructed,
                'sample_rate': sample_rate,
                'num_samples': num_samples,
                'num_bits': num_bits,
                'vref': vref,
                'lsb': lsb,
                'nyquist': nyquist,
                'aliasing': aliasing_info,
                'input_fft': {'frequencies': input_fft_freqs, 'magnitudes': input_fft_mag},
                'output_fft': {'frequencies': output_fft_freqs, 'magnitudes': output_fft_mag},
                'explanation': converter.get_explanation(),
                'history': converter.get_history()[-5:] if len(converter.get_history()) > 5 else converter.get_history(),
            }

            if converter_type == 'sigma_delta_adc':
                response['bitstream'] = sim_results.get('bitstream', [])[:256]
                response['snr_theoretical'] = converter.get_snr_theoretical()

            return jsonify(response)

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/step', methods=['POST'])
def step():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No JSON data provided'}), 400

        session_id = data.get('session_id', 'default')
        converter_type = data.get('converter_type')
        input_value = data.get('input_value', 0.5)
        params = data.get('params', {})
        bit_index = data.get('bit_index', None)

        # Create or retrieve session
        if session_id not in sessions:
            if converter_type not in CONVERTERS:
                return jsonify({'error': f'Unknown converter type: {converter_type}'}), 400
            converter_class = CONVERTERS[converter_type]
            sessions[session_id] = {
                'converter': converter_class(**params),
                'type': converter_type,
            }

        converter = sessions[session_id]['converter']

        # SAR step-by-bit mode
        if bit_index is not None and hasattr(converter, 'step_bit'):
            result = converter.step_bit(input_value, bit_index)
        else:
            result = converter.step(input_value)

        return jsonify({
            'state': result,
            'explanation': converter.get_explanation(),
            'session_id': session_id,
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/reset', methods=['POST'])
def reset():
    try:
        data = request.get_json()
        session_id = data.get('session_id', 'default') if data else 'default'

        if session_id in sessions:
            sessions[session_id]['converter'].reset()
            return jsonify({'status': 'reset', 'session_id': session_id})
        else:
            return jsonify({'status': 'no_session', 'session_id': session_id})

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/interpolate', methods=['POST'])
def interpolate():
    try:
        data = request.get_json()
        codes = data.get('codes', [])
        method = data.get('method', 'zoh')
        num_bits = data.get('num_bits', 8)
        vref = data.get('vref', 1.0)
        sample_rate = data.get('sample_rate', 1000)

        result = interpolate_signal(codes, method, num_bits, vref, sample_rate)
        return jsonify({'interpolated': result, 'method': method})

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/fft', methods=['POST'])
def fft_endpoint():
    try:
        data = request.get_json()
        signal = data.get('signal', [])
        sample_rate = data.get('sample_rate', 1000)

        freqs, magnitudes = compute_fft(signal, sample_rate)
        return jsonify({'frequencies': freqs, 'magnitudes': magnitudes})

    except Exception as e:
        return jsonify({'error': str(e)}), 500


def _generate_dac_input(signal_config, num_bits):
    """Generate input code sequence for DAC."""
    num_levels = 2 ** num_bits
    input_mode = signal_config.get('input_mode', signal_config.get('type', 'ramp'))
    clock_freq = signal_config.get('clock_freq', 10000)
    num_cycles = signal_config.get('num_cycles', 2)

    if input_mode == 'frequency':
        # Generate sine codewords to produce desired output frequency
        out_freq = signal_config.get('out_freq', 100)
        out_amp = signal_config.get('out_amp', 0.8)
        vref = signal_config.get('vref', 1.0)
        # Samples per cycle of output waveform
        samples_per_cycle = max(4, int(round(clock_freq / out_freq)))
        num_samples = samples_per_cycle * num_cycles
        t = np.linspace(0, num_cycles * 2 * np.pi, num_samples, endpoint=False)
        # Normalize amplitude relative to vref
        amp_norm = min(out_amp / vref, 1.0) if vref > 0 else 0.5
        normalized = (np.sin(t) * amp_norm + 1) / 2  # 0 to 1
        codes = [int(round(v * (num_levels - 1))) for v in normalized]
    elif input_mode == 'codewords':
        codes_str = signal_config.get('codes', '0')
        if isinstance(codes_str, str):
            codes = [int(c.strip()) for c in codes_str.split(',') if c.strip()]
        else:
            codes = list(codes_str)
    elif input_mode == 'ramp':
        num_samples = signal_config.get('num_samples', num_levels)
        codes = list(range(min(num_samples, num_levels)))
    elif input_mode == 'step':
        num_samples = signal_config.get('num_samples', 64)
        code_low = signal_config.get('code_low', 0)
        code_high = signal_config.get('code_high', num_levels // 2)
        mid = num_samples // 2
        codes = [code_low] * mid + [code_high] * (num_samples - mid)
    elif input_mode == 'sine':
        # Legacy support
        num_samples = signal_config.get('num_samples', 64)
        t = np.linspace(0, 2 * np.pi, num_samples)
        normalized = (np.sin(t) + 1) / 2
        codes = [int(round(v * (num_levels - 1))) for v in normalized]
    elif input_mode == 'manual':
        # Legacy support
        codes = signal_config.get('codes', [0])
        if isinstance(codes, str):
            codes = [int(c.strip()) for c in codes.split(',') if c.strip()]
    else:
        codes = list(range(min(64, num_levels)))

    return [max(0, min(num_levels - 1, c)) for c in codes]


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    print("=" * 50)
    print("  ADC/DAC Educational Simulator")
    print(f"  http://localhost:{port}")
    print("=" * 50)
    app.run(host='0.0.0.0', port=port, debug=False)
