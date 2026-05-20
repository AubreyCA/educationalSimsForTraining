import pytest
import requests


def test_simulate_flash(server, base_url):
    resp = requests.post(f"{base_url}/api/simulate", json={
        "converter": "flash_adc",
        "params": {"num_bits": 3, "vref": 1.0},
        "signal": {"type": "sine", "frequency": 100, "amplitude": 0.5, "offset": 0.5},
        "sampling_rate": 10000,
        "num_samples": 100
    })
    assert resp.status_code == 200
    data = resp.json()
    assert 'results' in data
    assert len(data['results']) == 100


def test_simulate_sar(server, base_url):
    resp = requests.post(f"{base_url}/api/simulate", json={
        "converter": "sar_adc",
        "params": {"num_bits": 8, "vref": 1.0},
        "signal": {"type": "dc", "amplitude": 0.5},
        "sampling_rate": 10000,
        "num_samples": 10
    })
    assert resp.status_code == 200
    data = resp.json()
    assert 'results' in data


def test_simulate_sigma_delta(server, base_url):
    resp = requests.post(f"{base_url}/api/simulate", json={
        "converter": "sigma_delta_adc",
        "params": {"num_bits": 8, "vref": 1.0, "osr": 32},
        "signal": {"type": "dc", "amplitude": 0.5},
        "sampling_rate": 10000,
        "num_samples": 5
    })
    assert resp.status_code == 200


def test_simulate_pipeline(server, base_url):
    resp = requests.post(f"{base_url}/api/simulate", json={
        "converter": "pipeline_adc",
        "params": {"num_bits": 8, "vref": 1.0, "num_stages": 4, "bits_per_stage": 2},
        "signal": {"type": "dc", "amplitude": 0.5},
        "sampling_rate": 10000,
        "num_samples": 5
    })
    assert resp.status_code == 200


def test_simulate_r2r(server, base_url):
    resp = requests.post(f"{base_url}/api/simulate", json={
        "converter": "r2r_dac",
        "params": {"num_bits": 4, "vref": 1.0},
        "signal": {"type": "ramp"},
        "num_samples": 16
    })
    assert resp.status_code == 200


def test_simulate_current_dac(server, base_url):
    resp = requests.post(f"{base_url}/api/simulate", json={
        "converter": "current_dac",
        "params": {"num_bits": 4, "vref": 1.0, "mode": "binary"},
        "signal": {"type": "ramp"},
        "num_samples": 16
    })
    assert resp.status_code == 200


def test_step_endpoint(server, base_url):
    resp = requests.post(f"{base_url}/api/step", json={
        "converter": "sar_adc",
        "params": {"num_bits": 4, "vref": 1.0},
        "input_voltage": 0.6
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data is not None


def test_reset_endpoint(server, base_url):
    resp = requests.post(f"{base_url}/api/reset", json={
        "converter": "sar_adc"
    })
    assert resp.status_code == 200


def test_fft_endpoint(server, base_url):
    resp = requests.post(f"{base_url}/api/fft", json={
        "signal": [0.1, 0.5, 0.9, 0.5, 0.1, -0.3, -0.7, -0.3],
        "sampling_rate": 1000
    })
    assert resp.status_code == 200
    data = resp.json()
    assert 'frequencies' in data
    assert 'magnitudes' in data


def test_interpolate_endpoint(server, base_url):
    resp = requests.post(f"{base_url}/api/interpolate", json={
        "samples": [0, 0.5, 1.0, 0.5, 0],
        "method": "linear",
        "factor": 4
    })
    assert resp.status_code == 200
    data = resp.json()
    assert 'interpolated' in data


def test_invalid_converter(server, base_url):
    resp = requests.post(f"{base_url}/api/simulate", json={
        "converter": "nonexistent",
        "params": {},
        "signal": {"type": "dc", "amplitude": 0.5},
        "num_samples": 1
    })
    assert resp.status_code == 400


def test_aliasing_detection(server, base_url):
    # Signal freq > fs/2 should trigger aliasing
    resp = requests.post(f"{base_url}/api/simulate", json={
        "converter": "flash_adc",
        "params": {"num_bits": 3, "vref": 1.0},
        "signal": {"type": "sine", "frequency": 6000, "amplitude": 0.5, "offset": 0.5},
        "sampling_rate": 10000,
        "num_samples": 100
    })
    assert resp.status_code == 200
    data = resp.json()
    assert 'aliasing_warning' in data or 'aliasing' in data
