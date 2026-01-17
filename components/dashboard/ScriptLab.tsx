"use client";

import React, { useState, useEffect, useCallback } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import Editor from "@monaco-editor/react";
import {
    Code2,
    Copy,
    Download,
    RefreshCw,
    Lock,
    Unlock,
    Play,
    FileCode,
    FileText,
    Check
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useFinetuner } from "@/context/FinetunerContext";
import { generateScript } from "@/lib/orchestrator/scriptGenerator";
import { getProvider } from "@/lib/orchestrator/providers";

export function ScriptLab() {
    const { config, getCurrentProvider } = useFinetuner();
    const provider = getCurrentProvider();

    const [isManualMode, setIsManualMode] = useState(false);
    const [manualCode, setManualCode] = useState("");
    const [copied, setCopied] = useState(false);

    // Generate script based on current config
    const generatedScript = generateScript(config);

    // Determine displayed code
    const displayedCode = isManualMode ? manualCode : generatedScript.code;
    const language = generatedScript.language;

    // When entering manual mode, snapshot current generated code
    const handleToggleManual = () => {
        if (!isManualMode) {
            setManualCode(generatedScript.code);
        }
        setIsManualMode(!isManualMode);
    };

    // Sync manual code with generated when not in manual mode
    useEffect(() => {
        if (!isManualMode) {
            setManualCode(generatedScript.code);
        }
    }, [generatedScript.code, isManualMode]);

    // Copy to clipboard
    const handleCopy = useCallback(async () => {
        await navigator.clipboard.writeText(displayedCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }, [displayedCode]);

    // Download file
    const handleDownload = useCallback(() => {
        const blob = new Blob([displayedCode], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = generatedScript.filename;
        a.click();
        URL.revokeObjectURL(url);
    }, [displayedCode, generatedScript.filename]);

    // Reset to generated
    const handleReset = () => {
        setManualCode(generatedScript.code);
    };

    return (
        <div className="h-full flex flex-col gap-4">
            {/* Header Bar */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Code2 className="text-forge-orange" /> Script Lab
                    </h2>

                    {/* Provider & File Info */}
                    <div className="flex items-center gap-2">
                        <span className={cn(
                            "text-xs font-telemetry px-2 py-1 rounded-full border",
                            "text-forge-orange bg-forge-orange/10 border-forge-orange/20"
                        )}>
                            {provider.name}
                        </span>
                        <span className="text-xs text-gray-500 flex items-center gap-1 font-telemetry">
                            {language === 'python' ? <FileCode className="h-3 w-3" /> : <FileText className="h-3 w-3" />}
                            {generatedScript.filename}
                        </span>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                    {/* Manual Mode Toggle */}
                    <button
                        onClick={handleToggleManual}
                        className={cn(
                            "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border",
                            isManualMode
                                ? "bg-forge-amber/10 text-forge-amber border-forge-amber/30"
                                : "bg-glass-200 text-gray-400 border-glass-border hover:text-white"
                        )}
                    >
                        {isManualMode ? <Unlock className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                        {isManualMode ? "Manual Mode" : "Live Sync"}
                    </button>

                    {/* Reset Button (only in manual mode) */}
                    {isManualMode && (
                        <button
                            onClick={handleReset}
                            className="p-2 rounded-lg bg-glass-200 text-gray-400 hover:text-white border border-glass-border transition-all"
                            title="Reset to generated script"
                        >
                            <RefreshCw className="h-4 w-4" />
                        </button>
                    )}

                    {/* Copy Button */}
                    <button
                        onClick={handleCopy}
                        className={cn(
                            "p-2 rounded-lg border transition-all",
                            copied
                                ? "bg-forge-green/10 text-forge-green border-forge-green/30"
                                : "bg-glass-200 text-gray-400 hover:text-white border-glass-border"
                        )}
                        title="Copy to clipboard"
                    >
                        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </button>

                    {/* Download Button */}
                    <button
                        onClick={handleDownload}
                        className="p-2 rounded-lg bg-glass-200 text-gray-400 hover:text-white border border-glass-border transition-all"
                        title="Download script"
                    >
                        <Download className="h-4 w-4" />
                    </button>
                </div>
            </div>

            {/* Status Bar */}
            <div className="flex items-center gap-4 text-xs font-telemetry text-gray-500 px-2">
                <span className="flex items-center gap-1">
                    <span className={cn(
                        "w-2 h-2 rounded-full",
                        isManualMode ? "bg-forge-amber" : "bg-forge-green animate-pulse"
                    )} />
                    {isManualMode ? "Editing manually" : "Auto-syncing with GUI"}
                </span>
                <span className="text-gray-600">|</span>
                <span>Model: <span className="text-gray-400">{config.model}</span></span>
                <span className="text-gray-600">|</span>
                <span>LoRA r={config.loraRank}, α={config.loraAlpha}</span>
                <span className="text-gray-600">|</span>
                <span>Quant: {config.quantization === 'none' ? 'FP16' : config.quantization.toUpperCase()}</span>
            </div>

            {/* Monaco Editor */}
            <GlassCard className="flex-1 p-0 overflow-hidden">
                <Editor
                    height="100%"
                    language={language}
                    value={displayedCode}
                    onChange={(value) => {
                        if (isManualMode && value !== undefined) {
                            setManualCode(value);
                        }
                    }}
                    theme="vs-dark"
                    options={{
                        readOnly: !isManualMode,
                        minimap: { enabled: true, scale: 0.8 },
                        fontSize: 13,
                        fontFamily: "'JetBrains Mono', monospace",
                        lineNumbers: "on",
                        scrollBeyondLastLine: false,
                        automaticLayout: true,
                        padding: { top: 16, bottom: 16 },
                        renderLineHighlight: "all",
                        cursorBlinking: "smooth",
                        smoothScrolling: true,
                        wordWrap: "off",
                        tabSize: 4,
                        scrollbar: {
                            vertical: "visible",
                            horizontal: "visible",
                            verticalScrollbarSize: 8,
                            horizontalScrollbarSize: 8,
                        },
                    }}
                    beforeMount={(monaco) => {
                        // Define Forge-Local theme
                        monaco.editor.defineTheme("forge-local", {
                            base: "vs-dark",
                            inherit: true,
                            rules: [
                                { token: "comment", foreground: "6b7280", fontStyle: "italic" },
                                { token: "keyword", foreground: "FF6B00" },
                                { token: "string", foreground: "22C55E" },
                                { token: "number", foreground: "FFA500" },
                                { token: "type", foreground: "60A5FA" },
                            ],
                            colors: {
                                "editor.background": "#0F0F0F",
                                "editor.foreground": "#E5E5E5",
                                "editor.lineHighlightBackground": "#1A1A1A",
                                "editor.selectionBackground": "#FF6B0040",
                                "editorCursor.foreground": "#FF6B00",
                                "editorLineNumber.foreground": "#4B5563",
                                "editorLineNumber.activeForeground": "#FF6B00",
                                "editor.selectionHighlightBackground": "#FF6B0020",
                            },
                        });
                    }}
                    onMount={(editor, monaco) => {
                        // Apply custom theme
                        monaco.editor.setTheme("forge-local");
                    }}
                />
            </GlassCard>

            {/* Footer Tips */}
            <div className="flex items-center justify-between text-xs text-gray-600 px-2">
                <span>
                    {isManualMode
                        ? "💡 Tip: Your edits are preserved. Toggle off to see live-generated code."
                        : "💡 Tip: Adjust sliders in Mission Control to update this script in real-time."
                    }
                </span>
                <span className="font-telemetry">
                    {displayedCode.split('\n').length} lines
                </span>
            </div>
        </div>
    );
}
