"use client";

import React from "react";

/**
 * Lightweight markdown renderer for chat messages.
 * Handles: bold, italic, code, code blocks, tables, lists, headers, links.
 */
export default function Markdown({ content }: { content: string }) {
  const blocks = parseBlocks(content);
  return <div>{blocks.map((block, i) => renderBlock(block, i))}</div>;
}

interface Block {
  type: "paragraph" | "heading" | "code" | "table" | "list" | "hr" | "blank";
  level?: number; // heading level
  lang?: string;
  lines: string[];
  ordered?: boolean;
}

function parseBlocks(text: string): Block[] {
  const lines = text.split("\n");
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Code block
    if (line.startsWith("```")) {
      const lang = line.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing ```
      blocks.push({ type: "code", lang, lines: codeLines });
      continue;
    }

    // Heading
    const headingMatch = line.match(/^(#{1,6})\s+(.+)/);
    if (headingMatch) {
      blocks.push({
        type: "heading",
        level: headingMatch[1].length,
        lines: [headingMatch[2]],
      });
      i++;
      continue;
    }

    // HR
    if (/^[-*_]{3,}\s*$/.test(line)) {
      blocks.push({ type: "hr", lines: [] });
      i++;
      continue;
    }

    // Table (starts with |)
    if (line.trimStart().startsWith("|")) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trimStart().startsWith("|")) {
        tableLines.push(lines[i]);
        i++;
      }
      blocks.push({ type: "table", lines: tableLines });
      continue;
    }

    // List
    if (/^[\s]*[-*+]\s/.test(line) || /^[\s]*\d+\.\s/.test(line)) {
      const listLines: string[] = [];
      const ordered = /^\s*\d+\./.test(line);
      while (
        i < lines.length &&
        (/^[\s]*[-*+]\s/.test(lines[i]) ||
          /^[\s]*\d+\.\s/.test(lines[i]) ||
          /^\s{2,}/.test(lines[i]))
      ) {
        listLines.push(lines[i]);
        i++;
      }
      blocks.push({ type: "list", lines: listLines, ordered });
      continue;
    }

    // Blank line
    if (line.trim() === "") {
      i++;
      continue;
    }

    // Paragraph (collect consecutive non-empty, non-special lines)
    const paraLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !lines[i].startsWith("```") &&
      !lines[i].startsWith("#") &&
      !lines[i].trimStart().startsWith("|") &&
      !/^[-*_]{3,}\s*$/.test(lines[i]) &&
      !/^[\s]*[-*+]\s/.test(lines[i]) &&
      !/^[\s]*\d+\.\s/.test(lines[i])
    ) {
      paraLines.push(lines[i]);
      i++;
    }
    if (paraLines.length > 0) {
      blocks.push({ type: "paragraph", lines: paraLines });
    }
  }

  return blocks;
}

function renderBlock(block: Block, key: number): React.ReactNode {
  switch (block.type) {
    case "heading": {
      const level = block.level || 1;
      const sizes: Record<number, number> = { 1: 20, 2: 17, 3: 15, 4: 14, 5: 13, 6: 12 };
      const headingStyle = {
        fontSize: sizes[level] || 14,
        fontWeight: 600 as const,
        margin: "16px 0 8px",
        color: "inherit" as const,
      };
      const content = renderInline(block.lines[0]);
      if (level === 1) return <h1 key={key} style={headingStyle}>{content}</h1>;
      if (level === 2) return <h2 key={key} style={headingStyle}>{content}</h2>;
      if (level === 3) return <h3 key={key} style={headingStyle}>{content}</h3>;
      if (level === 4) return <h4 key={key} style={headingStyle}>{content}</h4>;
      return <h5 key={key} style={headingStyle}>{content}</h5>;
    }

    case "code":
      return (
        <pre
          key={key}
          style={{
            margin: "8px 0",
            padding: "12px 16px",
            background: "rgba(0,0,0,0.3)",
            borderRadius: 8,
            fontSize: 13,
            lineHeight: 1.5,
            overflowX: "auto",
            fontFamily: "monospace",
          }}
        >
          <code>{block.lines.join("\n")}</code>
        </pre>
      );

    case "table":
      return renderTable(block.lines, key);

    case "list":
      return renderList(block.lines, block.ordered || false, key);

    case "hr":
      return (
        <hr
          key={key}
          style={{
            border: "none",
            borderTop: "1px solid var(--border-color)",
            margin: "12px 0",
          }}
        />
      );

    case "paragraph":
      return (
        <p
          key={key}
          style={{ margin: "6px 0", lineHeight: 1.6 }}
        >
          {renderInline(block.lines.join(" "))}
        </p>
      );

    default:
      return null;
  }
}

function renderTable(lines: string[], key: number): React.ReactNode {
  // Filter out separator rows (|---|---|)
  const dataRows = lines.filter((l) => !/^\|[\s\-:|]+\|$/.test(l.trim()));
  if (dataRows.length === 0) return null;

  const parseRow = (line: string) =>
    line
      .split("|")
      .map((c) => c.trim())
      .filter((c) => c !== "");

  const header = parseRow(dataRows[0]);
  const body = dataRows.slice(1).map(parseRow);

  return (
    <div key={key} style={{ overflowX: "auto", margin: "8px 0" }}>
      <table
        style={{
          borderCollapse: "collapse",
          fontSize: 13,
          width: "auto",
        }}
      >
        <thead>
          <tr>
            {header.map((cell, i) => (
              <th
                key={i}
                style={{
                  padding: "6px 12px",
                  borderBottom: "2px solid var(--border-color)",
                  textAlign: "left",
                  fontWeight: 600,
                  fontSize: 12,
                  whiteSpace: "nowrap",
                }}
              >
                {renderInline(cell)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {body.map((row, ri) => (
            <tr key={ri}>
              {row.map((cell, ci) => (
                <td
                  key={ci}
                  style={{
                    padding: "5px 12px",
                    borderBottom: "1px solid var(--border-color)",
                    fontSize: 13,
                  }}
                >
                  {renderInline(cell)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function renderList(
  lines: string[],
  ordered: boolean,
  key: number
): React.ReactNode {
  const items: string[] = [];
  for (const line of lines) {
    const match = line.match(/^[\s]*(?:[-*+]|\d+\.)\s+(.*)/);
    if (match) {
      items.push(match[1]);
    } else if (items.length > 0) {
      // Continuation line
      items[items.length - 1] += " " + line.trim();
    }
  }

  const Tag = ordered ? "ol" : "ul";
  return (
    <Tag
      key={key}
      style={{
        margin: "6px 0",
        paddingLeft: 24,
        lineHeight: 1.6,
      }}
    >
      {items.map((item, i) => (
        <li key={i} style={{ marginBottom: 2 }}>
          {renderInline(item)}
        </li>
      ))}
    </Tag>
  );
}

function renderInline(text: string): React.ReactNode {
  if (!text) return null;

  // Process inline markdown: bold, italic, code, links
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let keyCounter = 0;

  while (remaining.length > 0) {
    // Bold: **text** or __text__
    const boldMatch = remaining.match(/^([\s\S]*?)\*\*(.+?)\*\*/);
    const boldMatch2 = remaining.match(/^([\s\S]*?)__(.+?)__/);
    const bold = boldMatch && (!boldMatch2 || boldMatch.index! <= boldMatch2.index!)
      ? boldMatch
      : boldMatch2;

    // Inline code: `text`
    const codeMatch = remaining.match(/^(.*?)`([^`]+)`/);

    // Link: [text](url)
    const linkMatch = remaining.match(/^(.*?)\[([^\]]+)\]\(([^)]+)\)/);

    // Find earliest match
    const matches = [
      bold && { type: "bold", match: bold, pos: bold[1].length },
      codeMatch && { type: "code", match: codeMatch, pos: codeMatch[1].length },
      linkMatch && { type: "link", match: linkMatch, pos: linkMatch[1].length },
    ].filter(Boolean) as Array<{ type: string; match: RegExpMatchArray; pos: number }>;

    if (matches.length === 0) {
      parts.push(remaining);
      break;
    }

    // Use earliest match
    matches.sort((a, b) => a.pos - b.pos);
    const earliest = matches[0];

    // Add text before match
    if (earliest.match[1]) {
      parts.push(earliest.match[1]);
    }

    const k = keyCounter++;
    if (earliest.type === "bold") {
      parts.push(
        <strong key={k} style={{ fontWeight: 600 }}>
          {earliest.match[2]}
        </strong>
      );
      remaining = remaining.slice(earliest.match[0].length);
    } else if (earliest.type === "code") {
      parts.push(
        <code
          key={k}
          style={{
            padding: "2px 5px",
            background: "rgba(0,0,0,0.3)",
            borderRadius: 4,
            fontSize: "0.9em",
            fontFamily: "monospace",
          }}
        >
          {earliest.match[2]}
        </code>
      );
      remaining = remaining.slice(earliest.match[0].length);
    } else if (earliest.type === "link") {
      parts.push(
        <a
          key={k}
          href={earliest.match[3]}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "var(--accent)", textDecoration: "underline" }}
        >
          {earliest.match[2]}
        </a>
      );
      remaining = remaining.slice(earliest.match[0].length);
    }
  }

  return parts.length === 1 ? parts[0] : <>{parts}</>;
}
