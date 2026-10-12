from fastapi.testclient import TestClient


def test_health_endpoint(client: TestClient) -> None:
    """Verify /healthz returns 200 OK and valid JSON matching HealthResponse."""
    response = client.get("/healthz")
    assert response.status_code == 200

    data = response.json()
    assert data["status"] == "ok"
    assert data["service"] == "tradelens-analytics"
    assert data["version"] == "0.1.0"
