import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from converters.current_dac import CurrentDAC


def test_current_dac_binary_basic():
    dac = CurrentDAC(num_bits=4, vref=1.0, mode='binary')
    result = dac.simulate(8)
    assert 'output_voltage' in result


def test_current_dac_thermometer_basic():
    dac = CurrentDAC(num_bits=4, vref=1.0, mode='thermometer')
    result = dac.simulate(8)
    assert 'output_voltage' in result


def test_current_dac_zero():
    dac = CurrentDAC(num_bits=4, vref=1.0, mode='binary')
    result = dac.simulate(0)
    assert result['output_voltage'] == 0.0


def test_current_dac_monotonicity():
    for mode in ['binary', 'thermometer']:
        dac = CurrentDAC(num_bits=4, vref=1.0, mode=mode)
        prev = -1.0
        for code in range(16):
            result = dac.simulate(code)
            assert result['output_voltage'] >= prev
            prev = result['output_voltage']


def test_current_dac_glitch():
    dac = CurrentDAC(num_bits=4, vref=1.0, mode='binary')
    # Transition from 7 to 8 (0111 -> 1000) causes major carry
    dac.simulate(7)
    result = dac.simulate(8)
    if 'glitch' in result:
        assert result['glitch']['is_major_carry']


def test_current_dac_thermometer_no_glitch():
    dac = CurrentDAC(num_bits=4, vref=1.0, mode='thermometer')
    dac.simulate(7)
    result = dac.simulate(8)
    # Thermometer should only change 1 bit at a time
    if 'glitch' in result:
        assert result['glitch']['bits_changed'] == 1


def test_current_dac_transfer_characteristic():
    dac = CurrentDAC(num_bits=4, vref=1.0, mode='binary')
    tc = dac.get_transfer_characteristic()
    assert 'codes' in tc
    assert 'voltages' in tc


def test_current_dac_sources_info():
    dac = CurrentDAC(num_bits=4, vref=1.0, mode='binary')
    result = dac.simulate(10)
    assert 'sources' in result or 'total_current' in result
