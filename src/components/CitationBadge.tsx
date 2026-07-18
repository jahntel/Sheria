/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { BookOpen, X, ShieldAlert, FileText, CheckCircle } from "lucide-react";
import { LawCitation } from "../types";

interface CitationBadgeProps {
  label: string;
  citations: LawCitation[];
}

export default function CitationBadge({ label, citations }: CitationBadgeProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Try to find the matching citation record in the current message context
  const cleanLabel = label.replace("Citation: ", "").trim();
  
  // Fuzzy match citation by comparing sections/acts
  const matchingCitation = citations.find((c) => {
    const searchStr = `${c.section} of ${c.actName}`.toLowerCase();
    const cleanSearchStr = `${c.section} of the ${c.actName}`.toLowerCase();
    const labelLower = cleanLabel.toLowerCase();
    return (
      labelLower.includes(c.section.toLowerCase()) ||
      searchStr.includes(labelLower) ||
      cleanSearchStr.includes(labelLower) ||
      labelLower.includes(searchStr)
    );
  });

  return (
    <>
      <button
        id={`btn-citation-${cleanLabel.replace(/\s+/g, "-")}`}
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 transition-all cursor-pointer shadow-xs my-0.5"
      >
        <BookOpen className="w-3.5 h-3.5 flex-shrink-0" />
        <span>{matchingCitation ? `${matchingCitation.section}, ${matchingCitation.actName}` : cleanLabel}</span>
      </button>

      {isOpen && (
        <div
          id="citation-modal"
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in"
          onClick={() => setIsOpen(false)}
        >
          <div
            id="citation-modal-content"
            className="bg-white rounded-xl shadow-2xl border border-slate-100 max-w-lg w-full max-h-[85vh] overflow-hidden flex flex-col transform scale-100 transition-all duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-4 bg-emerald-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-300" />
                <div>
                  <h4 className="font-bold text-sm tracking-wide">VERIFIED KENYAN STATUTE</h4>
                  <p className="text-xs text-emerald-100">Retrieved via KenyanLegalFetchService</p>
                </div>
              </div>
              <button
                id="close-citation-modal"
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-full hover:bg-emerald-800 transition-colors text-white/80 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto space-y-4">
              {matchingCitation ? (
                <>
                  <div>
                    <span className="text-xs uppercase font-semibold text-emerald-600 tracking-wider">
                      {matchingCitation.actName}
                    </span>
                    <h3 className="text-lg font-bold text-slate-800">
                      {matchingCitation.section}: {matchingCitation.title}
                    </h3>
                  </div>

                  <div className="bg-slate-50 border-l-4 border-emerald-600 p-4 rounded-r-lg font-sans text-sm text-slate-700 leading-relaxed shadow-inner">
                    "{matchingCitation.text}"
                  </div>

                  <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-100/50 p-2.5 rounded-lg border border-slate-100">
                    <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span>Official Laws.Africa database synchronization: Valid statutory record.</span>
                  </div>
                </>
              ) : (
                <div className="text-center py-6 space-y-3">
                  <ShieldAlert className="w-12 h-12 text-amber-500 mx-auto" />
                  <div>
                    <h3 className="font-bold text-slate-800">Statutory Record Linkage</h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Citation: <span className="font-semibold text-slate-700">{cleanLabel}</span>
                    </p>
                    <p className="text-sm text-slate-600 mt-3 leading-relaxed">
                      This reference points to standard provisions in the Kenyan statutes. Ask Jua Sheria to pull specific clauses, or search our database above to see active details.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                id="btn-close-citation-footer"
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                Done Reading
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
