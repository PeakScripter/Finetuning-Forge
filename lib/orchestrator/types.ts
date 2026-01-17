// Orchestrator Types for Multi-Engine Support

export type ProviderType = 'unsloth' | 'axolotl' | 'torchtune';
export type QuantizationType = 'none' | '4bit' | '8bit';
export type ConfigFormat = 'python' | 'yaml';

export interface ProviderCapabilities {
    id: ProviderType;
    name: string;
    description: string;

    // Parameter ranges
    loraRankRange: [number, number];
    loraRankDefault: number;
    alphaRange: [number, number];
    alphaDefault: number;
    learningRateRange: [number, number];
    learningRateDefault: number;

    // Quantization options
    quantizationOptions: QuantizationType[];
    defaultQuantization: QuantizationType;

    // Features
    supportsMultiGPU: boolean;
    configFormat: ConfigFormat;

    // UI hints
    tagline: string;
    accentColor: string;
}

export interface OrchestratorConfig {
    provider: ProviderType;
    model: string;
    dataset: string | null;
    gpuId: string;

    // Training parameters
    quantization: QuantizationType;
    loraRank: number;
    loraAlpha: number;
    learningRate: number;

    // Advanced
    batchSize: number;
    gradientAccumulation: number;
    warmupSteps: number;
    maxSteps: number;
}

export interface GeneratedScript {
    code: string;
    language: 'python' | 'yaml';
    filename: string;
}
