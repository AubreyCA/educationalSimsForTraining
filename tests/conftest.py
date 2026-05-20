import pytest
import subprocess
import time
import sys
import os

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


@pytest.fixture(scope="session")
def server():
    """Start the Flask server for testing."""
    proc = subprocess.Popen(
        [sys.executable, "server.py"],
        cwd=os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    time.sleep(2)  # Wait for server to start
    yield proc
    proc.terminate()
    proc.wait()


@pytest.fixture(scope="session")
def base_url():
    return "http://localhost:8000"


@pytest.fixture(scope="session")
def browser_context_args(browser_context_args):
    return {**browser_context_args, "viewport": {"width": 1400, "height": 900}}
