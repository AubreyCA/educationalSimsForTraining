import numpy as np


class FlashADC:
    def __init__(self, num_bits=3, vref=1.0, comparator_offset=0.0, noise_std=0.0):
        self.num_bits = num_bits
        self.vref = vref
        self.comparator_offset = comparator_offset
        self.noise_std = noise_std
        self.num_levels = 2 ** num_bits
        self.num_comparators = self.num_levels - 1
        self.lsb = vref / self.num_levels
        self.thresholds = np.array([(i + 1) * self.lsb for i in range(self.num_comparators)])
        self.reset()

    def reset(self):
        self.history = []
        self.current_state = None
        self.step_index = 0

    def step(self, input_value):
        vin = float(input_value)
        noise = np.random.normal(0, self.noise_std) if self.noise_std > 0 else 0.0
        vin_noisy = vin + noise

        # All comparators fire simultaneously
        comparator_outputs = []
        for i, threshold in enumerate(self.thresholds):
            effective_threshold = threshold + self.comparator_offset
            comparator_outputs.append(1 if vin_noisy >= effective_threshold else 0)

        # Thermometer code
        thermometer_code = comparator_outputs[:]

        # Count ones to get digital code
        digital_code = sum(thermometer_code)

        # Clamp
        digital_code = max(0, min(self.num_levels - 1, digital_code))

        # Quantized voltage
        quantized_voltage = digital_code * self.lsb
        quantization_error = vin - quantized_voltage

        # Binary representation
        binary_code = format(digital_code, f'0{self.num_bits}b')

        self.step_index += 1
        self.current_state = {
            'step_index': self.step_index,
            'input_voltage': vin,
            'input_noisy': vin_noisy,
            'thresholds': self.thresholds.tolist(),
            'comparator_outputs': comparator_outputs,
            'thermometer_code': thermometer_code,
            'digital_code': digital_code,
            'binary_code': binary_code,
            'quantized_voltage': quantized_voltage,
            'quantization_error': quantization_error,
            'num_bits': self.num_bits,
            'vref': self.vref,
            'lsb': self.lsb,
            'num_comparators': self.num_comparators,
        }

        self.history.append(self.current_state.copy())
        return self.current_state

    def get_state(self):
        return self.current_state if self.current_state else {}

    def get_explanation(self):
        if not self.current_state:
            return "No conversion performed yet."
        s = self.current_state
        lines = []
        lines.append(f"=== Flash ADC Conversion (Sample #{s['step_index']}) ===")
        lines.append(f"Input voltage: {s['input_voltage']:.4f} V")
        lines.append(f"Reference voltage: {s['vref']} V, Resolution: {s['num_bits']} bits")
        lines.append(f"LSB size: {s['lsb']:.4f} V, Number of comparators: {s['num_comparators']}")
        lines.append("")
        lines.append("Step 1: Resistor ladder divides Vref into thresholds:")
        for i, t in enumerate(s['thresholds']):
            lines.append(f"  Comparator {i+1}: threshold = {t:.4f} V")
        lines.append("")
        lines.append("Step 2: All comparators fire simultaneously:")
        for i, (t, out) in enumerate(zip(s['thresholds'], s['comparator_outputs'])):
            cmp = "≥" if out == 1 else "<"
            lines.append(f"  C{i+1}: Vin({s['input_voltage']:.4f}) {cmp} {t:.4f} → output = {out}")
        lines.append("")
        lines.append(f"Step 3: Thermometer code = {''.join(map(str, s['thermometer_code']))}")
        lines.append(f"Step 4: Priority encoder → binary = {s['binary_code']} (decimal {s['digital_code']})")
        lines.append(f"Step 5: Quantized voltage = {s['quantized_voltage']:.4f} V")
        lines.append(f"  Quantization error = {s['quantization_error']:.4f} V")
        return "\n".join(lines)

    def get_history(self):
        return self.history

    def simulate(self, input_signal):
        self.reset()
        results = []
        for sample in input_signal:
            results.append(self.step(sample))
        return results
