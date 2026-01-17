"use client";

import { GlassCard } from "@/components/ui/GlassCard";
import { Smile, Frown, Meh, BarChart3 } from "lucide-react";

export function Metrics() {
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full">
            <GlassCard className="flex flex-col items-center justify-center text-center">
                <h3 className="text-gray-400 mb-2">Final Perplexity</h3>
                <div className="text-4xl font-bold text-white">4.21</div>
                <div className="text-xs text-neon-green mt-2">↓ 12% improvement</div>
            </GlassCard>

            <GlassCard className="flex flex-col items-center justify-center text-center">
                <h3 className="text-gray-400 mb-2">Inference Speed</h3>
                <div className="text-4xl font-bold text-white">48 <span className="text-lg text-gray-500">tok/s</span></div>
                <div className="text-xs text-gray-500 mt-2">RTX 4090</div>
            </GlassCard>

            <GlassCard className="flex flex-col items-center justify-center text-center relative overflow-hidden">
                <div className="absolute inset-0 bg-neon-purple/5"></div>
                <h3 className="text-neon-purple font-bold mb-4 uppercase tracking-widest text-xs">Vibe Check</h3>
                <div className="flex gap-4">
                    <Smile className="h-8 w-8 text-neon-green hover:scale-110 transition-transform cursor-pointer" />
                    <Meh className="h-8 w-8 text-gray-400 hover:scale-110 transition-transform cursor-pointer" />
                    <Frown className="h-8 w-8 text-red-500 hover:scale-110 transition-transform cursor-pointer" />
                </div>
                <div className="mt-4 text-2xl font-bold text-white">9.2/10</div>
            </GlassCard>
        </div>
    );
}
