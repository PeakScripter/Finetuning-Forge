import { ProviderCapabilities, ProviderType } from './types';

export const PROVIDERS: Record<ProviderType, ProviderCapabilities> = {
    unsloth: {
        id: 'unsloth',
        name: 'Unsloth',
        description: 'Optimized for speed and VRAM efficiency on single GPUs. Up to 2x faster training.',

        loraRankRange: [4, 128],
        loraRankDefault: 16,
        alphaRange: [8, 256],
        alphaDefault: 32,
        learningRateRange: [1e-6, 1e-3],
        learningRateDefault: 2e-4,

        quantizationOptions: ['4bit', '8bit', 'none'],
        defaultQuantization: '4bit',

        supportsMultiGPU: false,
        configFormat: 'python',

        tagline: 'Speed Optimized',
        accentColor: '#FF6B00',
    },

    axolotl: {
        id: 'axolotl',
        name: 'Axolotl',
        description: 'YAML-based configuration for complex multi-GPU setups and advanced training scenarios.',

        loraRankRange: [4, 256],
        loraRankDefault: 32,
        alphaRange: [16, 512],
        alphaDefault: 64,
        learningRateRange: [1e-6, 5e-4],
        learningRateDefault: 1e-4,

        quantizationOptions: ['4bit', '8bit', 'none'],
        defaultQuantization: '4bit',

        supportsMultiGPU: true,
        configFormat: 'yaml',

        tagline: 'Multi-GPU Ready',
        accentColor: '#A855F7',
    },

    torchtune: {
        id: 'torchtune',
        name: 'Torchtune',
        description: 'Native PyTorch-centric workflows with full control over training loop.',

        loraRankRange: [4, 64],
        loraRankDefault: 8,
        alphaRange: [8, 128],
        alphaDefault: 16,
        learningRateRange: [1e-6, 2e-4],
        learningRateDefault: 5e-5,

        quantizationOptions: ['none', '4bit'],
        defaultQuantization: 'none',

        supportsMultiGPU: true,
        configFormat: 'python',

        tagline: 'PyTorch Native',
        accentColor: '#EE4C2C',
    },
};

export function getProvider(id: ProviderType): ProviderCapabilities {
    return PROVIDERS[id];
}

export function getAllProviders(): ProviderCapabilities[] {
    return Object.values(PROVIDERS);
}

export function clampToRange(value: number, range: [number, number]): number {
    return Math.min(Math.max(value, range[0]), range[1]);
}
