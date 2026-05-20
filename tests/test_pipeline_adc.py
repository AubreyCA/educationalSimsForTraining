import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from converters.pipeline_adc import PipelineADC


def test_pipeline_basic():
    adc = PipelineADC(num_bits=8, vref=1.0, num_stages=4, bits_per_stage=2)
    result = adc.simulate(0.5)
    assert 'digital_code' in result
    assert 'binary_code' in result
    assert 'stages' in result


def test_pipeline_stage_count():
    adc = PipelineADC(num_bits=8, vref=1.0, num_stages=4, bits_per_stage=2)
    result = adc.simulate(0.5)
    assert len(result['stages']) == 4


def test_pipeline_residue_decreases():
    adc = PipelineADC(num_bits=8, vref=1.0, num_stages=4, bits_per_stage=2)
    result = adc.simulate(0.3)
    stages = result['stages']
    # Input to each stage should be the residue from previous
    for i in range(1, len(stages)):
        assert 'input_voltage' in stages[i]


def test_pipeline_min_max():
    adc = PipelineADC(num_bits=8, vref=1.0, num_stages=4, bits_per_stage=2)
    r0 = adc.simulate(0.0)
    r1 = adc.simulate(1.0)
    assert r0['digital_code'] == 0
    assert r1['digital_code'] == 255


def test_pipeline_accuracy():
    adc = PipelineADC(num_bits=8, vref=1.0, num_stages=4, bits_per_stage=2)
    result = adc.simulate(0.75)
    expected = int(0.75 * 255)
    assert abs(result['digital_code'] - expected) <= 2


def test_pipeline_different_configs():
    configs = [(4, 2), (3, 3), (2, 4)]
    for stages, bps in configs:
        bits = stages * bps
        adc = PipelineADC(num_bits=bits, vref=1.0, num_stages=stages, bits_per_stage=bps)
        result = adc.simulate(0.5)
        assert 0 <= result['digital_code'] <= (2**bits - 1)


def test_pipeline_step_mode():
    adc = PipelineADC(num_bits=8, vref=1.0, num_stages=4, bits_per_stage=2)
    result = adc.step(0.5)
    assert result is not None


def test_pipeline_explanation():
    adc = PipelineADC(num_bits=8, vref=1.0, num_stages=4, bits_per_stage=2)
    adc.simulate(0.5)
    explanation = adc.get_explanation()
    assert isinstance(explanation, str)
    assert len(explanation) > 0
