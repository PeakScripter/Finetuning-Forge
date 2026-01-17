"use client";

import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from "react";
import { ProviderType, OrchestratorConfig } from "@/lib/orchestrator/types";
import { getProvider } from "@/lib/orchestrator/providers";

interface TrainingDataPoint {
    step: number;
    loss: number;
    accuracy: number;
}

interface FinetunerState {
    config: OrchestratorConfig;
    training: {
        status: "idle" | "connecting" | "training" | "completed" | "error";
        progress: number;
        data: TrainingDataPoint[];
        logs: string[];
        currentStep: number;
        totalSteps: number;
        eta: string;
        error: string | null;
    };
    system: {
        gpuUsage: number;
        vramUsage: string;
        vramUsedMB: number;
        vramTotalMB: number;
        gpuName: string;
        gpuTemp: number;
        gpuPower: number;
        isOnline: boolean;
    };
    settings: {
        hfToken: string;
        wandbKey: string;
        theme: "tactical" | "minimal";
        useGpu: boolean;
        backendUrl: string;
    };
}

interface FinetunerContextType extends FinetunerState {
    setConfig: <K extends keyof OrchestratorConfig>(key: K, value: OrchestratorConfig[K]) => void;
    setProvider: (provider: ProviderType) => void;
    startTraining: () => void;
    stopTraining: () => void;
    setSettings: (key: keyof FinetunerState["settings"], value: any) => void;
    refreshSystemStats: () => Promise<void>;
    getCurrentProvider: () => ReturnType<typeof getProvider>;
}

const FinetunerContext = createContext<FinetunerContextType | undefined>(undefined);

// Backend URL (FastAPI server)
const BACKEND_URL = "ws://localhost:8001";

export function FinetunerProvider({ children }: { children: ReactNode }) {
    const [state, setState] = useState<FinetunerState>({
        config: {
            provider: "unsloth",
            model: "llama-3",
            dataset: null,
            gpuId: "",
            quantization: "4bit",
            loraRank: 16,
            loraAlpha: 32,
            learningRate: 2e-4,
            batchSize: 4,
            gradientAccumulation: 4,
            warmupSteps: 10,
            maxSteps: 100,
        },
        training: {
            status: "idle",
            progress: 0,
            data: [],
            logs: [],
            currentStep: 0,
            totalSteps: 100,
            eta: "--",
            error: null,
        },
        system: {
            gpuUsage: 0,
            vramUsage: "0GB / 0GB",
            vramUsedMB: 0,
            vramTotalMB: 0,
            gpuName: "Detecting...",
            gpuTemp: 0,
            gpuPower: 0,
            isOnline: false,
        },
        settings: {
            hfToken: "",
            wandbKey: "",
            theme: "tactical",
            useGpu: true,
            backendUrl: "ws://localhost:8001",
        },
    });

    const wsRef = useRef<WebSocket | null>(null);
    const eventSourceRef = useRef<EventSource | null>(null);

    // Load Settings from LocalStorage
    useEffect(() => {
        const saved = localStorage.getItem("forge_local_settings_v1");
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                setState((prev) => ({
                    ...prev,
                    settings: { ...prev.settings, ...parsed },
                }));
            } catch (e) {
                console.error("Failed to parse settings", e);
            }
        }

        const savedConfig = localStorage.getItem("forge_local_config_v1");
        if (savedConfig) {
            try {
                const parsedConfig = JSON.parse(savedConfig);
                setState((prev) => ({
                    ...prev,
                    config: { ...prev.config, ...parsedConfig },
                }));
            } catch (e) {
                console.error("Failed to parse config", e);
            }
        }
    }, []);

    // Save config on change
    useEffect(() => {
        localStorage.setItem("forge_local_config_v1", JSON.stringify(state.config));
    }, [state.config]);

    // Theme Effect
    useEffect(() => {
        document.documentElement.setAttribute("data-theme", state.settings.theme);
    }, [state.settings.theme]);

    // System Stats Polling
    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await fetch('/api/system/gpus');
                const data = await res.json();
                if (data.gpus && data.gpus.length > 0) {
                    const gpu = data.gpus[0];
                    const vramTotalMB = parseInt(gpu.vram?.split(' ')[0] || '0');
                    const vramUsedMB = state.training.status === 'training' ? Math.floor(vramTotalMB * 0.85) : Math.floor(vramTotalMB * 0.05);

                    setState(prev => ({
                        ...prev,
                        system: {
                            ...prev.system,
                            gpuName: gpu.name,
                            isOnline: true,
                            gpuUsage: gpu.utilization ?? 0,
                            gpuTemp: gpu.temperature ?? 0,
                            gpuPower: gpu.power ?? 0,
                            vramUsedMB,
                            vramTotalMB,
                            vramUsage: `${(vramUsedMB / 1024).toFixed(1)}GB / ${(vramTotalMB / 1024).toFixed(1)}GB`
                        }
                    }));
                } else {
                    setState(prev => ({
                        ...prev,
                        system: { ...prev.system, gpuName: "Offline / CPU", isOnline: false }
                    }));
                }
            } catch {
                setState(prev => ({
                    ...prev,
                    system: { ...prev.system, isOnline: false }
                }));
            }
        };

        fetchStats();
        const interval = setInterval(fetchStats, 3000);
        return () => clearInterval(interval);
    }, [state.training.status]);

    // Training Connection Handler
    useEffect(() => {
        if (state.training.status === "connecting") {
            // Try WebSocket first (FastAPI backend)
            tryWebSocketConnection();
        }

        // Only cleanup when going back to idle or on error/complete
        if (state.training.status === "idle" || state.training.status === "completed" || state.training.status === "error") {
            if (wsRef.current) {
                wsRef.current.close();
                wsRef.current = null;
            }
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
                eventSourceRef.current = null;
            }
        }

        // Cleanup on unmount only
        return () => {
            // Don't close on status change - only on actual unmount
        };
    }, [state.training.status]);

    const tryWebSocketConnection = () => {
        const backendUrl = state.settings.backendUrl || BACKEND_URL;

        console.log("[FORGE] Attempting WebSocket connection to", backendUrl);

        wsRef.current = new WebSocket(`${backendUrl}/ws/training`);

        wsRef.current.onopen = () => {
            console.log("[FORGE] WebSocket connected to backend");

            // Send training config
            wsRef.current?.send(JSON.stringify(state.config));

            setState(prev => ({
                ...prev,
                training: {
                    ...prev.training,
                    status: "training",
                    logs: [...prev.training.logs, "[FORGE] Connected to training backend..."]
                }
            }));
        };

        wsRef.current.onmessage = (event) => {
            try {
                const payload = JSON.parse(event.data);
                handleTrainingMessage(payload);
            } catch (e) {
                console.error("Failed to parse training message", e);
            }
        };

        wsRef.current.onerror = (error) => {
            console.log("[FORGE] WebSocket error, falling back to SSE simulation");
            wsRef.current?.close();
            // Fallback to SSE simulation
            fallbackToSSE();
        };

        wsRef.current.onclose = () => {
            console.log("[FORGE] WebSocket closed");
        };
    };

    const fallbackToSSE = () => {
        console.log("[FORGE] Using SSE simulation (backend not available)");

        setState(prev => ({
            ...prev,
            training: {
                ...prev.training,
                status: "training",
                logs: [...prev.training.logs, "[FORGE] Backend not found. Running simulation mode..."]
            }
        }));

        eventSourceRef.current = new EventSource('/api/training/stream');

        eventSourceRef.current.onmessage = (event) => {
            try {
                const payload = JSON.parse(event.data);
                handleTrainingMessage(payload);
            } catch (e) {
                console.error("Failed to parse SSE message", e);
            }
        };

        eventSourceRef.current.onerror = () => {
            console.error("SSE connection lost");
            eventSourceRef.current?.close();
            setState(prev => ({
                ...prev,
                training: { ...prev.training, status: "error", error: "Training stream connection lost" }
            }));
        };
    };

    const handleTrainingMessage = (payload: any) => {
        const { type, step, total_steps, loss, accuracy, log, message } = payload;

        setState((prev) => {
            const newData = step && loss !== undefined ? [...prev.training.data, { step, loss, accuracy: accuracy || 0 }].slice(-50) : prev.training.data;
            const newLogs = log ? [...prev.training.logs, log].slice(-30) : prev.training.logs;
            const progress = step && total_steps ? (step / total_steps) * 100 : prev.training.progress;

            let newStatus = prev.training.status;
            let newError = prev.training.error;

            if (type === "complete") {
                newStatus = "completed";
            } else if (type === "error") {
                newStatus = "error";
                newError = message || "Training error occurred";
            } else if (type === "aborted") {
                newStatus = "idle";
            }

            return {
                ...prev,
                training: {
                    ...prev.training,
                    status: newStatus,
                    currentStep: step || prev.training.currentStep,
                    totalSteps: total_steps || prev.training.totalSteps,
                    data: newData,
                    logs: newLogs,
                    progress,
                    eta: step >= (total_steps || 100) ? "Done" : "Running...",
                    error: newError,
                }
            };
        });
    };

    const setConfig = <K extends keyof OrchestratorConfig>(key: K, value: OrchestratorConfig[K]) => {
        setState((prev) => ({
            ...prev,
            config: { ...prev.config, [key]: value },
        }));
    };

    const setProvider = (provider: ProviderType) => {
        const providerConfig = getProvider(provider);
        setState((prev) => ({
            ...prev,
            config: {
                ...prev.config,
                provider,
                loraRank: providerConfig.loraRankDefault,
                loraAlpha: providerConfig.alphaDefault,
                learningRate: providerConfig.learningRateDefault,
                quantization: providerConfig.defaultQuantization,
            },
        }));
    };

    const getCurrentProvider = () => getProvider(state.config.provider);

    const setSettings = (key: keyof FinetunerState["settings"], value: any) => {
        setState(prev => {
            const newSettings = { ...prev.settings, [key]: value };
            localStorage.setItem("forge_local_settings_v1", JSON.stringify(newSettings));
            return { ...prev, settings: newSettings };
        });
    };

    const startTraining = () => {
        setState((prev) => ({
            ...prev,
            training: {
                ...prev.training,
                status: "connecting",
                data: [],
                logs: ["[FORGE] Initializing training..."],
                currentStep: 0,
                progress: 0,
                error: null,
            },
        }));
    };

    const stopTraining = () => {
        // Send abort signal if connected
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ action: "abort" }));
        }

        // Close connections
        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
            eventSourceRef.current = null;
        }

        setState((prev) => ({
            ...prev,
            training: {
                ...prev.training,
                status: "idle",
                logs: [...prev.training.logs, "[FORGE] Training aborted by user."]
            },
        }));
    };

    const refreshSystemStats = async () => {
        // Manual trigger if needed
    };

    return (
        <FinetunerContext.Provider
            value={{
                ...state,
                setConfig,
                setProvider,
                setSettings,
                startTraining,
                stopTraining,
                refreshSystemStats,
                getCurrentProvider,
            }}
        >
            {children}
        </FinetunerContext.Provider>
    );
}

export const useFinetuner = () => {
    const context = useContext(FinetunerContext);
    if (!context) throw new Error("useFinetuner must be used within FinetunerProvider");
    return context;
};
