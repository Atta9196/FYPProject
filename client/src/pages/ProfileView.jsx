import React from "react";
import AppLayout from "../components/Layout";
import Panel from "../components/ui/Panel";
import StatCard from "../components/ui/StatCard";
import SectionCard from "../components/SectionCard";
export function ProfileView() {
    return (
        <AppLayout>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Panel title="Profile">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-slate-200" />
                        <div className="space-y-2 text-sm">
                            <div className="grid grid-cols-3 items-center gap-2">
                                <label className="text-slate-600">Name</label>
                                <input className="col-span-2 p-2 border rounded-md" placeholder="Jane Doe" />
                            </div>
                            <div className="grid grid-cols-3 items-center gap-2">
                                <label className="text-slate-600">Email</label>
                                <input className="col-span-2 p-2 border rounded-md" placeholder="jane@example.com" />
                            </div>
                        </div>
                    </div>
                    <div className="mt-4 flex gap-3">
                        <button className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700">Save</button>
                        <button className="px-4 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50">Upload Picture</button>
                    </div>
                </Panel>
                <Panel title="Security">
                    <div className="space-y-3 text-sm">
                        <input className="w-full p-2 border rounded-md" placeholder="Current Password" type="password" />
                        <input className="w-full p-2 border rounded-md" placeholder="New Password" type="password" />
                        <input className="w-full p-2 border rounded-md" placeholder="Confirm New Password" type="password" />
                        <button className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700">Change Password</button>
                    </div>
                </Panel>
                <Panel title="Preferences">
                    <div className="flex items-center justify-between">
                        <span>Dark Mode</span>
                        <label className="inline-flex items-center cursor-pointer">
                            <input type="checkbox" className="sr-only peer" />
                            <div className="w-11 h-6 bg-slate-200 rounded-full peer-checked:bg-blue-600 relative after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:h-5 after:w-5 after:rounded-full after:transition-all peer-checked:after:translate-x-5" />
                        </label>
                    </div>
                </Panel>
            </div>
        </AppLayout>
    );
}
