import React from "react";
import { Link } from "react-router-dom";

function SectionCard({ title, description, link, buttonText, icon }) {
  return (
    <div className="group rounded-2xl bg-white border border-slate-200 p-6 shadow-sm hover:shadow-md transition-all duration-200">
      <div className="flex items-start gap-4">
        {icon && (
          <div className="text-3xl">{icon}</div>
        )}
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-slate-900 mb-2">{title}</h3>
          <p className="text-sm text-slate-600 mb-4">{description}</p>
          <Link
            to={link}
            className="inline-flex items-center px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            {buttonText}
          </Link>
        </div>
      </div>
    </div>
  );
}

export default SectionCard;
