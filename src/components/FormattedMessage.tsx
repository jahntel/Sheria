/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import CitationBadge from "./CitationBadge.tsx";
import { LawCitation } from "../types";

interface FormattedMessageProps {
  content: string;
  citations?: LawCitation[];
}

export default function FormattedMessage({ content, citations = [] }: FormattedMessageProps) {
  if (!content) return null;

  // Matches pattern [Citation: Section 5 of the Employment Act, 2007]
  const regex = /\[Citation:\s*([^\]]+)\]/g;
  const parts: Array<{ type: "text" | "citation"; value: string }> = [];
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(content)) !== null) {
    const matchIndex = match.index;
    const citationLabel = match[1];

    // Push preceding text
    if (matchIndex > lastIndex) {
      parts.push({
        type: "text",
        value: content.substring(lastIndex, matchIndex),
      });
    }

    // Push citation
    parts.push({
      type: "citation",
      value: citationLabel,
    });

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < content.length) {
    parts.push({
      type: "text",
      value: content.substring(lastIndex),
    });
  }

  if (parts.length === 0) {
    return <div className="whitespace-pre-wrap leading-relaxed">{renderBoldAndBullets(content)}</div>;
  }

  return (
    <div className="whitespace-pre-wrap leading-relaxed text-slate-700">
      {parts.map((part, idx) => {
        if (part.type === "citation") {
          return (
            <span key={idx} className="inline-block mx-0.5 align-middle">
              <CitationBadge label={part.value} citations={citations} />
            </span>
          );
        } else {
          return <React.Fragment key={idx}>{renderBoldAndBullets(part.value)}</React.Fragment>;
        }
      })}
    </div>
  );
}

// Simple helper to parse bold text **like this** and render bulleted highlights nicely
function renderBoldAndBullets(text: string) {
  const lines = text.split("\n");
  return lines.map((line, lineIdx) => {
    // Check if line starts with bullet marker
    const isBullet = line.trim().startsWith("- ") || line.trim().startsWith("* ");
    const cleanLine = isBullet ? line.trim().replace(/^[-*]\s+/, "") : line;

    // Bold text parsing (**bold**)
    const boldRegex = /\*\*([^*]+)\*\*/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = boldRegex.exec(cleanLine)) !== null) {
      const matchIndex = match.index;
      if (matchIndex > lastIndex) {
        parts.push(cleanLine.substring(lastIndex, matchIndex));
      }
      parts.push(
        <strong key={matchIndex} className="font-bold text-slate-950">
          {match[1]}
        </strong>
      );
      lastIndex = boldRegex.lastIndex;
    }

    if (lastIndex < cleanLine.length) {
      parts.push(cleanLine.substring(lastIndex));
    }

    const content = parts.length > 0 ? parts : cleanLine;

    if (isBullet) {
      return (
        <div key={lineIdx} className="flex items-start gap-2 ml-4 my-1">
          <span className="text-emerald-600 mt-1.5 flex-shrink-0 w-1.5 h-1.5 rounded-full bg-emerald-600" />
          <span className="text-slate-700 text-sm md:text-base leading-relaxed">{content}</span>
        </div>
      );
    }

    return (
      <p key={lineIdx} className="my-1 text-sm md:text-base leading-relaxed text-slate-700 min-h-[1.2rem]">
        {content}
      </p>
    );
  });
}
