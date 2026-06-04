import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import AppLayout from "../components/Layout";
import Panel from "../components/ui/Panel";
import { useAuth } from "../contexts/AuthContext";

const faqItems = [
    {
        question: "How do I start Speaking practice?",
        answer:
            "Open Speaking Practice, choose your mode, click the microphone, and submit your response for AI evaluation and band scoring."
    },
    {
        question: "Can I take a complete IELTS mock test?",
        answer:
            "Yes. Go to Full Test Simulator to complete Listening, Reading, Writing, and Speaking in one guided flow."
    },
    {
        question: "Why is my audio not recording?",
        answer:
            "Check microphone permissions in your browser, ensure no other app is locking your mic, then refresh the page and try again."
    },
    {
        question: "How is my band score calculated?",
        answer:
            "Band scoring is based on module-specific evaluation. Speaking and Writing use AI-based evaluation, while Reading and Listening map score accuracy to IELTS bands."
    },
    {
        question: "How quickly does support reply?",
        answer:
            "Standard support requests are reviewed within 24 hours. High-priority platform issues are handled faster."
    }
];

export function SupportView() {
    const { user } = useAuth();
    const [query, setQuery] = useState("");
    const [formData, setFormData] = useState({
        email: user?.email || "",
        category: "Technical issue",
        priority: "Normal",
        subject: "",
        message: ""
    });
    const [formState, setFormState] = useState({
        loading: false,
        success: "",
        error: ""
    });

    const filteredFaqs = useMemo(() => {
        const key = query.trim().toLowerCase();
        if (!key) return faqItems;
        return faqItems.filter((item) =>
            `${item.question} ${item.answer}`.toLowerCase().includes(key)
        );
    }, [query]);

    const handleFormChange = (field, value) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
        if (formState.error) {
            setFormState((prev) => ({ ...prev, error: "" }));
        }
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setFormState({ loading: false, success: "", error: "" });

        if (!formData.email.trim()) {
            setFormState({ loading: false, success: "", error: "Please enter your email." });
            return;
        }
        if (!formData.subject.trim()) {
            setFormState({ loading: false, success: "", error: "Please enter a subject." });
            return;
        }
        if (!formData.message.trim() || formData.message.trim().length < 15) {
            setFormState({
                loading: false,
                success: "",
                error: "Please provide more detail (minimum 15 characters)."
            });
            return;
        }

        setFormState({ loading: true, success: "", error: "" });
        await new Promise((resolve) => setTimeout(resolve, 650));

        setFormState({
            loading: false,
            success: "Support request submitted. Our team will contact you soon.",
            error: ""
        });
        setFormData((prev) => ({
            ...prev,
            subject: "",
            message: ""
        }));
    };

    return (
        <AppLayout>
            <div className="space-y-6 md:space-y-8">
                <div className="rounded-2xl bg-gradient-to-r from-sky-700 via-blue-700 to-indigo-700 p-6 md:p-8 text-white shadow-lg">
                    <h1 className="text-2xl md:text-3xl font-extrabold">Support Center</h1>
                    <p className="mt-2 text-blue-100 max-w-3xl">
                        Get fast help for account, practice modules, evaluation, and technical issues.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
                        <p className="text-xs text-slate-500 dark:text-slate-400">Average response</p>
                        <p className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">&lt; 24 hours</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
                        <p className="text-xs text-slate-500 dark:text-slate-400">Support availability</p>
                        <p className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">Mon-Sat</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
                        <p className="text-xs text-slate-500 dark:text-slate-400">Issue tracking</p>
                        <p className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">Ticket-based</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                    <Panel title="Frequently Asked Questions" className="xl:col-span-2">
                        <div className="space-y-4">
                            <input
                                type="text"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Search help topics..."
                                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />

                            {filteredFaqs.length === 0 ? (
                                <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 p-4 text-sm text-slate-600 dark:text-slate-300">
                                    No matching FAQ found. Please submit a support request.
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {filteredFaqs.map((item) => (
                                        <details
                                            key={item.question}
                                            className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4"
                                        >
                                            <summary className="cursor-pointer font-semibold text-slate-900 dark:text-slate-100">
                                                {item.question}
                                            </summary>
                                            <p className="mt-3 text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                                                {item.answer}
                                            </p>
                                        </details>
                                    ))}
                                </div>
                            )}
                        </div>
                    </Panel>

                    <Panel title="Submit a Request">
                        <form onSubmit={handleSubmit} className="space-y-3">
                            <input
                                type="email"
                                value={formData.email}
                                onChange={(e) => handleFormChange("email", e.target.value)}
                                placeholder="Your email"
                                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <select
                                value={formData.category}
                                onChange={(e) => handleFormChange("category", e.target.value)}
                                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option>Technical issue</option>
                                <option>Billing or account</option>
                                <option>Band score concern</option>
                                <option>Feature request</option>
                            </select>
                            <select
                                value={formData.priority}
                                onChange={(e) => handleFormChange("priority", e.target.value)}
                                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option>Low</option>
                                <option>Normal</option>
                                <option>High</option>
                                <option>Critical</option>
                            </select>
                            <input
                                type="text"
                                value={formData.subject}
                                onChange={(e) => handleFormChange("subject", e.target.value)}
                                placeholder="Subject"
                                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <textarea
                                value={formData.message}
                                onChange={(e) => handleFormChange("message", e.target.value)}
                                placeholder="Describe your issue clearly..."
                                rows={5}
                                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                            />

                            {formState.error ? (
                                <p className="text-xs text-red-600">{formState.error}</p>
                            ) : null}
                            {formState.success ? (
                                <p className="text-xs text-emerald-700">{formState.success}</p>
                            ) : null}

                            <button
                                type="submit"
                                disabled={formState.loading}
                                className="w-full rounded-lg bg-blue-600 text-white text-sm font-semibold px-4 py-2.5 hover:bg-blue-700 disabled:opacity-70 disabled:cursor-not-allowed transition-colors"
                            >
                                {formState.loading ? "Submitting..." : "Submit Support Request"}
                            </button>
                        </form>
                    </Panel>
                </div>

                <Panel title="Quick Help">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                        <Link
                            to="/dashboard"
                            className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 p-3 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                            Go to Dashboard
                        </Link>
                        <Link
                            to="/tests"
                            className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 p-3 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                            Open Full Test Simulator
                        </Link>
                        <a
                            href="mailto:support@ieltsplatform.com?subject=IELTS%20Support%20Request"
                            className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 p-3 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                            Contact by Email
                        </a>
                    </div>
                </Panel>
            </div>
        </AppLayout>
    );
}