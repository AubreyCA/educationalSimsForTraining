import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from converters.r2r_dac import R2RDAC


def test_r2r_basic():
    dac = R2RDAC(num_bits=4, vref=1.0)
    result = dac.simulate(8)
    assert 'output_voltage' in result
    assert abs(result['output_voltage'] - 0.5) < 0.1


def test_r2r_zero():
    dac = R2RDAC(num_bits=4, vref=1.0)
    result = dac.simulate(0)
    assert result['output_voltage'] == 0.0


def test_r2r_full_scale():
    dac = R2RDAC(num_bits=4, vref=1.0)
    result = dac.simulate(15)
    assert abs(result['output_voltage'] - 15 / 16) < 0.01


def test_r2r_monotonicity():
    dac = R2RDAC(num_bits=8, vref=1.0)
    prev = -1.0
    for code in range(256):
        result = dac.simulate(code)
        assert result['output_voltage'] >= prev
        prev = result['output_voltage']


def test_r2r_bit_contributions():
    dac = R2RDAC(num_bits=4, vref=1.0)
    result = dac.simulate(10)  # 1010
    assert 'contributions' in result or 'bits' in result


def test_r2r_binary_code():
    dac = R2RDAC(num_bits=4, vref=1.0)
    result = dac.simulate(5)
    assert 'binary_code' in result
    assert result['binary_code'] == '0101'


def test_r2r_transfer_characteristic():
    dac = R2RDAC(num_bits=4, vref=1.0)
    tc = dac.get_transfer_characteristic()
    assert 'codes' in tc
    assert 'voltages' in tc
    assert len(tc['codes']) == 16
    assert len(tc['voltages']) == 16


def test_r2r_mismatch():
    dac = R2RDAC(num_bits=4, vref=1.0, mismatch=0.01)
    result = dac.simulate(8)
    # With mismatch, output should differ slightly from ideal
    assert 'output_voltage' in result
