import numpy as np


class SARADC:
    def __init__(self, num_bits=4, vref=1.0, comparator_offset=0.0, noise_std=0.0):
        self.num_bits = num_bits
        self.vref = vref
        self.comparator_offset = comparator_offset
        self.noise_std = noise_std
        self.num_levels = 2 ** num_bits
        self.lsb = vref / self.num_levels
        self.reset()

    def reset(self):
        self.history = []
        self.current_state = None
        self.step_index = 0
        self.current_sample_state = None

    def _convert_sample(self, input_value):
        """Perform full SAR conversion on one sample, recording each bit trial."""
        vin = float(input_value)
        noise = np.random.normal(0, self.noise_std) if self.noise_std > 0 else 0.0
        vin_noisy = vin + noise

        register = [0] * self.num_bits
        bit_trials = []
        dac_voltage = 0.0

        for bit_pos in range(self.num_bits):
            # Try setting this bit
            register[bit_pos] = 1
            # Calculate DAC voltage from current register
            dac_voltage = sum(register[i] * (self.vref / (2 ** (i + 1))) for i in range(self.num_bits))

            # Comparator decision
            effective_dac = dac_voltage + self.comparator_offset
            if vin_noisy >= effective_dac:
                decision = 1  # Keep bit high
            else:
                decision = 0  # Clear bit
                register[bit_pos] = 0
                dac_voltage = sum(register[i] * (self.vref / (2 ** (i + 1))) for i in range(self.num_bits))

            # Search range
            code_so_far = sum(register[i] * (2 ** (self.num_bits - 1 - i)) for i in range(self.num_bits))
            range_low = code_so_far * self.lsb
            range_high = range_low + self.vref / (2 ** (bit_pos + 1))

            bit_trials.append({
                'bit_position': bit_pos,
                'bit_label': f'Bit {self.num_bits - 1 - bit_pos} (weight={self.vref / (2 ** (bit_pos + 1)):.4f}V)',
                'dac_voltage_tested': effective_dac,
                'decision': decision,
                'register_state': register[:],
                'binary_so_far': ''.join(map(str, register)),
                'dac_voltage_after': dac_voltage,
                'search_range_low': range_low,
                'search_range_high': range_high,
            })

        # Final result
        digital_code = sum(register[i] * (2 ** (self.num_bits - 1 - i)) for i in range(self.num_bits))
        binary_code = ''.join(map(str, register))
        quantized_voltage = digital_code * self.lsb
        quantization_error = vin - quantized_voltage

        return {
            'input_voltage': vin,
            'input_noisy': vin_noisy,
            'bit_trials': bit_trials,
            'final_register': register[:],
            'digital_code': digital_code,
            'binary_code': binary_code,
            'quantized_voltage': quantized_voltage,
            'quantization_error': quantization_error,
            'num_bits': self.num_bits,
            'vref': self.vref,
            'lsb': self.lsb,
            'total_cycles': self.num_bits,
        }

    def step(self, input_value):
        """Process one full sample (all bit trials)."""
        self.step_index += 1
        result = self._convert_sample(input_value)
        result['step_index'] = self.step_index
        self.current_state = result
        self.history.append(result.copy())
        return result

    def step_bit(self, input_value, bit_index):
        """For interactive step-by-step: perform conversion up to bit_index."""
        vin = float(input_value)
        noise = np.random.normal(0, self.noise_std) if self.noise_std > 0 else 0.0
        vin_noisy = vin + noise

        register = [0] * self.num_bits
        bit_trials = []
        dac_voltage = 0.0

        for bit_pos in range(min(bit_index + 1, self.num_bits)):
            register[bit_pos] = 1
            dac_voltage = sum(register[i] * (self.vref / (2 ** (i + 1))) for i in range(self.num_bits))
            effective_dac = dac_voltage + self.comparator_offset

            if vin_noisy >= effective_dac:
                decision = 1
            else:
                decision = 0
                register[bit_pos] = 0
                dac_voltage = sum(register[i] * (self.vref / (2 ** (i + 1))) for i in range(self.num_bits))

            code_so_far = sum(register[i] * (2 ** (self.num_bits - 1 - i)) for i in range(self.num_bits))
            range_low = code_so_far * self.lsb
            range_high = range_low + self.vref / (2 ** (bit_pos + 1))

            bit_trials.append({
                'bit_position': bit_pos,
                'bit_label': f'Bit {self.num_bits - 1 - bit_pos} (weight={self.vref / (2 ** (bit_pos + 1)):.4f}V)',
                'dac_voltage_tested': effective_dac,
                'decision': decision,
                'register_state': register[:],
                'binary_so_far': ''.join(map(str, register)),
                'dac_voltage_after': dac_voltage,
                'search_range_low': range_low,
                'search_range_high': range_high,
            })

        completed = (bit_index >= self.num_bits - 1)
        digital_code = sum(register[i] * (2 ** (self.num_bits - 1 - i)) for i in range(self.num_bits))
        binary_code = ''.join(map(str, register))
        quantized_voltage = digital_code * self.lsb

        return {
            'input_voltage': vin,
            'input_noisy': vin_noisy,
            'bit_trials': bit_trials,
            'current_bit': bit_index,
            'completed': completed,
            'register_state': register[:],
            'digital_code': digital_code,
            'binary_code': binary_code,
            'quantized_voltage': quantized_voltage,
            'quantization_error': vin - quantized_voltage,
            'num_bits': self.num_bits,
            'vref': self.vref,
            'lsb': self.lsb,
        }

    def get_state(self):
        return self.current_state if self.current_state else {}

    def get_explanation(self):
        if not self.current_state:
            return "No conversion performed yet."
        s = self.current_state
        lines = []
        lines.append(f"=== SAR ADC Conversion (Sample #{s['step_index']}) ===")
        lines.append(f"Input voltage: {s['input_voltage']:.4f} V")
        lines.append(f"Resolution: {s['num_bits']} bits, Vref: {s['vref']} V, LSB: {s['lsb']:.4f} V")
        lines.append(f"This is a BINARY SEARCH on voltage levels ({s['total_cycles']} steps for {s['num_bits']} bits)")
        lines.append("")
        for trial in s['bit_trials']:
            bit_pos = trial['bit_position']
            cmp = "≥" if trial['decision'] == 1 else "<"
            keep = "KEEP bit = 1" if trial['decision'] == 1 else "CLEAR bit = 0"
            lines.append(f"  Cycle {bit_pos + 1}: Test {trial['bit_label']}")
            lines.append(f"    DAC outputs {trial['dac_voltage_tested']:.4f} V")
            lines.append(f"    Vin({s['input_voltage']:.4f}) {cmp} DAC({trial['dac_voltage_tested']:.4f}) → {keep}")
            lines.append(f"    Register: {trial['binary_so_far']}")
            lines.append(f"    Remaining range: [{trial['search_range_low']:.4f}, {trial['search_range_high']:.4f}] V")
            lines.append("")
        lines.append(f"Result: code = {s['binary_code']} (decimal {s['digital_code']})")
        lines.append(f"Quantized voltage: {s['quantized_voltage']:.4f} V")
        lines.append(f"Quantization error: {s['quantization_error']:.4f} V")
        lines.append(f"Total clock cycles: {s['total_cycles']}")
        return "\n".join(lines)

    def get_history(self):
        return self.history

    def simulate(self, input_signal):
        self.reset()
        results = []
        for sample in input_signal:
            results.append(self.step(sample))
        return results
