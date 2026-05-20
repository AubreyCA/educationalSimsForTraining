import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from converters.sar_adc import SARADC


def test_sar_basic_conversion():
    adc = SARADC(num_bits=8, vref=1.0)
    result = adc.simulate(0.5)
    assert 'digital_code' in result
    assert 'binary_code' in result
    assert abs(result['digital_code'] - 128) <= 1


def test_sar_min_voltage():
    adc = SARADC(num_bits=8, vref=1.0)
    result = adc.simulate(0.0)
    assert result['digital_code'] == 0


def test_sar_max_voltage():
    adc = SARADC(num_bits=8, vref=1.0)
    result = adc.simulate(1.0)
    assert result['digital_code'] == 255


def test_sar_bit_trials():
    adc = SARADC(num_bits=4, vref=1.0)
    result = adc.simulate(0.6)
    assert 'bit_trials' in result
    assert len(result['bit_trials']) == 4


def test_sar_step_mode():
    adc = SARADC(num_bits=4, vref=1.0)
    adc.reset()
    steps = []
    for i in range(4):
        step = adc.step_bit(0.6)
        steps.append(step)
    assert len(steps) == 4
    assert steps[-1]['complete']


def test_sar_binary_search_accuracy():
    adc = SARADC(num_bits=10, vref=1.0)
    result = adc.simulate(0.333)
    expected = int(0.333 * 1024)
    assert abs(result['digital_code'] - expected) <= 1


def test_sar_bst_path():
    adc = SARADC(num_bits=4, vref=1.0)
    result = adc.simulate(0.5)
    assert 'bst_path' in result


def test_sar_explanation():
    adc = SARADC(num_bits=4, vref=1.0)
    adc.simulate(0.5)
    explanation = adc.get_explanation()
    assert isinstance(explanation, str)
    assert 'bit' in explanation.lower() or 'trial' in explanation.lower()
