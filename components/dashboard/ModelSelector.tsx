"use client";

import React, { useState, useEffect } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { motion, AnimatePresence } from "framer-motion";
import { Cpu, Layers, ChevronDown, Zap, Server, Gauge, Rocket, FileCode } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFinetuner } from "@/context/FinetunerContext";
import { getAllProviders, getProvider } from "@/lib/orchestrator/providers";
import { ProviderType } from "@/lib/orchestrator/types";

const DEFAULT_MODELS = [
    { id: "llama-3", name: "Llama 3 (8B) - Default", type: "Base" },
];

interface GPU {
    id: string;
    name: string;
    vram: string;
}

export function ModelSelector() {
    const { config, setConfig, setProvider, getCurrentProvider } = useFinetuner();
    const [models, setModels] = useState<any[]>([]);
    const [gpus, setGpus] = useState<GPU[]>([]);
    const [loadingGpus, setLoadingGpus] = useState(true);
    const [isOpen, setIsOpen] = useState(false);

    const provider = getCurrentProvider();
    const allProviders = getAllProviders();

    useEffect(() => {
        const fetchModels = async () => {
            try {
                const res = await fetch('/api/local/models');
                const data = await res.json();
                if (data.models && data.models.length > 0) {
                    setModels(data.models);
                    if (!config.model || !data.models.some((m: any) => m.id === config.model)) {
                        setConfig("model", data.models[0].id);
                    }
                } else {
                    setModels(DEFAULT_MODELS);
                    if (!config.model || !DEFAULT_MODELS.some((m: any) => m.id === config.model)) {
                        setConfig("model", DEFAULT_MODELS[0].id);
                    }
                }
            } catch {
                setModels(DEFAULT_MODELS);
                if (!config.model || !DEFAULT_MODELS.some((m: any) => m.id === config.model)) {
                    setConfig("model", DEFAULT_MODELS[0].id);
                }
            }
        };
        fetchModels();
    }, []);

    useEffect(() => {
        async function fetchGpus() {
            try {
                const res = await fetch('/api/system/gpus');
                const data = await res.json();
                if (data.gpus && data.gpus.length > 0) {
                    setGpus(data.gpus);
                    if (!config.gpuId) setConfig("gpuId", data.gpus[0].id);
                }
            } catch (err) {
                console.error("Failed to fetch GPUs", err);
            } finally {
                setLoadingGpus(false);
            }
        }
        fetchGpus();
    }, []);

    const selectedModel = models.find(m => m.id === config.model) || models[0] || DEFAULT_MODELS[0];

    // Format learning rate for display
    const formatLR = (lr: number) => {
        if (lr >= 1e-3) return lr.toFixed(4);
        return lr.toExponential(1);
    };

    return (
        <GlassCard className="h-full flex flex-col gap-6 overflow-y-auto" gradient>
            {/* Header */}
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Cpu className="text-forge-orange" /> Model Configuration
                </h2>

                <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 hidden md:block">Target:</span>
                    <div className="relative">
                        <select
                            value={config.gpuId}
                            onChange={(e) => setConfig("gpuId", e.target.value)}
                            className="bg-glass-200 text-xs text-white border border-glass-border rounded-md py-1 pl-2 pr-8 appearance-none focus:outline-none focus:border-forge-orange cursor-pointer min-w-[140px]"
                            disabled={loadingGpus || gpus.length === 0}
                        >
                            {loadingGpus ? (
                                <option>Scanning...</option>
                            ) : gpus.length > 0 ? (
                                gpus.map(gpu => (
                                    <option key={gpu.id} value={gpu.id}>{gpu.name}</option>
                                ))
                            ) : (
                                <option value="cpu">CPU Only</option>
                            )}
                        </select>
                        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400 pointer-events-none" />
                    </div>
                </div>
            </div>

            {/* Provider Toggle */}
            <div className="space-y-3">
                <label className="text-sm text-gray-400 flex items-center gap-2">
                    <Server className="h-4 w-4" /> Training Backend
                </label>
                <div className="grid grid-cols-3 gap-2">
                    {allProviders.map((p) => (
                        <button
                            key={p.id}
                            onClick={() => setProvider(p.id)}
                            className={cn(
                                "p-3 rounded-lg border transition-all text-left group",
                                config.provider === p.id
                                    ? "border-forge-orange bg-forge-orange/10"
                                    : "border-glass-border bg-glass-100 hover:bg-glass-200"
                            )}
                        >
                            <div className="flex items-center gap-2 mb-1">
                                <div
                                    className={cn(
                                        "w-2 h-2 rounded-full",
                                        config.provider === p.id ? "bg-forge-orange" : "bg-gray-600"
                                    )}
                                />
                                <span className={cn(
                                    "font-bold text-sm",
                                    config.provider === p.id ? "text-white" : "text-gray-400"
                                )}>
                                    {p.name}
                                </span>
                            </div>
                            <span className={cn(
                                "text-[10px] uppercase tracking-wider",
                                config.provider === p.id ? "text-forge-orange" : "text-gray-600"
                            )}>
                                {p.tagline}
                            </span>
                        </button>
                    ))}
                </div>
                <p className="text-xs text-gray-500 pl-1">
                    {provider.description}
                </p>
            </div>

            {/* Model + Configuration Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Model Selection */}
                <div className="space-y-3">
                    <label className="text-sm text-gray-400">Base Model</label>
                    <div className="relative">
                        <button
                            onClick={() => setIsOpen(!isOpen)}
                            className="w-full flex items-center justify-between p-3 rounded-lg border border-glass-border bg-glass-200 hover:bg-glass-300 text-white transition-all cursor-pointer"
                        >
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-forge-orange/20 text-forge-orange">
                                    <Cpu className="h-4 w-4" />
                                </div>
                                <div className="text-left">
                                    <div className="font-medium text-sm">{selectedModel.name}</div>
                                    <div className="text-xs text-gray-400">{selectedModel.type}</div>
                                </div>
                            </div>
                            <ChevronDown className={cn("h-4 w-4 text-gray-400 transition-transform", isOpen && "rotate-180")} />
                        </button>

                        <AnimatePresence>
                            {isOpen && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 10 }}
                                    className="absolute top-full left-0 right-0 mt-2 bg-background-secondary border border-glass-border rounded-xl z-20 overflow-hidden shadow-2xl max-h-64 overflow-y-auto"
                                >
                                    {models.map((model) => (
                                        <button
                                            key={model.id}
                                            onClick={() => {
                                                setConfig("model", model.id);
                                                setIsOpen(false);
                                            }}
                                            className="w-full flex items-center justify-between p-3 hover:bg-white/5 transition-colors text-left"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 rounded-lg bg-forge-orange/20 text-forge-orange">
                                                    <Cpu className="h-4 w-4" />
                                                </div>
                                                <div>
                                                    <div className="text-white font-medium text-sm">{model.name}</div>
                                                    <div className="text-xs text-gray-400">{model.type}</div>
                                                </div>
                                            </div>
                                            {config.model === model.id && (
                                                <div className="h-2 w-2 rounded-full bg-forge-orange" />
                                            )}
                                        </button>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                {/* Quantization Panel */}
                <div className="space-y-3">
                    <div className="flex justify-between">
                        <label className="text-sm text-gray-400 flex items-center gap-2">
                            <Layers className="h-4 w-4" /> Quantization
                        </label>
                        <span className={cn(
                            "text-xs font-bold px-2 py-0.5 rounded font-telemetry",
                            config.quantization === "4bit" ? "text-forge-green bg-forge-green/10" :
                                config.quantization === "8bit" ? "text-forge-orange bg-forge-orange/10" :
                                    "text-forge-amber bg-forge-amber/10"
                        )}>
                            {config.quantization === "4bit" ? "Max VRAM Safe" : config.quantization === "8bit" ? "Balanced" : "Full Precision"}
                        </span>
                    </div>
                    <div className="flex gap-2 bg-glass-200 p-1 rounded-lg">
                        {provider.quantizationOptions.map((q) => (
                            <button
                                key={q}
                                onClick={() => setConfig("quantization", q)}
                                className={cn(
                                    "flex-1 py-2 text-xs rounded-md transition-all font-medium",
                                    config.quantization === q
                                        ? "bg-forge-orange text-white shadow-lg"
                                        : "text-gray-500 hover:text-gray-300"
                                )}
                            >
                                {q === "none" ? "FP16" : q.toUpperCase()}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Parameter Gauges */}
            <div className="space-y-4 bg-glass-100/50 p-4 rounded-xl border border-glass-border">
                <div className="flex items-center gap-2 mb-2">
                    <Gauge className="h-4 w-4 text-forge-orange" />
                    <span className="text-sm font-medium text-white">Parameter Gauges</span>
                    <span className="text-xs text-gray-500 ml-auto font-telemetry">
                        {provider.configFormat === 'yaml' ? 'YAML' : 'Python'}
                    </span>
                </div>

                {/* LoRA Rank */}
                <div>
                    <div className="flex justify-between mb-2">
                        <label className="text-sm text-gray-400">LoRA Rank (r)</label>
                        <span className="text-xs text-white font-telemetry bg-glass-200 px-2 py-0.5 rounded">
                            {config.loraRank}
                        </span>
                    </div>
                    <input
                        type="range"
                        min={provider.loraRankRange[0]}
                        max={provider.loraRankRange[1]}
                        step="4"
                        value={config.loraRank}
                        onChange={(e) => setConfig("loraRank", Number(e.target.value))}
                        className="w-full h-2 bg-glass-200 rounded-lg appearance-none cursor-pointer accent-forge-orange"
                    />
                    <div className="flex justify-between mt-1 text-[10px] text-gray-600 font-telemetry">
                        <span>{provider.loraRankRange[0]}</span>
                        <span>{provider.loraRankRange[1]}</span>
                    </div>
                </div>

                {/* LoRA Alpha */}
                <div>
                    <div className="flex justify-between mb-2">
                        <label className="text-sm text-gray-400">LoRA Alpha (α)</label>
                        <span className="text-xs text-white font-telemetry bg-glass-200 px-2 py-0.5 rounded">
                            {config.loraAlpha}
                        </span>
                    </div>
                    <input
                        type="range"
                        min={provider.alphaRange[0]}
                        max={provider.alphaRange[1]}
                        step="8"
                        value={config.loraAlpha}
                        onChange={(e) => setConfig("loraAlpha", Number(e.target.value))}
                        className="w-full h-2 bg-glass-200 rounded-lg appearance-none cursor-pointer accent-forge-amber"
                    />
                    <div className="flex justify-between mt-1 text-[10px] text-gray-600 font-telemetry">
                        <span>{provider.alphaRange[0]}</span>
                        <span>{provider.alphaRange[1]}</span>
                    </div>
                </div>

                {/* Learning Rate */}
                <div>
                    <div className="flex justify-between mb-2">
                        <label className="text-sm text-gray-400">Learning Rate</label>
                        <span className="text-xs text-white font-telemetry bg-glass-200 px-2 py-0.5 rounded">
                            {formatLR(config.learningRate)}
                        </span>
                    </div>
                    <input
                        type="range"
                        min={Math.log10(provider.learningRateRange[0])}
                        max={Math.log10(provider.learningRateRange[1])}
                        step="0.1"
                        value={Math.log10(config.learningRate)}
                        onChange={(e) => setConfig("learningRate", Math.pow(10, Number(e.target.value)))}
                        className="w-full h-2 bg-glass-200 rounded-lg appearance-none cursor-pointer accent-forge-green"
                    />
                    <div className="flex justify-between mt-1 text-[10px] text-gray-600 font-telemetry">
                        <span>{formatLR(provider.learningRateRange[0])}</span>
                        <span>{formatLR(provider.learningRateRange[1])}</span>
                    </div>
                </div>
            </div>
        </GlassCard>
    );
}
