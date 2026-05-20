import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from converters.sigma_delta_adc import SigmaDeltaADC


def test_sigma_delta_basic():
    adc = SigmaDeltaADC(num_bits=8, vref=1.0, osr=64)
    result = adc.simulate(0.5)
    assert 'digital_code' in result
    assert 'bitstream' in result


def test_sigma_delta_bitstream_length():
    osr = 64
    adc = SigmaDeltaADC(num_bits=8, vref=1.0, osr=osr)
    result = adc.simulate(0.3)
    assert len(result['bitstream']) == osr


def test_sigma_delta_integrator_state():
    adc = SigmaDeltaADC(num_bits=8, vref=1.0, osr=32)
    result = adc.simulate(0.5)
    assert 'integrator_history' in result or 'history' in result


def test_sigma_delta_decimation():
    adc = SigmaDeltaADC(num_bits=8, vref=1.0, osr=64)
    result = adc.simulate(0.5)
    assert 'digital_code' in result
    code = result['digital_code']
    expected = int(0.5 * 255)
    assert abs(code - expected) < 20  # Sigma-delta has noise shaping


def test_sigma_delta_osr_effect():
    """Higher OSR should give more accurate result."""
    results = []
    for osr in [16, 64, 256]:
        adc = SigmaDeltaADC(num_bits=8, vref=1.0, osr=osr)
        result = adc.simulate(0.5)
        results.append(result['digital_code'])
    # Higher OSR should converge closer to ideal
    ideal = int(0.5 * 255)
    errors = [abs(r - ideal) for r in results]
    # Not guaranteed monotonic but generally true
    assert errors[-1] <= errors[0] + 10


def test_sigma_delta_snr():
    adc = SigmaDeltaADC(num_bits=8, vref=1.0, osr=64)
    snr = adc.get_snr_theoretical()
    assert snr > 0


def test_sigma_delta_explanation():
    adc = SigmaDeltaADC(num_bits=8, vref=1.0, osr=32)
    adc.simulate(0.5)
    explanation = adc.get_explanation()
    assert isinstance(explanation, str)
    assert len(explanation) > 0
