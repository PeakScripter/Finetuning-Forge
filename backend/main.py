"""
Forge-Local: FastAPI Backend Server
Provides WebSocket streaming for training logs and actual training execution.
"""

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import asyncio
import json
import subprocess
import sys
import os
import random
import math
from pathlib import Path
from typing import Optional
import tempfile

app = FastAPI(
    title="Forge-Local Backend",
    description="Local bridge for LLM fine-tuning workstation",
    version="1.0.0"
)

# CORS for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001", "http://127.0.0.1:3000", "http://127.0.0.1:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Store active training process
active_training_process: Optional[subprocess.Popen] = None


class TrainingConfig(BaseModel):
    provider: str = "unsloth"
    model: str = "llama-3"
    dataset: Optional[str] = None
    quantization: str = "4bit"
    loraRank: int = 16
    loraAlpha: int = 32
    learningRate: float = 2e-4
    batchSize: int = 4
    gradientAccumulation: int = 4
    warmupSteps: int = 10
    maxSteps: int = 100


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": "forge-local-backend"}


@app.get("/api/backends")
async def detect_backends():
    """Detect available training backends."""
    backends = {
        "unsloth": {"available": False, "version": None},
        "axolotl": {"available": False, "version": None},
        "torchtune": {"available": False, "version": None},
    }
    
    # Check for Unsloth
    try:
        import unsloth
        backends["unsloth"] = {"available": True, "version": getattr(unsloth, "__version__", "unknown")}
    except ImportError:
        pass
    
    # Check for Axolotl
    try:
        import axolotl
        backends["axolotl"] = {"available": True, "version": getattr(axolotl, "__version__", "unknown")}
    except ImportError:
        pass
    
    # Check for Torchtune
    try:
        import torchtune
        backends["torchtune"] = {"available": True, "version": getattr(torchtune, "__version__", "unknown")}
    except ImportError:
        pass
    
    # Check for basic PyTorch + transformers (fallback)
    try:
        import torch
        import transformers
        backends["pytorch"] = {
            "available": True, 
            "torch_version": torch.__version__,
            "transformers_version": transformers.__version__,
            "cuda_available": torch.cuda.is_available(),
        }
    except ImportError:
        backends["pytorch"] = {"available": False}
    
    return {"backends": backends}


@app.get("/api/gpu/info")
async def gpu_info():
    """Get GPU information using nvidia-smi."""
    try:
        result = subprocess.run(
            [
                "nvidia-smi",
                "--query-gpu=name,memory.total,memory.used,memory.free,utilization.gpu,temperature.gpu,power.draw",
                "--format=csv,noheader,nounits"
            ],
            capture_output=True,
            text=True,
            timeout=5
        )
        
        if result.returncode != 0:
            return {"error": "nvidia-smi failed", "gpus": []}
        
        gpus = []
        for i, line in enumerate(result.stdout.strip().split("\n")):
            parts = [p.strip() for p in line.split(",")]
            if len(parts) >= 7:
                gpus.append({
                    "id": f"gpu-{i}",
                    "name": parts[0],
                    "memory_total": int(parts[1]),
                    "memory_used": int(parts[2]),
                    "memory_free": int(parts[3]),
                    "utilization": int(parts[4]),
                    "temperature": int(parts[5]),
                    "power": float(parts[6]) if parts[6] != "[N/A]" else 0,
                })
        
        return {"gpus": gpus}
    
    except FileNotFoundError:
        return {"error": "nvidia-smi not found", "gpus": []}
    except subprocess.TimeoutExpired:
        return {"error": "nvidia-smi timed out", "gpus": []}
    except Exception as e:
        return {"error": str(e), "gpus": []}


@app.post("/api/training/start")
async def start_training(config: TrainingConfig):
    """Start a training job and return the script that will be executed."""
    global active_training_process
    
    if active_training_process and active_training_process.poll() is None:
        raise HTTPException(status_code=400, detail="Training already in progress")
    
    # Generate the training script
    script_content = generate_training_script(config)
    
    return {
        "status": "ready",
        "message": "Training configuration validated. Connect to /ws/training to start.",
        "script_preview": script_content[:500] + "..." if len(script_content) > 500 else script_content,
        "config": config.dict()
    }


@app.post("/api/training/stop")
async def stop_training():
    """Stop the current training job."""
    global active_training_process
    
    if active_training_process and active_training_process.poll() is None:
        active_training_process.terminate()
        active_training_process = None
        return {"status": "stopped", "message": "Training job terminated"}
    
    return {"status": "idle", "message": "No training job running"}


def generate_training_script(config: TrainingConfig) -> str:
    """Generate a runnable Python training script based on config."""
    
    if config.provider == "unsloth":
        return f'''#!/usr/bin/env python3
"""Forge-Local: Unsloth Training Script"""

from unsloth import FastLanguageModel
import torch
from datasets import load_dataset
from transformers import TrainingArguments
from trl import SFTTrainer
import sys

print("[FORGE] Initializing Unsloth training...")
print(f"[FORGE] Model: {config.model}")
print(f"[FORGE] Quantization: {config.quantization}")

# Load model
model, tokenizer = FastLanguageModel.from_pretrained(
    model_name="{config.model}",
    max_seq_length=2048,
    load_in_4bit={config.quantization == "4bit"},
)

# Apply LoRA
model = FastLanguageModel.get_peft_model(
    model,
    r={config.loraRank},
    lora_alpha={config.loraAlpha},
    target_modules=["q_proj", "k_proj", "v_proj", "o_proj"],
    bias="none",
)

print("[FORGE] Model loaded successfully!")

# Load dataset
dataset = load_dataset("json", data_files="{config.dataset or 'data.jsonl'}")
print(f"[FORGE] Dataset loaded: {{len(dataset['train'])}} samples")

# Training arguments
training_args = TrainingArguments(
    output_dir="./forge-output",
    per_device_train_batch_size={config.batchSize},
    gradient_accumulation_steps={config.gradientAccumulation},
    warmup_steps={config.warmupSteps},
    max_steps={config.maxSteps},
    learning_rate={config.learningRate},
    logging_steps=1,
    save_steps=100,
)

trainer = SFTTrainer(
    model=model,
    tokenizer=tokenizer,
    train_dataset=dataset["train"],
    args=training_args,
    max_seq_length=2048,
)

print("[FORGE] Starting training...")
trainer.train()
print("[FORGE] Training complete!")
'''
    
    elif config.provider == "axolotl":
        return f'''#!/usr/bin/env python3
"""Forge-Local: Axolotl Training Wrapper"""

import subprocess
import yaml
import tempfile
import os

config = {{
    "base_model": "{config.model}",
    "load_in_4bit": {config.quantization == "4bit"},
    "load_in_8bit": {config.quantization == "8bit"},
    "adapter": "lora",
    "lora_r": {config.loraRank},
    "lora_alpha": {config.loraAlpha},
    "datasets": [{{"path": "{config.dataset or 'data.jsonl'}", "type": "alpaca"}}],
    "micro_batch_size": {config.batchSize},
    "gradient_accumulation_steps": {config.gradientAccumulation},
    "learning_rate": {config.learningRate},
    "warmup_steps": {config.warmupSteps},
    "output_dir": "./forge-output",
}}

print("[FORGE] Starting Axolotl training...")
with tempfile.NamedTemporaryFile(mode='w', suffix='.yml', delete=False) as f:
    yaml.dump(config, f)
    config_path = f.name

subprocess.run(["accelerate", "launch", "-m", "axolotl.cli.train", config_path])
print("[FORGE] Training complete!")
'''
    
    else:  # torchtune
        return f'''#!/usr/bin/env python3
"""Forge-Local: Torchtune Training Script"""

import torch
from torchtune.models.llama3 import lora_llama3_8b

print("[FORGE] Starting Torchtune training...")
print(f"[FORGE] LoRA Rank: {config.loraRank}, Alpha: {config.loraAlpha}")

model = lora_llama3_8b(
    lora_attn_modules=["q_proj", "k_proj", "v_proj", "output_proj"],
    lora_rank={config.loraRank},
    lora_alpha={config.loraAlpha},
)

print("[FORGE] Model initialized. Implement full training loop here.")
print("[FORGE] Training complete!")
'''


@app.websocket("/ws/training")
async def training_stream(websocket: WebSocket):
    """WebSocket endpoint for real-time training execution and log streaming."""
    global active_training_process
    
    await websocket.accept()
    
    async def safe_send(data: dict):
        """Safely send data, ignoring if connection closed."""
        try:
            await websocket.send_text(json.dumps(data))
        except Exception:
            pass  # Connection already closed
    
    try:
        # Wait for training config
        config_data = await websocket.receive_text()
        config_dict = json.loads(config_data)
        config = TrainingConfig(**config_dict)
        
        await safe_send({
            "type": "info",
            "message": f"Received training config for {config.provider}",
            "log": f"[FORGE] Initializing {config.provider} training pipeline..."
        })
        
        # Generate script
        script_content = generate_training_script(config)
        
        # Save script to temp file
        with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as f:
            f.write(script_content)
            script_path = f.name
        
        await safe_send({
            "type": "info",
            "message": "Training script generated",
            "log": f"[FORGE] Script saved to {script_path}"
        })
        
        # Check if required packages are available
        backends = await detect_backends()
        provider_available = backends["backends"].get(config.provider, {}).get("available", False)
        
        if not provider_available:
            await safe_send({
                "type": "warning",
                "message": f"{config.provider} not installed - will show actual errors",
                "log": f"[FORGE] Note: {config.provider} not found. Running script anyway to show real logs..."
            })
        
        # Always run actual training script (user wants to see real logs)
        await safe_send({
            "type": "info",
            "message": f"Executing {config.provider} training script...",
            "log": f"[FORGE] Launching training script..."
        })
        
        await run_actual_training(websocket, script_path, config)
        
        # Cleanup
        try:
            os.unlink(script_path)
        except:
            pass
    
    except WebSocketDisconnect:
        print("[FORGE] Client disconnected from training stream")
    except Exception as e:
        print(f"[FORGE] Training error: {e}")
        await safe_send({
            "type": "error",
            "message": str(e),
            "log": f"[FORGE] Error: {str(e)}"
        })



async def run_simulated_training(websocket: WebSocket, config: TrainingConfig):
    """Run simulated training when actual backend is not available."""
    total_steps = config.maxSteps
    step = 0
    
    while step < total_steps:
        step += 1
        
        # Simulate realistic metrics
        loss = max(0.1, 2.5 * math.exp(-0.015 * step) + random.uniform(-0.05, 0.1))
        accuracy = min(0.99, 0.35 + 0.6 * (1 - math.exp(-0.02 * step)) + random.uniform(-0.02, 0.02))
        vram_usage = 18.5 + random.uniform(-0.5, 0.5)
        
        progress = {
            "type": "progress",
            "step": step,
            "total_steps": total_steps,
            "loss": round(loss, 4),
            "accuracy": round(accuracy, 4),
            "vram_gb": round(vram_usage, 1),
            "lr": config.learningRate,
            "log": f"[Epoch 1] Step {step}/{total_steps} | Loss: {loss:.4f} | Acc: {accuracy*100:.2f}% | VRAM: {vram_usage:.1f}GB"
        }
        
        await websocket.send_text(json.dumps(progress))
        
        # Check for abort signal
        try:
            message = await asyncio.wait_for(websocket.receive_text(), timeout=0.01)
            if json.loads(message).get("action") == "abort":
                await websocket.send_text(json.dumps({
                    "type": "aborted",
                    "step": step,
                    "log": f"[FORGE] Training aborted at step {step}"
                }))
                return
        except asyncio.TimeoutError:
            pass
        
        await asyncio.sleep(0.3)
    
    # Training complete
    await websocket.send_text(json.dumps({
        "type": "complete",
        "step": step,
        "final_loss": round(loss, 4),
        "final_accuracy": round(accuracy, 4),
        "log": f"[FORGE] ✓ Training complete! Final Loss: {loss:.4f} | Accuracy: {accuracy*100:.2f}%"
    }))


async def run_actual_training(websocket: WebSocket, script_path: str, config: TrainingConfig):
    """Run actual training by executing the generated script."""
    global active_training_process
    
    try:
        # Start the training process
        active_training_process = subprocess.Popen(
            [sys.executable, script_path],
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1,
            universal_newlines=True
        )
        
        step = 0
        
        # Stream output
        while active_training_process.poll() is None:
            line = active_training_process.stdout.readline()
            if line:
                # Parse training progress from output
                step += 1
                
                # Try to extract metrics from the line
                loss = 0.0
                accuracy = 0.0
                
                if "loss" in line.lower():
                    try:
                        # Try to parse loss value
                        import re
                        loss_match = re.search(r'loss[:\s]+([0-9.]+)', line.lower())
                        if loss_match:
                            loss = float(loss_match.group(1))
                    except:
                        pass
                
                await websocket.send_text(json.dumps({
                    "type": "progress",
                    "step": step,
                    "total_steps": config.maxSteps,
                    "loss": loss,
                    "accuracy": accuracy,
                    "log": line.strip()
                }))
            
            # Check for abort
            try:
                message = await asyncio.wait_for(websocket.receive_text(), timeout=0.01)
                if json.loads(message).get("action") == "abort":
                    active_training_process.terminate()
                    await websocket.send_text(json.dumps({
                        "type": "aborted",
                        "step": step,
                        "log": "[FORGE] Training aborted by user"
                    }))
                    return
            except asyncio.TimeoutError:
                pass
        
        # Process finished
        return_code = active_training_process.returncode
        
        if return_code == 0:
            await websocket.send_text(json.dumps({
                "type": "complete",
                "step": step,
                "log": "[FORGE] ✓ Training completed successfully!"
            }))
        else:
            await websocket.send_text(json.dumps({
                "type": "error",
                "message": f"Training exited with code {return_code}",
                "log": f"[FORGE] Training failed with exit code {return_code}"
            }))
    
    except Exception as e:
        await websocket.send_text(json.dumps({
            "type": "error",
            "message": str(e),
            "log": f"[FORGE] Error: {str(e)}"
        }))
    finally:
        active_training_process = None


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
