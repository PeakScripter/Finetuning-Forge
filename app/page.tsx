"use client";

import React, { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { ModelSelector } from "@/components/dashboard/ModelSelector";
import { DatasetZone } from "@/components/dashboard/DatasetZone";
import { TrainingForge } from "@/components/dashboard/TrainingForge";
import { ScriptLab } from "@/components/dashboard/ScriptLab";
import { Arena } from "@/components/dashboard/Arena";
import { Metrics } from "@/components/dashboard/Metrics";
import { SettingsPage } from "@/components/dashboard/Settings";
import { motion, AnimatePresence } from "framer-motion";
import { Database, Flame } from "lucide-react";
import { useFinetuner } from "@/context/FinetunerContext";

export default function Home() {
  const [activeTab, setActiveTab] = useState("studio");
  const { config, training } = useFinetuner();
  const isTraining = training.status === "training";

  const tabTitles: Record<string, { title: string; description: string }> = {
    studio: {
      title: "Mission Control",
      description: "Configure model, provider, and training parameters.",
    },
    datasets: {
      title: "Dataset Management",
      description: "Manage your training and evaluation datasets.",
    },
    scriptlab: {
      title: "Script Lab",
      description: "View and edit the generated training script.",
    },
    training: {
      title: "The Forge",
      description: "Monitor real-time training metrics and GPU utilization.",
    },
    evaluation: {
      title: "Benchmarking Arena",
      description: "Compare model outputs and analyze qualitative performance.",
    },
    metrics: {
      title: "Performance Metrics",
      description: "Visualize and analyze key performance indicators.",
    },
    settings: {
      title: "System Settings",
      description: "Configure application settings and preferences.",
    },
  };

  const current = tabTitles[activeTab] || tabTitles.studio;

  return (
    <AppLayout activeTab={activeTab} onTabChange={setActiveTab}>
      <header className="mb-6 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-white mb-1 tracking-tight flex items-center gap-3">
            {isTraining && activeTab === "training" && (
              <Flame className="h-8 w-8 text-forge-orange pulse-active" />
            )}
            {current.title}
          </h1>
          <p className="text-gray-400 text-sm">{current.description}</p>
        </div>

        {isTraining && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-forge-orange/10 border border-forge-orange/30">
            <span className="w-2 h-2 rounded-full bg-forge-orange animate-pulse" />
            <span className="text-sm font-telemetry text-forge-orange">
              Training Active • Step {training.currentStep}/100
            </span>
          </div>
        )}
      </header>

      <div className="h-[calc(100vh-12rem)] overflow-hidden">
        <AnimatePresence mode="wait">
          {activeTab === "studio" && (
            <motion.div
              key="studio"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full"
            >
              <div className="md:col-span-2 h-full">
                <ModelSelector />
              </div>
              <div className="md:col-span-1 h-full">
                <DatasetZone />
              </div>
            </motion.div>
          )}

          {activeTab === "scriptlab" && (
            <motion.div
              key="scriptlab"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="h-full"
            >
              <ScriptLab />
            </motion.div>
          )}

          {activeTab === "training" && (
            <motion.div
              key="training"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="h-full"
            >
              <TrainingForge />
            </motion.div>
          )}

          {activeTab === "evaluation" && (
            <motion.div
              key="evaluation"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="h-full"
            >
              <Arena />
            </motion.div>
          )}

          {activeTab === "metrics" && (
            <motion.div
              key="metrics"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="h-full"
            >
              <Metrics />
            </motion.div>
          )}

          {activeTab === "settings" && (
            <motion.div
              key="settings"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="h-full overflow-y-auto pb-20"
            >
              <SettingsPage />
            </motion.div>
          )}

          {activeTab === "datasets" && (
            <motion.div
              key="datasets"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="h-full"
            >
              {config.dataset ? (
                <div className="h-full p-6">
                  <h2 className="text-2xl font-bold text-white mb-6">Data Management</h2>
                  <div className="grid grid-cols-1 gap-4">
                    <div className="bg-glass-200 border border-glass-border p-4 rounded-xl flex items-center justify-between group hover:border-forge-orange transition-all">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-forge-orange/10 rounded-lg text-forge-orange">
                          <Database className="h-6 w-6" />
                        </div>
                        <div>
                          <div className="font-bold text-white">{config.dataset}</div>
                          <div className="text-xs text-gray-400">JSONL • Active for Training</div>
                        </div>
                      </div>
                      <button className="text-sm text-forge-red hover:text-red-300 px-3 py-1 rounded bg-forge-red/10 border border-forge-red/20">
                        Unlink
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center max-w-md">
                    <div className="inline-block p-4 rounded-full bg-glass-200 mb-4">
                      <Database className="h-10 w-10 text-gray-400" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">No Datasets Found</h2>
                    <p className="text-gray-400 mb-6">You haven't imported any training data yet. Head over to Mission Control to ingest your JSONL files.</p>
                    <button
                      onClick={() => setActiveTab("studio")}
                      className="bg-forge-orange/10 text-forge-orange border border-forge-orange/30 font-bold px-6 py-2 rounded-lg hover:bg-forge-orange/20 transition-all"
                    >
                      Go to Mission Control
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AppLayout>
  );
}
