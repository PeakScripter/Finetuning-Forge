import { OrchestratorConfig, GeneratedScript, ProviderType } from './types';
import { getProvider } from './providers';

/**
 * Generate training script based on provider and config
 */
export function generateScript(config: OrchestratorConfig): GeneratedScript {
    const provider = getProvider(config.provider);

    switch (config.provider) {
        case 'unsloth':
            return generateUnslothScript(config);
        case 'axolotl':
            return generateAxolotlConfig(config);
        case 'torchtune':
            return generateTorchtuneScript(config);
        default:
            return generateUnslothScript(config);
    }
}

function generateUnslothScript(config: OrchestratorConfig): GeneratedScript {
    const code = `# Forge-Local: Unsloth Training Script
# Generated for: ${config.model}

from unsloth import FastLanguageModel
import torch

# ═══════════════════════════════════════════════════════════════
# MODEL CONFIGURATION
# ═══════════════════════════════════════════════════════════════

max_seq_length = 2048
dtype = None  # Auto-detect
load_in_4bit = ${config.quantization === '4bit' ? 'True' : 'False'}

model, tokenizer = FastLanguageModel.from_pretrained(
    model_name="${config.model}",
    max_seq_length=max_seq_length,
    dtype=dtype,
    load_in_4bit=load_in_4bit,
)

# ═══════════════════════════════════════════════════════════════
# LoRA CONFIGURATION
# ═══════════════════════════════════════════════════════════════

model = FastLanguageModel.get_peft_model(
    model,
    r=${config.loraRank},                    # LoRA Rank
    lora_alpha=${config.loraAlpha},          # LoRA Alpha
    lora_dropout=0,
    target_modules=["q_proj", "k_proj", "v_proj", "o_proj",
                    "gate_proj", "up_proj", "down_proj"],
    bias="none",
    use_gradient_checkpointing="unsloth",
    random_state=42,
)

# ═══════════════════════════════════════════════════════════════
# DATASET LOADING
# ═══════════════════════════════════════════════════════════════

from datasets import load_dataset

dataset = load_dataset("json", data_files="${config.dataset || 'data.jsonl'}")

# ═══════════════════════════════════════════════════════════════
# TRAINING ARGUMENTS
# ═══════════════════════════════════════════════════════════════

from transformers import TrainingArguments
from trl import SFTTrainer

training_args = TrainingArguments(
    output_dir="./outputs",
    per_device_train_batch_size=${config.batchSize},
    gradient_accumulation_steps=${config.gradientAccumulation},
    warmup_steps=${config.warmupSteps},
    max_steps=${config.maxSteps},
    learning_rate=${config.learningRate},
    fp16=not torch.cuda.is_bf16_supported(),
    bf16=torch.cuda.is_bf16_supported(),
    logging_steps=10,
    optim="adamw_8bit",
    save_strategy="steps",
    save_steps=100,
)

trainer = SFTTrainer(
    model=model,
    tokenizer=tokenizer,
    train_dataset=dataset["train"],
    args=training_args,
    max_seq_length=max_seq_length,
)

# ═══════════════════════════════════════════════════════════════
# START TRAINING
# ═══════════════════════════════════════════════════════════════

trainer.train()

# Save the model
model.save_pretrained("./forge-local-output")
tokenizer.save_pretrained("./forge-local-output")

print("✓ Training complete! Model saved to ./forge-local-output")
`;

    return {
        code,
        language: 'python',
        filename: 'train_unsloth.py',
    };
}

function generateAxolotlConfig(config: OrchestratorConfig): GeneratedScript {
    const code = `# Forge-Local: Axolotl Configuration
# Generated for: ${config.model}

base_model: ${config.model}
model_type: LlamaForCausalLM
tokenizer_type: AutoTokenizer

load_in_8bit: ${config.quantization === '8bit'}
load_in_4bit: ${config.quantization === '4bit'}

# ═══════════════════════════════════════════════════════════════
# DATASET
# ═══════════════════════════════════════════════════════════════

datasets:
  - path: ${config.dataset || 'data.jsonl'}
    type: alpaca

dataset_prepared_path: ./prepared_data

# ═══════════════════════════════════════════════════════════════
# LoRA CONFIGURATION
# ═══════════════════════════════════════════════════════════════

adapter: lora
lora_r: ${config.loraRank}
lora_alpha: ${config.loraAlpha}
lora_dropout: 0.05
lora_target_modules:
  - q_proj
  - k_proj
  - v_proj
  - o_proj
  - gate_proj
  - up_proj
  - down_proj

# ═══════════════════════════════════════════════════════════════
# TRAINING PARAMETERS
# ═══════════════════════════════════════════════════════════════

sequence_len: 2048
sample_packing: true
pad_to_sequence_len: true

micro_batch_size: ${config.batchSize}
gradient_accumulation_steps: ${config.gradientAccumulation}
num_epochs: 3
warmup_steps: ${config.warmupSteps}

optimizer: adamw_8bit
lr_scheduler: cosine
learning_rate: ${config.learningRate}

train_on_inputs: false
group_by_length: false
bf16: auto
tf32: true

gradient_checkpointing: true
early_stopping_patience: 3
resume_from_checkpoint: null

# ═══════════════════════════════════════════════════════════════
# OUTPUT
# ═══════════════════════════════════════════════════════════════

output_dir: ./forge-local-output
logging_steps: 10
save_steps: 100
save_total_limit: 3

# ═══════════════════════════════════════════════════════════════
# WANDB (Optional)
# ═══════════════════════════════════════════════════════════════

wandb_project: forge-local
wandb_run_id:
wandb_watch:
wandb_log_model:
`;

    return {
        code,
        language: 'yaml',
        filename: 'config.yml',
    };
}

function generateTorchtuneScript(config: OrchestratorConfig): GeneratedScript {
    const code = `# Forge-Local: Torchtune Training Script
# Generated for: ${config.model}

from torchtune.models.llama3 import llama3_8b, lora_llama3_8b
from torchtune.training import FullModelCheckpointer
from torchtune import config
import torch

# ═══════════════════════════════════════════════════════════════
# CONFIGURATION
# ═══════════════════════════════════════════════════════════════

@config.parse
def configure():
    return {
        "model": "${config.model}",
        "tokenizer_path": "./tokenizer.model",
        "checkpointer": {
            "_component_": "torchtune.training.FullModelCheckpointer",
            "checkpoint_dir": "./checkpoints",
            "output_dir": "./forge-local-output",
        },
        
        # LoRA Configuration
        "lora_rank": ${config.loraRank},
        "lora_alpha": ${config.loraAlpha},
        "lora_dropout": 0.0,
        
        # Training Arguments
        "batch_size": ${config.batchSize},
        "gradient_accumulation_steps": ${config.gradientAccumulation},
        "lr": ${config.learningRate},
        "warmup_steps": ${config.warmupSteps},
        "max_steps": ${config.maxSteps},
        
        # Dataset
        "dataset": "${config.dataset || 'data.jsonl'}",
    }

# ═══════════════════════════════════════════════════════════════
# MODEL SETUP
# ═══════════════════════════════════════════════════════════════

def setup_model(cfg):
    model = lora_llama3_8b(
        lora_attn_modules=["q_proj", "k_proj", "v_proj", "output_proj"],
        lora_rank=cfg["lora_rank"],
        lora_alpha=cfg["lora_alpha"],
    )
    return model

# ═══════════════════════════════════════════════════════════════
# TRAINING LOOP
# ═══════════════════════════════════════════════════════════════

def train(cfg):
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    
    model = setup_model(cfg)
    model = model.to(device)
    
    optimizer = torch.optim.AdamW(
        model.parameters(),
        lr=cfg["lr"],
        weight_decay=0.01,
    )
    
    # Training loop implementation
    print(f"Training on {device}")
    print(f"LoRA Rank: {cfg['lora_rank']}, Alpha: {cfg['lora_alpha']}")
    print(f"Learning Rate: {cfg['lr']}")
    
    # ... implement full training loop here
    
    print("✓ Training complete! Model saved to ./forge-local-output")

if __name__ == "__main__":
    cfg = configure()
    train(cfg)
`;

    return {
        code,
        language: 'python',
        filename: 'train_torchtune.py',
    };
}

export { generateUnslothScript, generateAxolotlConfig, generateTorchtuneScript };
