import React from "react";
import AppLayout from "../components/Layout";
import Panel from "../components/ui/Panel";
import StatCard from "../components/ui/StatCard";
import SectionCard from "../components/SectionCard";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
export function PerformanceDashboardView() {
    return (
        <AppLayout>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Panel title="Band Progress">
                    <div className="h-48">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={[{name:'Jan',score:5.5},{name:'Feb',score:6.0},{name:'Mar',score:6.5},{name:'Apr',score:7.0}]}> 
                                <Line type="monotone" dataKey="score" stroke="#2563eb" strokeWidth={2} />
                                <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis domain={[4,9]} />
                                <Tooltip />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </Panel>
                <Panel title="Section Scores">
                    <div className="h-48">
                        <ResponsiveContainer width="100%" height="100%">
                            <RadarChart data={[{subject:'Listening',A:6.5},{subject:'Reading',A:6.0},{subject:'Writing',A:6.0},{subject:'Speaking',A:6.5}]}> 
                                <PolarGrid />
                                <PolarAngleAxis dataKey="subject" />
                                <PolarRadiusAxis domain={[0,9]} />
                                <Radar name="Band" dataKey="A" stroke="#0ea5e9" fill="#0ea5e9" fillOpacity={0.3} />
                                <Tooltip />
                            </RadarChart>
                        </ResponsiveContainer>
                    </div>
                </Panel>
                <Panel title="Suggested Next Steps">
                    <ul className="list-disc pl-5 text-sm text-slate-700 space-y-2">
                        <li>Practice Speaking Part 2 monologues</li>
                        <li>Focus on Listening map completion tasks</li>
                        <li>Write Task 1 summaries within 20 minutes</li>
                    </ul>
                </Panel>
            </div>
        </AppLayout>
    );
}