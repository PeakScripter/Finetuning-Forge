"use client";

import React, { useState, useEffect, useCallback } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { Upload, FileText, CheckCircle, Database } from "lucide-react";
import { motion } from "framer-motion";
import { useFinetuner } from "@/context/FinetunerContext";
import { cn } from "@/lib/utils";

export function DatasetZone() {
    const { config, setConfig } = useFinetuner();
    const [isHovering, setIsHovering] = useState(false);
    const [localDatasets, setLocalDatasets] = useState<any[]>([]);

    useEffect(() => {
        const fetchDatasets = async () => {
            try {
                const res = await fetch('/api/local/datasets');
                const data = await res.json();
                if (data.datasets) {
                    setLocalDatasets(data.datasets);
                }
            } catch (e) {
                console.error(e);
            }
        };
        fetchDatasets();
        const interval = setInterval(fetchDatasets, 5000);
        return () => clearInterval(interval);
    }, []);

    const onDrop = useCallback((acceptedFiles: File[]) => {
        const file = acceptedFiles[0];
        if (file) {
            setConfig("dataset", file.name);
        }
    }, [setConfig]);

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsHovering(false);
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            setConfig("dataset", files[0].name);
        }
    };

    return (
        <GlassCard className="h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Database className="text-forge-amber" /> Dataset
                </h2>
                {config.dataset && (
                    <span className="text-xs text-forge-green flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" /> Ready
                    </span>
                )}
            </div>

            <div
                onDragOver={(e) => { e.preventDefault(); setIsHovering(true); }}
                onDragLeave={() => setIsHovering(false)}
                onDrop={handleDrop}
                className={cn(
                    "flex-1 border-2 border-dashed rounded-xl transition-all duration-300 flex flex-col items-center justify-center p-6 text-center",
                    isHovering
                        ? "border-forge-orange bg-forge-orange/10 scale-[1.02]"
                        : config.dataset
                            ? "border-forge-green/50 bg-forge-green/5"
                            : "border-glass-border hover:border-glass-300 bg-glass-100/50"
                )}
            >
                {!config.dataset ? (
                    <>
                        <div className="h-16 w-16 rounded-full bg-glass-200 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                            <Upload className={cn("h-8 w-8", isHovering ? "text-forge-orange" : "text-gray-400")} />
                        </div>
                        <h3 className="text-lg font-medium text-white mb-1">Drop JSONL / CSV</h3>
                        <p className="text-sm text-gray-500">Drag & drop your training data here</p>
                    </>
                ) : (
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="w-full"
                    >
                        <div className="flex items-center justify-center gap-3 mb-4">
                            <FileText className="h-10 w-10 text-forge-orange" />
                            <div className="text-left">
                                <div className="text-white font-bold">{config.dataset}</div>
                                <div className="text-xs text-gray-400">Ready for Training</div>
                            </div>
                        </div>

                        <div className="mt-6 space-y-2">
                            <h4 className="text-sm font-medium text-gray-400">Detected Local Datasets</h4>
                            {localDatasets.length === 0 ? (
                                <p className="text-xs text-gray-600 italic">No files found. Place .jsonl files in the `datasets` folder.</p>
                            ) : (
                                localDatasets.map((ds) => (
                                    <div
                                        key={ds.id}
                                        onClick={() => setConfig("dataset", ds.name)}
                                        className={cn(
                                            "p-3 rounded-lg border flex items-center justify-between cursor-pointer transition-all",
                                            config.dataset === ds.name
                                                ? "bg-forge-orange/10 border-forge-orange"
                                                : "bg-glass-200 border-glass-border hover:bg-glass-300"
                                        )}
                                    >
                                        <div className="flex items-center gap-3">
                                            <Database className="h-4 w-4 text-forge-orange" />
                                            <div>
                                                <div className="text-sm text-white font-medium">{ds.name}</div>
                                                <div className="text-[10px] text-gray-400">{ds.size} • {ds.type}</div>
                                            </div>
                                        </div>
                                        {config.dataset === ds.name && <div className="h-2 w-2 rounded-full bg-forge-orange" />}
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="mt-8 relative h-20 bg-glass-200 rounded-xl overflow-hidden">
                            {/* Visual Token Density Bar */}
                            <div className="w-full h-8 flex gap-0.5 rounded-md overflow-hidden opacity-80">
                                {[...Array(20)].map((_, i) => (
                                    <motion.div
                                        key={i}
                                        initial={{ height: 0 }}
                                        animate={{ height: "100%" }}
                                        transition={{ delay: i * 0.05 }}
                                        className="flex-1 bg-forge-orange"
                                        style={{ opacity: Math.random() * 0.5 + 0.3 }}
                                    />
                                ))}
                            </div>
                            <div className="flex justify-between text-[10px] text-gray-500 mt-1 uppercase tracking-wider font-telemetry">
                                <span>Sparse</span>
                                <span>Token Density</span>
                                <span>Dense</span>
                            </div>
                        </div>
                    </motion.div>
                )}
            </div>
        </GlassCard>
    );
}
