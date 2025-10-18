import React from "react";
import AppLayout from "../components/Layout";
import Panel from "../components/ui/Panel";
import StatCard from "../components/ui/StatCard";
import SectionCard from "../components/SectionCard";
export function SupportView() {
    return (
        <AppLayout>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Panel title="FAQs" className="lg:col-span-2">
                    <div className="space-y-3 text-sm text-slate-700">
                        <details className="rounded-md border p-3 bg-white">
                            <summary className="font-medium text-slate-900">How do I start a speaking practice?</summary>
                            <p className="mt-2">Go to Speaking Practice, press Start, and answer the prompt. You’ll get AI feedback after.</p>
                        </details>
                        <details className="rounded-md border p-3 bg-white">
                            <summary className="font-medium text-slate-900">Can I take a full mock test?</summary>
                            <p className="mt-2">Yes, open Full Test Simulator to practice all four sections in one session.</p>
                        </details>
                    </div>
                </Panel>
                <Panel title="Contact Support">
                    <div className="space-y-3 text-sm">
                        <input className="w-full p-2 border rounded-md" placeholder="Your email" />
                        <textarea className="w-full p-2 border rounded-md h-24" placeholder="Describe your issue" />
                        <button className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700">Send</button>
                    </div>
                </Panel>
            </div>
        </AppLayout>
    );
}