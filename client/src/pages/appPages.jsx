import React from 'react';
import AppLayout from '../components/Layout';
import Panel from '../components/ui/Panel';
import StatCard from '../components/ui/StatCard';
import Tabs from '../components/ui/Tabs';
import MicButton from '../features/speaking/components/MicButton';
import { LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts';

export function HomeLanding() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-sky-100 via-white to-blue-100">
            <div className="relative overflow-hidden">
                <div className="mx-auto max-w-7xl px-6 pt-16 pb-20 text-center">
                    <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-slate-900">
                        Prepare for IELTS with <span className="text-blue-600">AI</span>
                    </h1>
                    <p className="mt-6 text-lg text-slate-600 max-w-2xl mx-auto">
                        Speaking feedback, full test simulations, and personalized guidance to reach your target band.
                    </p>
                    <div className="mt-8 flex justify-center gap-4">
                        <a href="/register" className="px-6 py-3 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700">Get Started</a>
                        <a href="/about" className="px-6 py-3 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50">Learn More</a>
                    </div>
                </div>
                <div className="mx-auto max-w-7xl grid grid-cols-1 md:grid-cols-3 gap-6 px-6 pb-20">
                    <Feature title="AI Speaking Coach" desc="Real-time feedback on fluency, pronunciation, and coherence." />
                    <Feature title="Full Test Simulator" desc="Practice Listening, Reading, Writing, and Speaking in one flow." />
                    <Feature title="Performance Insights" desc="Track improvement and get personalized next steps." />
                </div>
            </div>
        </div>
    );
}

function Feature({ title, desc }) {
    return (
        <div className="rounded-2xl bg-white border border-slate-200 p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
            <p className="text-slate-600 mt-2">{desc}</p>
        </div>
    );
}

export function DashboardView() {
    return (
        <AppLayout>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <StatCard title="Overall Band" value="6.5" accent="bg-blue-100 text-blue-700" />
                <StatCard title="Practice Sessions" value="42" accent="bg-emerald-100 text-emerald-700" />
                <StatCard title="Weekly Streak" value="7 days" accent="bg-amber-100 text-amber-700" />
            </div>
            <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
                <SectionCard
                    title="Speaking"
                    desc="Practice with real-time AI feedback on fluency and coherence."
                    to="/speaking"
                    gradient="from-blue-600 to-indigo-600"
                />
                <SectionCard
                    title="Listening"
                    desc="Timed audio tasks with detailed explanations."
                    to="/tests"
                    gradient="from-emerald-600 to-teal-600"
                />
                <SectionCard
                    title="Reading"
                    desc="Passages and MCQs with tracking and review."
                    to="/mcq"
                    gradient="from-amber-600 to-orange-600"
                />
            </div>
            <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Panel title="AI Tips">
                    <ul className="list-disc pl-5 text-sm text-slate-700 space-y-2">
                        <li>Slow down slightly to improve clarity.</li>
                        <li>Use linking words to improve coherence.</li>
                        <li>Paraphrase the question before answering.</li>
                    </ul>
                </Panel>
                <Panel title="Progress Chart">
                    <div className="h-56 rounded-lg bg-white">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={[{name:'W1',score:5.5},{name:'W2',score:6.0},{name:'W3',score:6.5},{name:'W4',score:6.5}]}> 
                                <Line type="monotone" dataKey="score" stroke="#2563eb" strokeWidth={2} />
                                <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis domain={[4,9]} />
                                <Tooltip />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </Panel>
            </div>
        </AppLayout>
    );
}

function SectionCard({ title, desc, to, gradient }) {
    return (
        <a href={to} className={`group rounded-2xl p-1 bg-gradient-to-r ${gradient} shadow-md hover:shadow-xl transition-shadow animate-fade-in`}>
            <div className="rounded-2xl h-full w-full bg-white/90 backdrop-blur p-5 flex items-start gap-4">
                <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-white/60 to-white/20 grid place-items-center shadow-inner">
                    <span className="text-lg font-bold text-slate-700">{title[0]}</span>
                </div>
                <div className="flex-1">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
                        <span className="text-xs px-2 py-1 rounded-full bg-black/5 text-slate-600 group-hover:bg-black/10">Start</span>
                    </div>
                    <p className="text-sm text-slate-600 mt-1">{desc}</p>
                    <div className="mt-4 h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-black/10 w-1/3 group-hover:w-1/2 transition-[width] duration-500" />
                    </div>
                </div>
            </div>
        </a>
    );
}

export function SpeakingPracticeView() {
    return (
        <AppLayout>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Panel title="Question">
                    <p className="text-slate-700">Describe a memorable journey you have taken. You should say where you went, how you traveled, what you saw and did, and explain why it was memorable.</p>
                </Panel>
                <Panel title="Recorder" className="lg:col-span-2">
                    <div className="flex items-center gap-4">
                        <MicButton state="idle" />
                        <div className="flex-1 h-12 rounded-md bg-gradient-to-r from-blue-100 via-sky-100 to-white relative overflow-hidden">
                            <div className="absolute inset-0 opacity-50 animate-[pulse_2s_ease-in-out_infinite] bg-[repeating-linear-gradient(90deg,transparent,transparent_10px,rgba(37,99,235,0.2)_10px,rgba(37,99,235,0.2)_20px)]" />
                        </div>
                        <span className="text-slate-600">Timer: 01:30</span>
                    </div>
                    <div className="mt-6">
                        <h4 className="text-sm font-semibold text-slate-700 mb-2">AI Feedback</h4>
                        <div className="rounded-lg border border-slate-200 p-4 bg-white text-sm text-slate-700">
                            Fluency: Good pace. Pronunciation: Clear but watch vowels. Coherence: Strong structure.
                        </div>
                    </div>
                </Panel>
            </div>
        </AppLayout>
    );
}

export function FullTestSimulatorView() {
    return (
        <AppLayout>
            <div className="rounded-2xl bg-white border border-slate-200 p-4 shadow-sm">
                <Tabs
                    tabs={[
                        { label: 'Listening', content: <div className="h-64 flex items-center justify-center text-slate-500 text-sm">Listening mock test here</div> },
                        { label: 'Reading', content: <div className="h-64 flex items-center justify-center text-slate-500 text-sm">Reading mock test here</div> },
                        { label: 'Writing', content: <div className="h-64 flex items-center justify-center text-slate-500 text-sm">Writing mock test here</div> },
                        { label: 'Speaking', content: <div className="h-64 flex items-center justify-center text-slate-500 text-sm">Speaking mock test here</div> },
                    ]}
                />
            </div>
        </AppLayout>
    );
}

export function MCQPracticeView() {
    return (
        <AppLayout>
            <Panel title="MCQ Practice" actions={<span className="text-xs text-slate-500">Time: 09:41</span>}>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden mb-4">
                    <div className="h-full bg-blue-600 w-1/3" />
                </div>
                <p className="text-slate-700">Q5. Which of the following best describes the main idea of the passage?</p>
                <div className="mt-4 space-y-2">
                    {['A','B','C','D'].map((opt) => (
                        <label key={opt} className="flex items-center gap-3 p-3 border rounded-lg bg-white hover:bg-slate-50">
                            <input type="radio" name="q1" />
                            <span className="text-sm text-slate-700">Option {opt} placeholder text</span>
                        </label>
                    ))}
                </div>
                <div className="mt-6 flex items-center justify-between">
                    <button className="px-4 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50">Previous</button>
                    <button className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700">Next</button>
                </div>
            </Panel>
        </AppLayout>
    );
}

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

export default HomeLanding;


