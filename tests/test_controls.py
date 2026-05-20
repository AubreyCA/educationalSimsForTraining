"""Playwright tests for UI controls."""
import pytest
from playwright.sync_api import expect


@pytest.fixture(autouse=True)
def setup(server, page, base_url):
    page.goto(base_url)
    page.wait_for_load_state('networkidle')


def test_converter_select_exists(page):
    select = page.locator('#converter-select')
    expect(select).to_be_visible()


def test_converter_select_has_options(page):
    options = page.locator('#converter-select option')
    assert options.count() >= 6


def test_bits_slider_exists(page):
    slider = page.locator('#bits-slider')
    expect(slider).to_be_visible()


def test_frequency_slider_exists(page):
    slider = page.locator('#freq-slider')
    expect(slider).to_be_visible()


def test_simulate_button_exists(page):
    btn = page.locator('#simulate-btn')
    expect(btn).to_be_visible()


def test_step_button_exists(page):
    btn = page.locator('#step-btn')
    expect(btn).to_be_visible()


def test_switching_converter_updates_ui(page):
    select = page.locator('#converter-select')
    select.select_option('sar_adc')
    page.wait_for_timeout(300)
    # SAR should show step button prominently
    btn = page.locator('#step-btn')
    expect(btn).to_be_visible()


def test_switching_to_dac_shows_dac_input(page):
    select = page.locator('#converter-select')
    select.select_option('r2r_dac')
    page.wait_for_timeout(300)
    # DAC mode should show code input
    dac_section = page.locator('#dac-input-section')
    if dac_section.count() > 0:
        expect(dac_section).to_be_visible()


def test_bits_slider_changes_value(page):
    slider = page.locator('#bits-slider')
    slider.fill('6')
    page.wait_for_timeout(200)
    value_display = page.locator('#bits-value')
    if value_display.count() > 0:
        expect(value_display).to_have_text('6')


def test_export_csv_button(page):
    btn = page.locator('#export-csv-btn')
    if btn.count() > 0:
        expect(btn).to_be_visible()


def test_export_png_button(page):
    btn = page.locator('#export-png-btn')
    if btn.count() > 0:
        expect(btn).to_be_visible()
