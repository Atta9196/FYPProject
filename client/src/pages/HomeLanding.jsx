import React from "react";
import Feature from "../components/Feature";

function HomeLanding() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-100 via-white to-blue-100">
      <div className="relative overflow-hidden">
        <div className="mx-auto max-w-7xl px-6 pt-16 pb-20 text-center">
          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-slate-900">
            Prepare for IELTS with <span className="text-blue-600">AI</span>
          </h1>
          <p className="mt-6 text-lg text-slate-600 max-w-2xl mx-auto">
            Speaking feedback, full test simulations, and personalized guidance
            to reach your target band.
          </p>
          <div className="mt-8 flex justify-center gap-4">
            <a
              href="/register"
              className="px-6 py-3 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700"
            >
              Get Started
            </a>
            <a
              href="/about"
              className="px-6 py-3 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
            >
              Learn More
            </a>
          </div>
        </div>
        <div className="mx-auto max-w-7xl grid grid-cols-1 md:grid-cols-3 gap-6 px-6 pb-20">
          <Feature
            title="AI Speaking Coach"
            desc="Real-time feedback on fluency, pronunciation, and coherence."
          />
          <Feature
            title="Full Test Simulator"
            desc="Practice Listening, Reading, Writing, and Speaking in one flow."
          />
          <Feature
            title="Performance Insights"
            desc="Track improvement and get personalized next steps."
          />
        </div>
      </div>
    </div>
  );
}

export default HomeLanding;
