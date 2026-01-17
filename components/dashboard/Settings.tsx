"use client";

import React, { useState } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { Save, Key, FolderOpen, Monitor, CheckCircle, XCircle, Loader2, Flame } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFinetuner } from "@/context/FinetunerContext";

export function SettingsPage() {
    const { settings, setSettings } = useFinetuner();
    const [saved, setSaved] = useState(false);
    const [testingKey, setTestingKey] = useState(false);
    const [keyStatus, setKeyStatus] = useState<"idle" | "valid" | "invalid">("idle");

    const handleChange = (key: keyof typeof settings, value: any) => {
        setSettings(key, value);
        setSaved(false);
        setKeyStatus("idle");
    };

    const handleSave = () => {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    const testConnection = async () => {
        setTestingKey(true);
        setTimeout(() => {
            setTestingKey(false);
            setKeyStatus(settings.hfToken.length > 5 ? "valid" : "invalid");
        }, 1500);
    };

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                <Flame className="text-forge-orange" />
                System Configuration
            </h2>

            {/* API Keys */}
            <GlassCard>
                <div className="flex items-center gap-3 mb-6 border-b border-glass-border pb-4">
                    <Key className="text-forge-amber" />
                    <h3 className="text-lg font-medium text-white">API Credentials</h3>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm text-gray-400 mb-2">Hugging Face Access Token</label>
                        <div className="flex gap-2">
                            <input
                                type="password"
                                placeholder="hf_..."
                                value={settings.hfToken}
                                onChange={(e) => handleChange("hfToken", e.target.value)}
                                className="flex-1 bg-glass-200 border border-glass-border rounded-lg px-4 py-2 text-white focus:outline-none focus:border-forge-orange"
                            />
                            <button
                                onClick={testConnection}
                                disabled={testingKey}
                                className="px-4 py-2 bg-glass-200 border border-glass-border rounded-lg text-sm text-white hover:bg-glass-300 transition-colors flex items-center gap-2 min-w-[100px] justify-center"
                            >
                                {testingKey ? <Loader2 className="h-4 w-4 animate-spin" /> :
                                    keyStatus === "valid" ? <CheckCircle className="h-4 w-4 text-forge-green" /> :
                                        keyStatus === "invalid" ? <XCircle className="h-4 w-4 text-forge-red" /> :
                                            "Test"}
                                {testingKey ? "Checking" : keyStatus === "valid" ? "Valid" : keyStatus === "invalid" ? "Invalid" : "Verify"}
                            </button>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm text-gray-400 mb-2">Weights & Biases API Key</label>
                        <input
                            type="password"
                            placeholder="wandb_..."
                            value={settings.wandbKey}
                            onChange={(e) => handleChange("wandbKey", e.target.value)}
                            className="w-full bg-glass-200 border border-glass-border rounded-lg px-4 py-2 text-white focus:outline-none focus:border-forge-orange"
                        />
                    </div>
                </div>
            </GlassCard>

            {/* Local Paths & Hardware */}
            <GlassCard>
                <div className="flex items-center gap-3 mb-6 border-b border-glass-border pb-4">
                    <FolderOpen className="text-forge-orange" />
                    <h3 className="text-lg font-medium text-white">Storage & Hardware</h3>
                </div>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm text-gray-400 mb-2">Checkpoints Output Directory</label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value="./checkpoints"
                                readOnly
                                className="flex-1 bg-glass-200 border border-glass-border rounded-lg px-4 py-2 text-white focus:outline-none font-telemetry text-sm opacity-60 cursor-not-allowed"
                            />
                        </div>
                        <p className="text-xs text-gray-500 mt-2">Default path configured in environment.</p>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-glass-200 rounded-lg border border-glass-border">
                        <div>
                            <div className="text-sm text-white font-medium">Hardware Acceleration</div>
                            <div className="text-xs text-gray-400">Enable CUDA/Tensor Cores for training</div>
                        </div>
                        <button
                            onClick={() => handleChange("useGpu", !settings.useGpu)}
                            className={cn(
                                "w-12 h-6 rounded-full transition-colors relative",
                                settings.useGpu ? "bg-forge-green" : "bg-gray-600"
                            )}
                        >
                            <div className={cn(
                                "absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform",
                                settings.useGpu ? "translate-x-6" : "translate-x-0"
                            )} />
                        </button>
                    </div>
                </div>
            </GlassCard>

            {/* Appearance */}
            <GlassCard>
                <div className="flex items-center gap-3 mb-6 border-b border-glass-border pb-4">
                    <Monitor className="text-forge-green" />
                    <h3 className="text-lg font-medium text-white">Interface</h3>
                </div>
                <div>
                    <label className="block text-sm text-gray-400 mb-3">Visual Theme</label>
                    <div className="grid grid-cols-2 gap-4">
                        <button
                            onClick={() => handleChange("theme", "tactical")}
                            className={cn(
                                "p-4 rounded-xl border text-left transition-all",
                                settings.theme === "tactical" ? "bg-forge-orange/20 border-forge-orange" : "bg-glass-100 border-glass-border hover:bg-glass-200"
                            )}
                        >
                            <div className="font-bold text-white mb-1">Tactical Obsidian</div>
                            <div className="text-xs text-gray-400">Deep grays, safety orange accents.</div>
                        </button>
                        <button
                            onClick={() => handleChange("theme", "minimal")}
                            className={cn(
                                "p-4 rounded-xl border text-left transition-all",
                                settings.theme === "minimal" ? "bg-white/10 border-white" : "bg-glass-100 border-glass-border hover:bg-glass-200"
                            )}
                        >
                            <div className="font-bold text-white mb-1">Minimal</div>
                            <div className="text-xs text-gray-400">Clean slate, monochrome, focused.</div>
                        </button>
                    </div>
                </div>
            </GlassCard>

            <div className="flex justify-end pt-4">
                <button
                    onClick={handleSave}
                    className="bg-forge-orange text-black font-bold px-8 py-3 rounded-xl flex items-center gap-2 hover:opacity-90 transition-opacity"
                >
                    <Save className="h-5 w-5" />
                    {saved ? "Settings Saved!" : "Save Changes"}
                </button>
            </div>
        </div>
    );
}
