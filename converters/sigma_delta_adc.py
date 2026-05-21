import numpy as np


class SigmaDeltaADC:
    def __init__(self, osr=64, vref=1.0, noise_std=0.0):
        self.osr = osr
        self.vref = vref
        self.noise_std = noise_std
        self.reset()

    def reset(self):
        self.integrator = 0.0
        self.feedback = 0.0
        self.bitstream = []
        self.history = []
        self.current_state = None
        self.step_index = 0
        self.sample_count = 0

    def step(self, input_value):
        """Process one oversampled clock cycle."""
        vin = float(input_value)
        noise = np.random.normal(0, self.noise_std) if self.noise_std > 0 else 0.0

        # Error signal: input minus feedback
        error = vin - self.feedback + noise

        # Integrator accumulates
        prev_integrator = self.integrator
        self.integrator += error

        # Comparator (1-bit quantizer)
        if self.integrator >= 0:
            bit_output = 1
            self.feedback = self.vref  # High reference
        else:
            bit_output = 0
            self.feedback = 0.0  # Low reference

        self.bitstream.append(bit_output)
        self.step_index += 1

        self.current_state = {
            'step_index': self.step_index,
            'input_voltage': vin,
            'error_signal': error,
            'integrator_prev': prev_integrator,
            'integrator_current': self.integrator,
            'comparator_output': bit_output,
            'feedback_value': self.feedback,
            'bitstream': self.bitstream[:],
            'bitstream_length': len(self.bitstream),
            'osr': self.osr,
            'vref': self.vref,
        }

        self.history.append(self.current_state.copy())
        return self.current_state

    def decimate(self, bitstream=None):
        """Apply decimation filter to the bitstream to get multi-bit result."""
        if bitstream is None:
            bitstream = self.bitstream

        if len(bitstream) == 0:
            return {'decimated_value': 0, 'num_bits_effective': 0}

        # Simple averaging decimation
        num_complete_groups = len(bitstream) // self.osr
        results = []

        for i in range(num_complete_groups):
            group = bitstream[i * self.osr:(i + 1) * self.osr]
            avg = sum(group) / len(group)
            # Map from [0, 1] to [0, Vref] range
            analog_value = avg * self.vref
            results.append({
                'group_index': i,
                'ones_count': sum(group),
                'zeros_count': len(group) - sum(group),
                'average': avg,
                'analog_value': analog_value,
            })

        # Effective bits from OSR (first-order: SNR = 6.02*N + 1.76 + 30*log10(OSR))
        # Solving for effective N given OSR:  extra_bits ≈ 0.5*log2(OSR)
        effective_bits = 0.5 * np.log2(self.osr) + 1  # approximate

        return {
            'decimated_results': results,
            'num_groups': num_complete_groups,
            'effective_bits': effective_bits,
            'osr': self.osr,
        }

    def simulate(self, input_signal):
        """Process an entire signal. Each input sample is oversampled OSR times."""
        self.reset()
        all_steps = []

        for sample in input_signal:
            # Each input sample gets OSR clock cycles
            sample_steps = []
            for _ in range(self.osr):
                result = self.step(sample)
                sample_steps.append(result)
            all_steps.append(sample_steps)

        decimation = self.decimate()

        return {
            'steps': all_steps,
            'bitstream': self.bitstream,
            'decimation': decimation,
            'total_clocks': len(self.bitstream),
            'num_input_samples': len(input_signal),
        }

    def simulate_continuous(self, input_signal_oversampled):
        """Process a pre-oversampled signal (one clock per input value)."""
        self.reset()
        results = []
        for sample in input_signal_oversampled:
            results.append(self.step(sample))
        decimation = self.decimate()
        return {
            'steps': results,
            'bitstream': self.bitstream,
            'decimation': decimation,
            'total_clocks': len(self.bitstream),
        }

    def get_state(self):
        return self.current_state if self.current_state else {}

    def get_explanation(self):
        if not self.current_state:
            return "No conversion performed yet."
        s = self.current_state
        lines = []
        lines.append(f"=== Sigma-Delta ADC Clock Cycle #{s['step_index']} ===")
        lines.append(f"OSR: {s['osr']}, Vref: {s['vref']} V")
        lines.append("")
        lines.append(f"1. Input sample: {s['input_voltage']:.4f} V")
        lines.append(f"2. Subtract feedback: {s['input_voltage']:.4f} - ({s['feedback_value']:.4f}) = error = {s['error_signal']:.4f}")
        lines.append(f"3. Integrator accumulates error:")
        lines.append(f"   h_t = h_{{t-1}} + error = {s['integrator_prev']:.4f} + {s['error_signal']:.4f} = {s['integrator_current']:.4f}")
        lines.append(f"4. Comparator: integrator ({s['integrator_current']:.4f}) {'≥' if s['comparator_output'] == 1 else '<'} 0")
        lines.append(f"   → output bit = {s['comparator_output']}")
        lines.append(f"5. 1-bit DAC feedback: {'Vref' if s['comparator_output'] == 1 else '0'} = {s['feedback_value']:.4f} V")
        lines.append("")
        recent = s['bitstream'][-min(20, len(s['bitstream'])):]
        lines.append(f"Bitstream (last {len(recent)}): {''.join(map(str, recent))}")
        lines.append(f"Total clocks: {s['bitstream_length']}")

        if s['bitstream_length'] >= s['osr']:
            ones = sum(s['bitstream'][-s['osr']:])
            avg = ones / s['osr']
            lines.append(f"\nDecimation (last {s['osr']} bits): {ones} ones / {s['osr']} = {avg:.4f}")
            lines.append(f"Reconstructed value: {avg:.4f} × {s['vref']} = {avg * s['vref']:.4f} V")

        lines.append("\n[RNN analogy: h_t = h_(t-1) + (x_t - y_(t-1)·Vref), y_t = sign(h_t)]")
        return "\n".join(lines)

    def get_history(self):
        return self.history

    def get_snr_theoretical(self):
        """Theoretical SNR for first-order sigma-delta."""
        snr_db = 6.02 * 1 + 1.76 + 30 * np.log10(self.osr)  # 1-bit quantizer
        enob = (snr_db - 1.76) / 6.02
        return {'snr_db': snr_db, 'enob': enob, 'osr': self.osr}
