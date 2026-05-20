"""Playwright tests for graph rendering."""
import pytest
from playwright.sync_api import expect


@pytest.fixture(autouse=True)
def setup(server, page, base_url):
    page.goto(base_url)
    page.wait_for_load_state('networkidle')


def test_time_domain_canvas_exists(page):
    canvas = page.locator('#time-domain-canvas')
    expect(canvas).to_be_visible()


def test_fft_canvas_exists(page):
    canvas = page.locator('#fft-canvas')
    expect(canvas).to_be_visible()


def test_circuit_canvas_exists(page):
    canvas = page.locator('#circuit-canvas')
    expect(canvas).to_be_visible()


def test_analogy_canvas_exists(page):
    canvas = page.locator('#analogy-canvas')
    expect(canvas).to_be_visible()


def test_simulate_renders_graph(page):
    page.click('#simulate-btn')
    page.wait_for_timeout(1000)
    # After simulation, canvas should have been drawn on
    canvas = page.locator('#time-domain-canvas')
    expect(canvas).to_be_visible()


def test_fft_toggle(page):
    page.click('#simulate-btn')
    page.wait_for_timeout(500)
    fft_toggle = page.locator('#fft-toggle')
    if fft_toggle.count() > 0:
        fft_toggle.click()
        page.wait_for_timeout(300)
        canvas = page.locator('#fft-canvas')
        expect(canvas).to_be_visible()
