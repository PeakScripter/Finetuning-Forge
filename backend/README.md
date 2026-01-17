# Forge-Local Backend

Python FastAPI server providing WebSocket streaming and hardware detection.

## Quick Start

```bash
# Install dependencies
pip install -r requirements.txt

# Start server
uvicorn main:app --reload --port 8001
```

## Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/api/backends` | GET | Detect available training backends |
| `/api/gpu/info` | GET | GPU information via nvidia-smi |
| `/ws/training` | WS | Real-time training log streaming |

## WebSocket Protocol

Connect to `/ws/training` and send config:
```json
{"maxSteps": 100, "learningRate": 2e-4}
```

Receive progress updates:
```json
{"type": "progress", "step": 1, "loss": 2.5, "accuracy": 0.35, "log": "..."}
```

Send abort signal:
```json
{"action": "abort"}
```
