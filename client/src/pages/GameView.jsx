import React from "react";
import AppLayout from "../components/Layout";
import Panel from "../components/ui/Panel";
import WebGLGameEmbed from "../components/WebGLGameEmbed";

export function GameView() {
  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
                IELTS Game
              </h1>
              <p className="text-sm md:text-base text-slate-600 mt-1">
                Interactive games designed to make IELTS practice more fun and engaging.
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Module Status
              </p>
              <p className="text-sm font-semibold text-emerald-600">
                WebGL — Live
              </p>
            </div>
          </div>
        </div>

        {/* Game Area */}
        <Panel title="Game Area">
          <WebGLGameEmbed />
        </Panel>
      </div>
    </AppLayout>
  );
}
