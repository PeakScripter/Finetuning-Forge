"use client";

import React, { useState } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import {
    Activity,
    Flame,
    Play,
    Square,
    AlertCircle,
    Zap,
    Thermometer,
    Gauge,
    CheckCircle2,
    AlertTriangle,
    XCircle,
    Loader2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useFinetuner } from "@/context/FinetunerContext";
import { cn } from "@/lib/utils";

interface VramCheckResult {
    canFit: boolean;
    status: "safe" | "tight" | "overflow";
    reason: string;
    estimatedVramGB: string;
    availableVramGB: string;
    totalVramGB: string;
    headroomGB: string;
    gpuName: string;
}

export function TrainingForge() {
    const { training, startTraining, stopTraining, config, settings, system, getCurrentProvider } = useFinetuner();
    const { data, status, currentStep, totalSteps, eta, error } = training;
    const isTraining = status === "training" || status === "connecting";
    const isConnecting = status === "connecting";
    const isCompleted = status === "completed";
    const isError = status === "error";
    const provider = getCurrentProvider();


    const [dryRunResult, setDryRunResult] = useState<VramCheckResult | null>(null);
    const [isDryRunning, setIsDryRunning] = useState(false);

    const handleStart = () => {
        startTraining();
    };

    const handleStop = () => {
        stopTraining();
    };

    const handleDryRun = async () => {
        setIsDryRunning(true);
        try {
            const res = await fetch('/api/system/vram-check', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: config.model,
                    quantization: config.quantization,
                }),
            });
            const result = await res.json();
            setDryRunResult(result);
        } catch (err) {
            console.error("Dry run failed:", err);
            setDryRunResult({
                canFit: false,
                status: "overflow",
                reason: "Failed to check VRAM. Ensure you have an NVIDIA GPU.",
                estimatedVramGB: "?",
                availableVramGB: "0",
                totalVramGB: "0",
                headroomGB: "0",
                gpuName: "Unknown",
            });
        }
        setIsDryRunning(false);
    };

    const hasDataset = config.dataset !== null;
    const hasModel = config.model !== null;
    const canStart = hasDataset && hasModel;

    // Status icon for dry run result
    const getDryRunIcon = () => {
        if (!dryRunResult) return null;
        switch (dryRunResult.status) {
            case "safe": return <CheckCircle2 className="h-5 w-5 text-forge-green" />;
            case "tight": return <AlertTriangle className="h-5 w-5 text-forge-amber" />;
            case "overflow": return <XCircle className="h-5 w-5 text-forge-red" />;
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
            {/* Main Chart Area */}
            <GlassCard className={cn(
                "lg:col-span-2 flex flex-col h-[500px] transition-all duration-500",
                isTraining && "training-active"
            )} gradient>
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Flame className={cn(
                            "h-5 w-5 transition-all",
                            isTraining ? "text-forge-orange pulse-active" : "text-gray-500"
                        )} />
                        The Forge
                    </h2>
                    <div className="flex items-center gap-4">
                        <div className={cn(
                            "flex gap-4 text-xs font-telemetry transition-opacity",
                            isTraining ? "opacity-100" : "opacity-30"
                        )}>
                            <span className="text-forge-orange">
                                LR: {config.learningRate.toExponential(1)}
                            </span>
                            <span className="text-forge-amber">
                                Batch: {config.batchSize}
                            </span>
                            <span className="text-forge-green">
                                Epoch: {isTraining ? "1/3" : "-/-"}
                            </span>
                        </div>
                        <span className={cn(
                            "text-xs font-telemetry px-2 py-1 rounded-full border",
                            isTraining
                                ? "text-forge-orange bg-forge-orange/10 border-forge-orange/30"
                                : "text-gray-500 bg-glass-200 border-glass-border"
                        )}>
                            {provider.name}
                        </span>
                    </div>
                </div>

                <div className="flex-1 w-full min-h-0 relative">
                    {status === "idle" && data.length === 0 ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
                            <div className={cn(
                                "rounded-full p-6 mb-4",
                                canStart ? "bg-forge-orange/10" : "bg-glass-200"
                            )}>
                                <Flame className={cn(
                                    "h-12 w-12",
                                    canStart ? "text-forge-orange" : "text-gray-500"
                                )} />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">Ready to Initialize</h3>
                            <div className="text-gray-400 mb-6 max-w-sm text-center space-y-2 text-sm">
                                <p className={hasDataset ? "text-forge-green" : "text-gray-500"}>
                                    • Dataset: {hasDataset ? config.dataset : "Missing"}
                                </p>
                                <p className={hasModel ? "text-forge-green" : "text-gray-500"}>
                                    • Model: {hasModel ? config.model : "Not Selected"}
                                </p>
                            </div>

                            {!canStart && (
                                <div className="mb-4 text-forge-red text-sm flex items-center gap-2 bg-forge-red/10 px-4 py-2 rounded-lg border border-forge-red/20">
                                    <AlertCircle className="h-4 w-4" />
                                    {!hasDataset ? "Import a dataset first." : "Select a model."}
                                </div>
                            )}

                            {/* Action Buttons */}
                            <div className="flex items-center gap-4">
                                {/* Dry Run Button */}
                                <button
                                    onClick={handleDryRun}
                                    disabled={isDryRunning || !hasModel}
                                    className={cn(
                                        "font-bold px-6 py-3 rounded-xl flex items-center gap-2 transition-all border",
                                        hasModel
                                            ? "bg-glass-200 text-white border-glass-border hover:bg-glass-300 hover:border-forge-amber"
                                            : "bg-glass-100 text-gray-600 border-glass-border cursor-not-allowed"
                                    )}
                                >
                                    {isDryRunning ? (
                                        <Loader2 className="h-5 w-5 animate-spin" />
                                    ) : (
                                        <Gauge className="h-5 w-5" />
                                    )}
                                    DRY RUN
                                </button>

                                {/* Start Training Button */}
                                <button
                                    onClick={handleStart}
                                    disabled={!canStart}
                                    className={cn(
                                        "font-bold px-8 py-3 rounded-xl flex items-center gap-2 transition-all",
                                        canStart
                                            ? "bg-forge-orange hover:bg-white text-black hover:scale-105 shadow-[0_0_20px_rgba(255,107,0,0.3)]"
                                            : "bg-gray-800 text-gray-500 cursor-not-allowed opacity-50 shadow-none"
                                    )}
                                >
                                    <Play className="h-5 w-5 fill-current" /> START TRAINING
                                </button>
                            </div>

                            {/* Dry Run Result */}
                            <AnimatePresence>
                                {dryRunResult && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        className={cn(
                                            "mt-6 p-4 rounded-xl border max-w-md",
                                            dryRunResult.status === "safe" && "bg-forge-green/10 border-forge-green/30",
                                            dryRunResult.status === "tight" && "bg-forge-amber/10 border-forge-amber/30",
                                            dryRunResult.status === "overflow" && "bg-forge-red/10 border-forge-red/30"
                                        )}
                                    >
                                        <div className="flex items-start gap-3">
                                            {getDryRunIcon()}
                                            <div>
                                                <div className="font-bold text-white text-sm mb-1">
                                                    {dryRunResult.status === "safe" && "✓ Pre-flight Check Passed"}
                                                    {dryRunResult.status === "tight" && "⚠ Tight VRAM Margin"}
                                                    {dryRunResult.status === "overflow" && "✗ Insufficient VRAM"}
                                                </div>
                                                <p className="text-xs text-gray-400">{dryRunResult.reason}</p>
                                                <div className="mt-2 text-xs font-telemetry text-gray-500">
                                                    {dryRunResult.gpuName} • {dryRunResult.availableVramGB}GB free / {dryRunResult.totalVramGB}GB total
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={data}>
                                <defs>
                                    <linearGradient id="colorLoss" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorAcc" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#22C55E" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#22C55E" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="step" hide />
                                <YAxis domain={[0, 3]} hide />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: '#1A1A1A',
                                        borderColor: '#333',
                                        borderRadius: '8px',
                                        fontFamily: 'JetBrains Mono, monospace',
                                        fontSize: '12px'
                                    }}
                                    itemStyle={{ color: '#fff' }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="loss"
                                    stroke="#EF4444"
                                    fillOpacity={1}
                                    fill="url(#colorLoss)"
                                    strokeWidth={2}
                                    isAnimationActive={false}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="accuracy"
                                    stroke="#22C55E"
                                    fillOpacity={1}
                                    fill="url(#colorAcc)"
                                    strokeWidth={2}
                                    isAnimationActive={false}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </GlassCard>

            {/* Side Panel */}
            <div className="space-y-6 flex flex-col">
                {/* Abort Button */}
                {isTraining && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-4">
                        <button
                            onClick={handleStop}
                            className="w-full bg-forge-red/10 border border-forge-red/50 text-forge-red hover:bg-forge-red hover:text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all"
                        >
                            <Square className="h-4 w-4 fill-current" /> ABORT SESSION
                        </button>
                    </motion.div>
                )}

                {/* GPU Gauge */}
                <GlassCard className={cn(
                    "flex-1 transition-all duration-500",
                    isTraining && "border-forge-orange/30"
                )}>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm text-gray-400 flex items-center gap-2">
                            <Zap className="h-4 w-4" /> Hardware Monitor
                        </h3>
                        <span className={cn(
                            "text-[10px] px-2 py-0.5 rounded font-telemetry",
                            settings.useGpu ? "bg-forge-green/10 text-forge-green" : "bg-forge-red/10 text-forge-red"
                        )}>
                            {settings.useGpu ? "GPU Active" : "CPU Mode"}
                        </span>
                    </div>

                    <div className="relative flex items-center justify-center p-4">
                        {/* SVG Gauge */}
                        <svg viewBox="0 0 100 50" className={cn(
                            "w-full h-auto transition-all duration-500",
                            isTraining && "drop-shadow-[0_0_15px_rgba(255,107,0,0.5)]"
                        )}>
                            <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="#333" strokeWidth="10" />
                            <path
                                d="M 10 50 A 40 40 0 0 1 90 50"
                                fill="none"
                                stroke={isTraining ? "#FF6B00" : "#22C55E"}
                                strokeWidth="10"
                                strokeLinecap="round"
                                className="transition-all duration-1000 ease-in-out"
                                style={{
                                    strokeDasharray: `${system.gpuUsage * 1.26}, 200`,
                                    strokeDashoffset: 0
                                }}
                            />
                        </svg>
                        <div className="absolute bottom-0 text-center">
                            <div className={cn(
                                "text-3xl font-bold font-telemetry transition-all",
                                isTraining ? "text-forge-orange" : "text-white"
                            )}>
                                {system.gpuUsage}%
                            </div>
                            <div className="text-xs text-gray-400 font-telemetry">{system.vramUsage}</div>
                        </div>
                    </div>

                    {/* Additional Stats */}
                    <div className="grid grid-cols-2 gap-2 mt-4 text-xs">
                        <div className="bg-glass-200 p-2 rounded-lg">
                            <div className="text-gray-500 flex items-center gap-1">
                                <Thermometer className="h-3 w-3" /> Temp
                            </div>
                            <div className="font-telemetry text-white">{system.gpuTemp || '--'}°C</div>
                        </div>
                        <div className="bg-glass-200 p-2 rounded-lg">
                            <div className="text-gray-500 flex items-center gap-1">
                                <Zap className="h-3 w-3" /> Power
                            </div>
                            <div className="font-telemetry text-white">{system.gpuPower || '--'}W</div>
                        </div>
                    </div>
                </GlassCard>

                {/* Live Logs */}
                <GlassCard className="h-1/3 flex flex-col relative overflow-hidden">
                    <h3 className="text-sm text-gray-400 mb-2 flex items-center gap-2">
                        <Activity className="h-3 w-3" /> Training Logs
                    </h3>
                    <div className="flex-1 overflow-y-auto font-telemetry text-[10px] text-gray-300 space-y-1 p-2 bg-black/20 rounded">
                        {training.logs.length === 0 ? (
                            <span className="text-gray-600 italic">Waiting for logs...</span>
                        ) : (
                            training.logs.map((log, i) => (
                                <div key={i} className="whitespace-nowrap animate-in fade-in slide-in-from-bottom-1 duration-300">
                                    <span className="text-forge-orange mr-2">{">"}</span>
                                    {log}
                                </div>
                            ))
                        )}
                        <div id="log-end" />
                    </div>
                </GlassCard>
            </div>
        </div>
    );
}
