import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import numpy as np


def test_generate_sine():
    from server import generate_signal
    signal = generate_signal({'type': 'sine', 'frequency': 100, 'amplitude': 0.5, 'offset': 0.5}, 1000, 100)
    assert len(signal) == 100
    assert all(0 <= s <= 1.0 for s in signal)


def test_generate_sawtooth():
    from server import generate_signal
    signal = generate_signal({'type': 'sawtooth', 'frequency': 100, 'amplitude': 0.5, 'offset': 0.5}, 1000, 100)
    assert len(signal) == 100


def test_generate_pulse():
    from server import generate_signal
    signal = generate_signal({'type': 'pulse', 'frequency': 100, 'amplitude': 0.8, 'offset': 0.0}, 1000, 100)
    assert len(signal) == 100


def test_generate_dc():
    from server import generate_signal
    signal = generate_signal({'type': 'dc', 'amplitude': 0.7}, 1000, 50)
    assert len(signal) == 50
    assert all(abs(s - 0.7) < 0.001 for s in signal)


def test_signal_clipping():
    from server import generate_signal
    signal = generate_signal({'type': 'sine', 'frequency': 100, 'amplitude': 1.5, 'offset': 0.0}, 1000, 100)
    # Should handle out-of-range gracefully
    assert len(signal) == 100
