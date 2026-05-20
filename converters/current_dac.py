import numpy as np


class CurrentDAC:
    def __init__(self, num_bits=8, vref=1.0, r_load=1.0, mode='binary', current_mismatch=0.0):
        self.num_bits = num_bits
        self.vref = vref
        self.r_load = r_load
        self.mode = mode  # 'binary' or 'thermometer'
        self.current_mismatch = current_mismatch
        self.num_levels = 2 ** num_bits
        self.lsb = vref / self.num_levels
        # Unit current: I_unit = Vref / (R_load * (2^N - 1)) to get full-scale = Vref
        self.i_unit = vref / (r_load * (self.num_levels - 1)) if self.num_levels > 1 else vref / r_load
        self.reset()

    def reset(self):
        self.history = []
        self.current_state = None
        self.step_index = 0
        self.prev_code = None

    def step(self, input_code):
        """Convert a digital code to analog output."""
        code = int(input_code)
        code = max(0, min(self.num_levels - 1, code))
        binary = format(code, f'0{self.num_bits}b')
        bits = [int(b) for b in binary]

        if self.mode == 'binary':
            result = self._binary_weighted(code, bits)
        else:
            result = self._thermometer_coded(code, bits)

        # Calculate glitch if previous code exists
        glitch_info = None
        if self.prev_code is not None:
            glitch_info = self._calculate_glitch(self.prev_code, code)

        result['glitch'] = glitch_info
        self.prev_code = code

        self.step_index += 1
        result['step_index'] = self.step_index
        self.current_state = result
        self.history.append(result.copy())
        return result

    def _binary_weighted(self, code, bits):
        """Binary-weighted current steering."""
        sources = []
        total_current = 0.0

        for i, bit in enumerate(bits):
            weight = 2 ** (self.num_bits - 1 - i)
            ideal_current = weight * self.i_unit
            mismatch = np.random.uniform(-self.current_mismatch, self.current_mismatch) * ideal_current if self.current_mismatch > 0 else 0.0
            actual_current = ideal_current + mismatch

            switched_current = bit * actual_current
            total_current += switched_current

            sources.append({
                'source_index': i,
                'label': f'I×{weight}',
                'weight': weight,
                'ideal_current': ideal_current,
                'actual_current': actual_current,
                'bit_value': bit,
                'switched_to': 'output' if bit == 1 else 'dump',
                'output_current': switched_current,
            })

        output_voltage = total_current * self.r_load
        ideal_voltage = code * self.i_unit * self.r_load

        return {
            'input_code': code,
            'binary_code': ''.join(map(str, bits)),
            'mode': 'binary',
            'sources': sources,
            'total_current': total_current,
            'output_voltage': output_voltage,
            'ideal_voltage': ideal_voltage,
            'error': output_voltage - ideal_voltage,
            'num_bits': self.num_bits,
            'vref': self.vref,
            'r_load': self.r_load,
            'i_unit': self.i_unit,
        }

    def _thermometer_coded(self, code, bits):
        """Thermometer-coded current steering."""
        # Convert binary code to thermometer (unary)
        num_unit_sources = self.num_levels - 1  # 2^N - 1 unit sources
        thermo_code = [1 if i < code else 0 for i in range(num_unit_sources)]

        sources = []
        total_current = 0.0

        for i, active in enumerate(thermo_code):
            ideal_current = self.i_unit
            mismatch = np.random.uniform(-self.current_mismatch, self.current_mismatch) * ideal_current if self.current_mismatch > 0 else 0.0
            actual_current = ideal_current + mismatch

            switched_current = active * actual_current
            total_current += switched_current

            sources.append({
                'source_index': i,
                'label': f'I_unit[{i}]',
                'weight': 1,
                'ideal_current': ideal_current,
                'actual_current': actual_current,
                'active': active,
                'switched_to': 'output' if active == 1 else 'dump',
                'output_current': switched_current,
            })

        output_voltage = total_current * self.r_load
        ideal_voltage = code * self.i_unit * self.r_load

        return {
            'input_code': code,
            'binary_code': ''.join(map(str, bits)),
            'thermometer_code': ''.join(map(str, thermo_code)),
            'mode': 'thermometer',
            'sources': sources,
            'total_current': total_current,
            'output_voltage': output_voltage,
            'ideal_voltage': ideal_voltage,
            'error': output_voltage - ideal_voltage,
            'num_bits': self.num_bits,
            'vref': self.vref,
            'r_load': self.r_load,
            'i_unit': self.i_unit,
            'num_unit_sources': num_unit_sources,
            'active_sources': code,
        }

    def _calculate_glitch(self, prev_code, new_code):
        """Estimate glitch energy during transition."""
        prev_bits = [int(b) for b in format(prev_code, f'0{self.num_bits}b')]
        new_bits = [int(b) for b in format(new_code, f'0{self.num_bits}b')]

        # Count bits that change
        bits_changed = sum(1 for a, b in zip(prev_bits, new_bits) if a != b)

        # Worst case: major carry (e.g., 0111 → 1000)
        is_major_carry = (prev_code + 1 == new_code) and bits_changed > 1

        # Glitch energy proportional to number of simultaneous switches
        glitch_magnitude = bits_changed * self.i_unit * self.r_load

        return {
            'prev_code': prev_code,
            'new_code': new_code,
            'bits_changed': bits_changed,
            'is_major_carry': is_major_carry,
            'glitch_magnitude': glitch_magnitude,
        }

    def get_transfer_characteristic(self):
        """Generate full transfer characteristic."""
        codes = list(range(self.num_levels))
        ideal_voltages = []
        actual_voltages = []
        inl = []
        dnl = []

        lsb_voltage = self.i_unit * self.r_load

        prev_voltage = 0.0
        for code in codes:
            ideal_v = code * lsb_voltage
            ideal_voltages.append(ideal_v)

            # Calculate actual (without mismatch for characterization)
            if self.mode == 'binary':
                bits = [int(b) for b in format(code, f'0{self.num_bits}b')]
                actual_v = sum(bits[i] * (2 ** (self.num_bits - 1 - i)) * self.i_unit * self.r_load for i in range(self.num_bits))
            else:
                actual_v = code * self.i_unit * self.r_load
            actual_voltages.append(actual_v)

            if code > 0:
                step_size = actual_v - prev_voltage
                dnl_val = (step_size - lsb_voltage) / lsb_voltage if lsb_voltage > 0 else 0
                dnl.append(dnl_val)
            else:
                dnl.append(0.0)

            inl_val = (actual_v - ideal_v) / lsb_voltage if lsb_voltage > 0 else 0
            inl.append(inl_val)
            prev_voltage = actual_v

        return {
            'codes': codes,
            'ideal_voltages': ideal_voltages,
            'actual_voltages': actual_voltages,
            'inl': inl,
            'dnl': dnl,
            'max_inl': max(abs(v) for v in inl) if inl else 0,
            'max_dnl': max(abs(v) for v in dnl) if dnl else 0,
        }

    def get_state(self):
        return self.current_state if self.current_state else {}

    def get_explanation(self):
        if not self.current_state:
            return "No conversion performed yet."
        s = self.current_state
        lines = []
        lines.append(f"=== Current-Steering DAC (Step #{s['step_index']}) ===")
        lines.append(f"Mode: {s['mode']}-weighted")
        lines.append(f"Input code: {s['input_code']} (binary: {s['binary_code']})")
        lines.append(f"Resolution: {s['num_bits']} bits, R_load: {s['r_load']} Ω, I_unit: {s['i_unit']:.6f} A")
        lines.append("")

        if s['mode'] == 'binary':
            lines.append("Current sources (binary-weighted):")
            for src in s['sources']:
                lines.append(f"  {src['label']}: bit={src['bit_value']} → switch to {src['switched_to']}")
                lines.append(f"    Current: {src['output_current']:.6f} A")
            lines.append("")
            formula_parts = []
            for src in s['sources']:
                if src['bit_value'] == 1:
                    formula_parts.append(f"{src['weight']}I")
                else:
                    formula_parts.append("0")
            lines.append(f"  Total: {' + '.join(formula_parts)} = {s['total_current']:.6f} A")
        else:
            lines.append(f"Thermometer code: {s.get('thermometer_code', '')}")
            lines.append(f"Active sources: {s.get('active_sources', 0)} of {s.get('num_unit_sources', 0)} unit sources")
            lines.append(f"Total current: {s['active_sources']} × I_unit = {s['total_current']:.6f} A")

        lines.append(f"\nOutput: I_total × R_load = {s['total_current']:.6f} × {s['r_load']} = {s['output_voltage']:.6f} V")

        if s['glitch']:
            g = s['glitch']
            lines.append(f"\nTransition: code {g['prev_code']} → {g['new_code']}")
            lines.append(f"Bits changed: {g['bits_changed']}")
            if g['is_major_carry']:
                lines.append("⚠️ MAJOR CARRY - high glitch energy!")
            lines.append(f"Glitch magnitude: {g['glitch_magnitude']:.6f} V")

        return "\n".join(lines)

    def get_history(self):
        return self.history

    def simulate(self, input_codes):
        self.reset()
        results = []
        for code in input_codes:
            results.append(self.step(code))
        return results
