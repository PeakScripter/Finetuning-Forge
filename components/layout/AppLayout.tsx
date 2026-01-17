"use client";

import React from "react";
import { Terminal, Database, Cpu, Activity, Settings, Flame, Code2, Gauge } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFinetuner } from "@/context/FinetunerContext";

interface AppLayoutProps {
    children: React.ReactNode;
    activeTab?: string;
    onTabChange?: (tab: string) => void;
}

export function AppLayout({ children, activeTab = "studio", onTabChange }: AppLayoutProps) {
    const { system, training } = useFinetuner();
    const isTraining = training.status === "training";

    const navItems = [
        { id: "studio", icon: Terminal, label: "Mission Control" },
        { id: "datasets", icon: Database, label: "Datasets" },
        { id: "scriptlab", icon: Code2, label: "Script Lab" },
        { id: "training", icon: Cpu, label: "The Forge" },
        { id: "evaluation", icon: Activity, label: "Arena" },
        { id: "settings", icon: Settings, label: "Settings" },
    ];

    return (
        <div className="flex h-screen w-full bg-transparent overflow-hidden">
            {/* Sidebar - Tactical Obsidian Style */}
            <aside className="w-20 lg:w-64 border-r border-glass-border bg-glass-100 backdrop-blur-xl flex flex-col justify-between py-6 transition-all duration-300 z-50">
                <div>
                    {/* Logo */}
                    <div className="flex items-center justify-center lg:justify-start px-2 lg:px-6 mb-10 gap-3">
                        <div className={cn(
                            "p-2 rounded-lg transition-all duration-500",
                            isTraining ? "bg-forge-orange/20 training-active" : "bg-glass-200"
                        )}>
                            <Flame className={cn(
                                "h-6 w-6 transition-all duration-500",
                                isTraining ? "text-forge-orange pulse-active" : "text-forge-orange"
                            )} />
                        </div>
                        <span className="hidden lg:block text-xl font-bold tracking-wider text-white">
                            FORGE<span className="text-forge-orange">-LOCAL</span>
                        </span>
                    </div>

                    {/* Navigation */}
                    <nav className="flex flex-col gap-2 px-3">
                        {navItems.map((item) => (
                            <button
                                key={item.id}
                                onClick={() => onTabChange?.(item.id)}
                                className={cn(
                                    "flex items-center gap-4 p-3 rounded-lg transition-all group w-full",
                                    activeTab === item.id
                                        ? "bg-forge-orange/10 text-white border border-forge-orange/20"
                                        : "text-gray-400 hover:text-white hover:bg-glass-200"
                                )}
                            >
                                <item.icon className={cn(
                                    "h-5 w-5 transition-colors",
                                    activeTab === item.id ? "text-forge-orange" : "group-hover:text-forge-orange"
                                )} />
                                <span className="hidden lg:block text-sm font-medium">
                                    {item.label}
                                </span>
                            </button>
                        ))}
                    </nav>
                </div>

                {/* GPU Status Widget */}
                <div className="px-3 lg:px-4">
                    <div className={cn(
                        "p-4 rounded-xl bg-glass-100 border transition-all duration-500",
                        isTraining ? "border-forge-orange/30 training-active" : "border-glass-border"
                    )}>
                        {/* GPU Name & Status */}
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <Gauge className={cn(
                                    "h-4 w-4",
                                    isTraining ? "text-forge-orange" : "text-gray-500"
                                )} />
                                <span className="hidden lg:block text-xs text-gray-400 truncate max-w-[100px] font-telemetry">
                                    {system.gpuName}
                                </span>
                            </div>
                            <span className={cn(
                                "text-xs font-telemetry px-2 py-0.5 rounded-full",
                                system.isOnline
                                    ? isTraining
                                        ? "text-forge-orange bg-forge-orange/10"
                                        : "text-forge-green bg-forge-green/10"
                                    : "text-gray-500 bg-gray-500/10"
                            )}>
                                {system.isOnline ? (isTraining ? "Active" : "Ready") : "Offline"}
                            </span>
                        </div>

                        {/* VRAM Bar */}
                        <div className="space-y-1">
                            <div className="flex justify-between text-xs font-telemetry">
                                <span className="text-gray-500">VRAM</span>
                                <span className="text-gray-400 hidden lg:block">{system.vramUsage}</span>
                            </div>
                            <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
                                <div
                                    className={cn(
                                        "h-full transition-all duration-500 rounded-full",
                                        isTraining
                                            ? "bg-forge-orange shadow-[0_0_10px_rgba(255,107,0,0.5)]"
                                            : "bg-forge-green/80"
                                    )}
                                    style={{ width: `${system.gpuUsage}%` }}
                                ></div>
                            </div>
                        </div>

                        {/* Utilization % */}
                        <div className="mt-3 flex justify-between items-center">
                            <span className="text-xs text-gray-500 font-telemetry">Utilization</span>
                            <span className={cn(
                                "text-sm font-bold font-telemetry",
                                isTraining ? "text-forge-orange" : "text-white"
                            )}>
                                {system.gpuUsage}%
                            </span>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 overflow-auto relative p-6">
                {children}
            </main>
        </div>
    );
}
