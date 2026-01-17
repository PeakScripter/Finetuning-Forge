import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Estimated VRAM requirements (in MB) for different model sizes and quantizations
const MODEL_VRAM_ESTIMATES: Record<string, Record<string, number>> = {
    // Format: model_size: { quantization: vram_mb }
    "7b": { "4bit": 5500, "8bit": 9500, "none": 16000 },
    "8b": { "4bit": 6000, "8bit": 10500, "none": 18000 },
    "13b": { "4bit": 9000, "8bit": 16000, "none": 28000 },
    "70b": { "4bit": 42000, "8bit": 80000, "none": 140000 },
    "default": { "4bit": 6000, "8bit": 10000, "none": 16000 },
};

// Parse model size from model name
function parseModelSize(modelName: string): string {
    const match = modelName.toLowerCase().match(/(\d+)b/);
    if (match) {
        return match[1] + "b";
    }
    return "default";
}

// Calculate estimated VRAM requirement
function estimateVramRequirement(modelName: string, quantization: string): number {
    const modelSize = parseModelSize(modelName);
    const estimates = MODEL_VRAM_ESTIMATES[modelSize] || MODEL_VRAM_ESTIMATES["default"];
    const quant = quantization === "none" ? "none" : quantization;
    return estimates[quant] || estimates["4bit"];
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { model, quantization } = body;

        if (!model || !quantization) {
            return NextResponse.json(
                { error: "Missing model or quantization parameter" },
                { status: 400 }
            );
        }

        // Get current GPU VRAM
        let availableVram = 0;
        let totalVram = 0;
        let gpuName = "Unknown";

        try {
            const { stdout } = await execAsync(
                'nvidia-smi --query-gpu=name,memory.total,memory.free --format=csv,noheader,nounits'
            );

            const [name, memTotal, memFree] = stdout.trim().split(',').map(s => s.trim());
            gpuName = name || "Unknown GPU";
            totalVram = parseInt(memTotal, 10) || 0;
            availableVram = parseInt(memFree, 10) || 0;
        } catch {
            // No GPU available
            return NextResponse.json({
                canFit: false,
                reason: "No NVIDIA GPU detected",
                estimatedVram: estimateVramRequirement(model, quantization),
                availableVram: 0,
                totalVram: 0,
                gpuName: "CPU Only",
            });
        }

        const estimatedVram = estimateVramRequirement(model, quantization);
        const canFit = availableVram >= estimatedVram;
        const headroom = availableVram - estimatedVram;

        let status: "safe" | "tight" | "overflow";
        let reason: string;

        if (headroom >= 2000) {
            status = "safe";
            reason = `Estimated ${(estimatedVram / 1024).toFixed(1)}GB required. ${(headroom / 1024).toFixed(1)}GB headroom available.`;
        } else if (headroom >= 0) {
            status = "tight";
            reason = `Estimated ${(estimatedVram / 1024).toFixed(1)}GB required. Only ${(headroom / 1024).toFixed(1)}GB headroom - training may be unstable.`;
        } else {
            status = "overflow";
            reason = `Estimated ${(estimatedVram / 1024).toFixed(1)}GB required but only ${(availableVram / 1024).toFixed(1)}GB available. Consider using 4-bit quantization.`;
        }

        return NextResponse.json({
            canFit,
            status,
            reason,
            estimatedVram,
            estimatedVramGB: (estimatedVram / 1024).toFixed(1),
            availableVram,
            availableVramGB: (availableVram / 1024).toFixed(1),
            totalVram,
            totalVramGB: (totalVram / 1024).toFixed(1),
            headroom,
            headroomGB: (headroom / 1024).toFixed(1),
            gpuName,
            model,
            quantization,
        });
    } catch (error) {
        console.error("VRAM check error:", error);
        return NextResponse.json(
            { error: "Failed to perform VRAM check" },
            { status: 500 }
        );
    }
}
