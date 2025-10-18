import React from "react";

function Feature({ title, desc }) {
  return (
    <div className="rounded-2xl bg-white border border-slate-200 p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      <p className="text-slate-600 mt-2">{desc}</p>
    </div>
  );
}

export default Feature;
