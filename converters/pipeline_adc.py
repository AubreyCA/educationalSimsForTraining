import numpy as np


class PipelineADC:
    def __init__(self, num_stages=3, bits_per_stage=2, vref=1.0, cap_mismatch=0.0, noise_std=0.0):
        self.num_stages = num_stages
        self.bits_per_stage = bits_per_stage
        self.vref = vref
        self.cap_mismatch = cap_mismatch
        self.noise_std = noise_std
        self.total_bits = num_stages * bits_per_stage
        self.num_levels = 2 ** self.total_bits
        self.lsb = vref / self.num_levels
        # Gain per stage (with 1-bit redundancy for error correction, gain = 2^bits_per_stage)
        self.stage_gain = 2 ** bits_per_stage
        self.reset()

    def reset(self):
        self.history = []
        self.current_state = None
        self.step_index = 0
        self.pipeline = []  # Samples currently in the pipeline

    def _quantize_stage(self, voltage, stage_index):
        """Sub-ADC quantization within one stage."""
        stage_levels = 2 ** self.bits_per_stage
        stage_lsb = self.vref / stage_levels

        # Add mismatch
        mismatch = np.random.uniform(-self.cap_mismatch, self.cap_mismatch) if self.cap_mismatch > 0 else 0.0
        noise = np.random.normal(0, self.noise_std) if self.noise_std > 0 else 0.0

        effective_voltage = voltage + noise

        # Quantize
        code = int(np.floor(effective_voltage / stage_lsb))
        code = max(0, min(stage_levels - 1, code))

        # Sub-DAC reconstruction
        reconstructed = code * stage_lsb + mismatch

        # Residue with gain
        residue = (effective_voltage - reconstructed) * self.stage_gain

        # Clamp residue to valid range
        residue = max(0.0, min(self.vref, residue))

        return {
            'stage_index': stage_index,
            'input_voltage': voltage,
            'effective_voltage': effective_voltage,
            'sub_adc_code': code,
            'sub_adc_binary': format(code, f'0{self.bits_per_stage}b'),
            'reconstructed': reconstructed,
            'residue_before_gain': effective_voltage - reconstructed,
            'gain': self.stage_gain,
            'residue_after_gain': residue,
            'stage_lsb': stage_lsb,
        }

    def step(self, input_value):
        """Process one sample through all pipeline stages."""
        vin = float(input_value)
        vin = max(0.0, min(self.vref - 1e-10, vin))

        stages = []
        current_voltage = vin

        for stage_idx in range(self.num_stages):
            stage_result = self._quantize_stage(current_voltage, stage_idx)
            stages.append(stage_result)
            current_voltage = stage_result['residue_after_gain']

        # Combine stage codes (simple concatenation for now)
        combined_bits = ''.join(s['sub_adc_binary'] for s in stages)
        digital_code = int(combined_bits, 2)
        digital_code = min(digital_code, self.num_levels - 1)

        # Digital error correction (redundant bit correction)
        # For simplicity, just use direct concatenation
        quantized_voltage = digital_code * self.lsb
        quantization_error = vin - quantized_voltage

        self.step_index += 1
        self.current_state = {
            'step_index': self.step_index,
            'input_voltage': vin,
            'stages': stages,
            'combined_bits': combined_bits,
            'digital_code': digital_code,
            'binary_code': format(digital_code, f'0{self.total_bits}b'),
            'quantized_voltage': quantized_voltage,
            'quantization_error': quantization_error,
            'num_stages': self.num_stages,
            'bits_per_stage': self.bits_per_stage,
            'total_bits': self.total_bits,
            'vref': self.vref,
            'lsb': self.lsb,
            'latency_cycles': self.num_stages,
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
        lines.append(f"=== Pipeline ADC Conversion (Sample #{s['step_index']}) ===")
        lines.append(f"Input: {s['input_voltage']:.4f} V")
        lines.append(f"Configuration: {s['num_stages']} stages × {s['bits_per_stage']} bits/stage = {s['total_bits']} total bits")
        lines.append(f"Latency: {s['latency_cycles']} clock cycles (pipelined)")
        lines.append("")

        for stage in s['stages']:
            idx = stage['stage_index']
            lines.append(f"  Stage {idx + 1}:")
            lines.append(f"    Input to stage: {stage['input_voltage']:.4f} V")
            lines.append(f"    Sub-ADC ({s['bits_per_stage']}-bit): code = {stage['sub_adc_binary']} (decimal {stage['sub_adc_code']})")
            lines.append(f"    Sub-DAC reconstructs: {stage['reconstructed']:.4f} V")
            lines.append(f"    Residue = ({stage['input_voltage']:.4f} - {stage['reconstructed']:.4f}) × {stage['gain']} = {stage['residue_after_gain']:.4f} V")
            if idx < s['num_stages'] - 1:
                lines.append(f"    → Passing residue {stage['residue_after_gain']:.4f} V to Stage {idx + 2}")
            lines.append("")

        lines.append(f"Digital error correction: combine all stage bits")
        lines.append(f"Combined: {s['combined_bits']} = decimal {s['digital_code']}")
        lines.append(f"Quantized voltage: {s['quantized_voltage']:.4f} V")
        lines.append(f"Quantization error: {s['quantization_error']:.4f} V")
        return "\n".join(lines)

    def get_history(self):
        return self.history

    def simulate(self, input_signal):
        self.reset()
        results = []
        for sample in input_signal:
            results.append(self.step(sample))
        return results
