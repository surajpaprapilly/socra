from fastapi.testclient import TestClient
from main import app
from dependencies import get_current_user
import uuid

# Mock the current_user dependency to return a test user
test_user = {
    "id": str(uuid.uuid4()),
    "email": "test@example.com",
    "role": "authenticated",
}

app.dependency_overrides[get_current_user] = lambda: test_user

client = TestClient(app)
response = client.post("/api/session/start", json={"question": "Test question"})
print(f"Status Code: {response.status_code}")
print(f"Response: {response.text}")

