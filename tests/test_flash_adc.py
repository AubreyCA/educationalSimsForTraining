import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from converters.flash_adc import FlashADC


def test_flash_basic_conversion():
    adc = FlashADC(num_bits=3, vref=1.0)
    result = adc.simulate(0.5)
    assert 'digital_code' in result
    assert 'binary_code' in result
    assert 0 <= result['digital_code'] <= 7


def test_flash_min_voltage():
    adc = FlashADC(num_bits=3, vref=1.0)
    result = adc.simulate(0.0)
    assert result['digital_code'] == 0


def test_flash_max_voltage():
    adc = FlashADC(num_bits=3, vref=1.0)
    result = adc.simulate(1.0)
    assert result['digital_code'] == 7


def test_flash_midscale():
    adc = FlashADC(num_bits=4, vref=1.0)
    result = adc.simulate(0.5)
    assert 7 <= result['digital_code'] <= 8


def test_flash_thermometer_code():
    adc = FlashADC(num_bits=3, vref=1.0)
    result = adc.simulate(0.75)
    assert 'thermometer_code' in result
    assert isinstance(result['thermometer_code'], list)


def test_flash_comparator_states():
    adc = FlashADC(num_bits=3, vref=1.0)
    result = adc.simulate(0.5)
    assert 'comparator_states' in result
    assert len(result['comparator_states']) == 7  # 2^3 - 1


def test_flash_step_mode():
    adc = FlashADC(num_bits=3, vref=1.0)
    result = adc.step(0.5)
    assert result is not None


def test_flash_different_resolutions():
    for bits in [2, 4, 6, 8]:
        adc = FlashADC(num_bits=bits, vref=1.0)
        result = adc.simulate(0.5)
        assert 0 <= result['digital_code'] <= (2**bits - 1)


def test_flash_explanation():
    adc = FlashADC(num_bits=3, vref=1.0)
    adc.simulate(0.5)
    explanation = adc.get_explanation()
    assert isinstance(explanation, str)
    assert len(explanation) > 0
