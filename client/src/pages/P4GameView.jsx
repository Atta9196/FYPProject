import React from "react";
import AppLayout from "../components/Layout";
import Panel from "../components/ui/Panel";

export function P4GameView() {
  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
                IELTS 4Ps Game
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
                Prototype — ready for future itch.io / WebGL integration
              </p>
            </div>
          </div>
        </div>

        {/* Game Area */}
        <Panel title="Game Area">
          <div className="aspect-video w-full rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 flex items-center justify-center text-center px-4">
            <div className="space-y-3 max-w-xl">
              <p className="text-base md:text-lg font-semibold text-slate-800">
                Game Placeholder
              </p>
              <p className="text-sm text-slate-600">
                This area will host the actual IELTS game, either embedded from{" "}
                <span className="font-semibold text-slate-800">itch.io</span> via{" "}
                <code className="px-1 py-0.5 rounded bg-slate-200 text-xs">
                  {'<iframe>'}
                </code>{" "}
                or a{" "}
                <span className="font-semibold text-slate-800">WebGL build</span>{" "}
                served from your static assets.
              </p>
              <p className="text-xs text-slate-500">
                When you integrate the real game, this placeholder should be replaced
                with the embed component and wired to update practice history +
                progress stats.
              </p>
            </div>
          </div>
        </Panel>
      </div>

    </AppLayout>
  );
}

