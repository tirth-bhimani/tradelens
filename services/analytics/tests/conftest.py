from typing import Generator
import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture
def client() -> Generator[TestClient, None, None]:
    """Test client fixture for API endpoint verification."""
    with TestClient(app) as test_client:
        yield test_client
