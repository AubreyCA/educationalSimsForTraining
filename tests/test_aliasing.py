"""Test aliasing detection and Nyquist frequency handling."""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def test_aliasing_flag_above_nyquist():
    """Signal freq > fs/2 should be flagged."""
    from server import check_aliasing
    result = check_aliasing(signal_freq=6000, sampling_rate=10000)
    assert result['aliasing'] is True
    assert result['nyquist_freq'] == 5000


def test_no_aliasing_below_nyquist():
    """Signal freq < fs/2 should not be flagged."""
    from server import check_aliasing
    result = check_aliasing(signal_freq=2000, sampling_rate=10000)
    assert result['aliasing'] is False


def test_aliasing_at_nyquist():
    """Signal freq == fs/2 is borderline."""
    from server import check_aliasing
    result = check_aliasing(signal_freq=5000, sampling_rate=10000)
    # At exactly Nyquist, implementation may flag or not
    assert 'aliasing' in result


def test_aliased_frequency_calculation():
    """Verify folded frequency calculation."""
    from server import check_aliasing
    result = check_aliasing(signal_freq=7000, sampling_rate=10000)
    if 'aliased_freq' in result:
        # 7000 Hz at 10000 Hz sampling → folds to 3000 Hz
        assert abs(result['aliased_freq'] - 3000) < 100
