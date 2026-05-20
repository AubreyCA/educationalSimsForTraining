import numpy as np


class R2RDAC:
    def __init__(self, num_bits=8, vref=1.0, r_mismatch=0.0):
        self.num_bits = num_bits
        self.vref = vref
        self.r_mismatch = r_mismatch
        self.num_levels = 2 ** num_bits
        self.lsb = vref / self.num_levels
        self.reset()

    def reset(self):
        self.history = []
        self.current_state = None
        self.step_index = 0

    def step(self, input_code):
        """Convert a digital code to analog voltage."""
        code = int(input_code)
        code = max(0, min(self.num_levels - 1, code))

        binary = format(code, f'0{self.num_bits}b')
        bits = [int(b) for b in binary]

        # Calculate contribution from each bit with optional mismatch
        contributions = []
        total_voltage = 0.0

        for i, bit in enumerate(bits):
            weight = self.vref / (2 ** (i + 1))
            # Add resistor mismatch
            mismatch = np.random.uniform(-self.r_mismatch, self.r_mismatch) * weight if self.r_mismatch > 0 else 0.0
            actual_weight = weight + mismatch

            contribution = bit * actual_weight
            total_voltage += contribution

            contributions.append({
                'bit_position': i,
                'bit_label': f'Bit {self.num_bits - 1 - i} (MSB)' if i == 0 else f'Bit {self.num_bits - 1 - i}',
                'bit_value': bit,
                'ideal_weight': weight,
                'actual_weight': actual_weight,
                'contribution': contribution,
                'switch_state': 'Vref' if bit == 1 else 'GND',
                'running_total': total_voltage,
            })

        ideal_voltage = code * self.lsb
        error = total_voltage - ideal_voltage

        self.step_index += 1
        self.current_state = {
            'step_index': self.step_index,
            'input_code': code,
            'binary_code': binary,
            'bits': bits,
            'contributions': contributions,
            'output_voltage': total_voltage,
            'ideal_voltage': ideal_voltage,
            'error': error,
            'num_bits': self.num_bits,
            'vref': self.vref,
            'lsb': self.lsb,
        }

        self.history.append(self.current_state.copy())
        return self.current_state

    def get_transfer_characteristic(self):
        """Generate full transfer characteristic (all codes)."""
        codes = list(range(self.num_levels))
        ideal_voltages = [c * self.lsb for c in codes]
        actual_voltages = []
        inl = []
        dnl = []

        prev_voltage = 0.0
        for code in codes:
            # Reset mismatch for consistent results in characterization
            binary = format(code, f'0{self.num_bits}b')
            bits = [int(b) for b in binary]
            voltage = sum(bits[i] * self.vref / (2 ** (i + 1)) for i in range(self.num_bits))
            actual_voltages.append(voltage)

            if code > 0:
                step_size = voltage - prev_voltage
                dnl_val = (step_size - self.lsb) / self.lsb
                dnl.append(dnl_val)
            else:
                dnl.append(0.0)

            inl_val = (voltage - code * self.lsb) / self.lsb
            inl.append(inl_val)
            prev_voltage = voltage

        return {
            'codes': codes,
            'ideal_voltages': ideal_voltages,
            'actual_voltages': actual_voltages,
            'inl': inl,
            'dnl': dnl,
            'max_inl': max(abs(v) for v in inl),
            'max_dnl': max(abs(v) for v in dnl),
        }

    def get_state(self):
        return self.current_state if self.current_state else {}

    def get_explanation(self):
        if not self.current_state:
            return "No conversion performed yet."
        s = self.current_state
        lines = []
        lines.append(f"=== R-2R Ladder DAC Conversion (Step #{s['step_index']}) ===")
        lines.append(f"Input code: {s['input_code']} (binary: {s['binary_code']})")
        lines.append(f"Resolution: {s['num_bits']} bits, Vref: {s['vref']} V, LSB: {s['lsb']:.6f} V")
        lines.append("")
        lines.append("Bit-by-bit contribution (R-2R binary weighting):")
        for c in s['contributions']:
            switch = c['switch_state']
            lines.append(f"  {c['bit_label']}: bit={c['bit_value']} → switch to {switch}")
            lines.append(f"    Weight: Vref/{2**(c['bit_position']+1)} = {c['ideal_weight']:.6f} V")
            lines.append(f"    Contribution: {c['bit_value']} × {c['ideal_weight']:.6f} = {c['contribution']:.6f} V")
            lines.append(f"    Running total: {c['running_total']:.6f} V")
        lines.append("")
        lines.append(f"Output voltage: {s['output_voltage']:.6f} V")
        lines.append(f"Ideal voltage: {s['ideal_voltage']:.6f} V")
        lines.append(f"Error: {s['error']:.6f} V")
        lines.append("")
        lines.append("R-2R advantage: only 2 resistor values needed (R and 2R)")
        return "\n".join(lines)

    def get_history(self):
        return self.history

    def simulate(self, input_codes):
        self.reset()
        results = []
        for code in input_codes:
            results.append(self.step(code))
        return results
