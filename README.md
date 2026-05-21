# ADC/DAC Educational Simulator

An interactive educational tool for learning how analog-to-digital and digital-to-analog converters work. Includes step-by-step explanations, animated circuit diagrams, and CS analogy visualizations.

## Converters

- **Flash ADC** — parallel comparator architecture (+ Lookup Table analogy)
- **SAR ADC** — successive approximation register (+ Binary Search Tree analogy)
- **Sigma-Delta ADC** — oversampling modulator with decimation (+ RNN analogy)
- **Pipeline ADC** — multi-stage residue amplification
- **R-2R Ladder DAC** — resistor network
- **Current-Steering DAC** — binary-weighted and thermometer-coded modes

## Requirements

- Python 3.8+
- pip packages: `numpy`, `scipy`, `flask`

Install dependencies:

```bash
pip install -r requirements.txt
```

## Starting the Server

```bash
python server.py
```

The server starts on **http://localhost:8000**. Open that URL in your browser.

## Usage

1. **Select a converter** from the dropdown in the sidebar.
2. **Adjust parameters** — bits, Vref, sample rate, etc.
3. **Click "Run Simulation"** to run a full batch simulation and see all graphs populate.
4. **Step mode** — click "Step" to advance one clock cycle at a time and watch the circuit animate.
5. **Playback** — click "Play" to auto-advance steps at the configured speed.
6. **Theme** — click 🌙 in the header to toggle light/dark mode.

### ADC Mode

- Configure the input signal (waveform, amplitude, frequency).
- Graphs show: Input Signal, Digital Codeword Output, Reconstructed Output.
- Use the Time ⇄ FFT toggle on each graph to switch views.
- The codeword table below shows every converted sample.

### DAC Mode

- Configure the input code sequence (sine-derived, ramp, manual codes, step).
- Graphs show: Input Codes, Analog Output, Transfer Characteristic.
- The transfer characteristic shows ideal vs actual output with INL/DNL.

### Export

- **CSV** — exports simulation data as a CSV file.
- **PNG** — exports the output graph as an image.

## Running Tests

```bash
pip install pytest pytest-playwright
playwright install
pytest tests/
```

Add `--headed` to see the browser during tests.
