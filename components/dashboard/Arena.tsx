"use client";

import React, { useState } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { Send, Zap, Bot, User, Divide, Ghost } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useFinetuner } from "@/context/FinetunerContext";

export function Arena() {
    const { training, config } = useFinetuner();
    const [prompt, setPrompt] = useState("");
    const [loading, setLoading] = useState(false);
    const [response, setResponse] = useState<{ base: string; finetuned: string } | null>(null);

    const handleGenerate = () => {
        if (!prompt) return;
        setLoading(true);
        // Simulate generation delay
        setTimeout(() => {
            setResponse({
                base: "Based on the provided document, the liability clause indicates that the tenant is responsible for damages.",
                finetuned: "The lease agreement's Indemnification Clause (Section 4.2) explicitly holds the Lessee liable for structural damages, excluding normal wear and tear, pursuant to California Civil Code § 1941."
            });
            setLoading(false);
        }, 1500);
    };

    const isModelReady = training.status === "completed";

    if (!isModelReady) {
        return (
            <GlassCard className="h-full flex flex-col items-center justify-center text-center">
                <div className="bg-glass-200 p-6 rounded-full mb-6 relative">
                    <Ghost className="h-12 w-12 text-gray-500" />
                    <div className="absolute top-0 right-0 h-4 w-4 bg-red-500 rounded-full animate-pulse" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Model Not Ready</h2>
                <p className="text-gray-400 max-w-md mb-6">
                    The Evaluation Arena requires a fine-tuned model checkpoint.
                    Complete a training session in the Forge to unlock this module.
                </p>
            </GlassCard>
        );
    }

    return (
        <div className="h-full flex flex-col gap-6">
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 min-h-0">
                {/* Base Model Output */}
                <GlassCard className="flex flex-col relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-gray-700 to-gray-500" />
                    <div className="flex items-center gap-3 mb-4 opacity-50">
                        <Bot className="h-5 w-5" />
                        <span className="font-mono text-sm">BASE MODEL ({config.model.toUpperCase()})</span>
                    </div>
                    <div className="flex-1 font-mono text-sm text-gray-300 leading-relaxed overflow-y-auto">
                        {loading ? (
                            <div className="space-y-2 animate-pulse">
                                <div className="h-2 bg-glass-300 rounded w-3/4" />
                                <div className="h-2 bg-glass-300 rounded w-1/2" />
                            </div>
                        ) : response ? (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                                {response.base}
                            </motion.div>
                        ) : (
                            <span className="text-gray-600 italic">Waiting for input...</span>
                        )}
                    </div>
                </GlassCard>

                {/* Fine-Tuned Model Output */}
                <GlassCard className="flex flex-col relative overflow-hidden" gradient>
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-neon-blue to-neon-purple" />
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3 text-neon-blue">
                            <Zap className="h-5 w-5" />
                            <span className="font-mono text-sm font-bold">FINE-TUNED</span>
                        </div>
                        <span className="text-[10px] bg-neon-blue/10 text-neon-blue px-2 py-0.5 rounded border border-neon-blue/20">
                            Step {training.currentStep}
                        </span>
                    </div>
                    <div className="flex-1 font-mono text-sm text-white leading-relaxed overflow-y-auto">
                        {loading ? (
                            <div className="space-y-2 animate-pulse">
                                <div className="h-2 bg-neon-blue/20 rounded w-3/4" />
                                <div className="h-2 bg-neon-blue/20 rounded w-1/2" />
                                <div className="h-2 bg-neon-blue/20 rounded w-5/6" />
                            </div>
                        ) : response ? (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                                {response.finetuned}
                            </motion.div>
                        ) : (
                            <span className="text-gray-500 italic">Ready to generate...</span>
                        )}
                    </div>
                </GlassCard>
            </div>

            {/* Input Area */}
            <GlassCard className="flex-none">
                <div className="flex gap-4">
                    <div className="flex-1 bg-glass-200 rounded-xl p-4 flex gap-3 focus-within:ring-1 focus-within:ring-neon-blue transition-all">
                        <User className="h-5 w-5 text-gray-400 mt-1" />
                        <textarea
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="Enter a prompt to compare model outputs..."
                            className="w-full bg-transparent border-none focus:outline-none text-white resize-none h-20"
                        />
                    </div>
                    <button
                        onClick={handleGenerate}
                        disabled={loading || !prompt}
                        className="bg-neon-blue disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold px-8 rounded-xl flex flex-col items-center justify-center gap-1 hover:bg-white transition-all shadow-[0_0_15px_rgba(0,243,255,0.3)]"
                    >
                        <Send className="h-6 w-6" />
                        <span className="text-xs">GENERATE</span>
                    </button>
                </div>
            </GlassCard>
        </div>
    );
}
