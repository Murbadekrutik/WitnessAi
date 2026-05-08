/**
 * exportService.ts — Legal document PDF export
 *
 * Opens a print-ready window with a professional legal report.
 * Uses the browser's native print dialog — no third-party PDF library needed.
 * The document is styled to look like a formal legal interaction record.
 */

import type { ChatSession } from "@/services/sessionService";

/** Opens a formatted print window and triggers the browser's print dialog. */
export function exportSessionAsPDF(session: ChatSession): void {
  const html = buildPrintHTML(session);
  const win = window.open("", "_blank", "width=900,height=700");
  if (!win) {
    alert(
      "Please allow pop-ups for this site to export the PDF.\n\n" +
      "Look for the pop-up blocked icon in your browser's address bar.",
    );
    return;
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
  // Small delay lets the browser finish rendering before print dialog
  setTimeout(() => {
    win.focus();
    win.print();
  }, 600);
}

// ── HTML builder ─────────────────────────────────────────────────────────────

function buildPrintHTML(session: ChatSession): string {
  const date = new Date(session.createdAt).toLocaleString("en-IN", {
    dateStyle: "long",
    timeStyle: "short",
  });
  const typeName =
    session.type === "recording"
      ? "Voice Recording Session"
      : "Legal AI Chat Session";

  const summaryRow = session.summary
    ? tableRow("Summary", escapeHTML(session.summary))
    : "";
  const durationRow = session.duration
    ? tableRow("Duration", formatDuration(session.duration))
    : "";
  const alertRow =
    session.alertCount &&
    (session.alertCount.danger + session.alertCount.caution) > 0
      ? tableRow(
          "Alerts Detected",
          [
            session.alertCount.danger > 0
              ? `${session.alertCount.danger} DANGER`
              : "",
            session.alertCount.caution > 0
              ? `${session.alertCount.caution} CAUTION`
              : "",
          ]
            .filter(Boolean)
            .join(", "),
        )
      : "";

  const timelineHTML = buildTimeline(session);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>WitnessAI Legal Report</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: 'Times New Roman', Times, serif;
      font-size: 11pt;
      color: #111;
      line-height: 1.65;
      background: #fff;
    }

    .page {
      max-width: 800px;
      margin: 0 auto;
      padding: 32pt 40pt;
    }

    /* ── Document header ─────────────────────────────────────────── */
    .doc-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      border-bottom: 2px solid #111;
      padding-bottom: 14pt;
      margin-bottom: 28pt;
    }
    .doc-title {
      font-size: 16pt;
      font-weight: bold;
      letter-spacing: 0.3pt;
      text-transform: uppercase;
    }
    .doc-subtitle {
      font-size: 9pt;
      color: #555;
      margin-top: 5pt;
      font-style: italic;
    }
    .doc-badge {
      font-size: 8pt;
      text-transform: uppercase;
      letter-spacing: 1pt;
      border: 1px solid #888;
      padding: 3pt 7pt;
      color: #555;
      white-space: nowrap;
    }

    /* ── Sections ────────────────────────────────────────────────── */
    .section { margin-bottom: 28pt; }
    .section-heading {
      font-size: 9pt;
      text-transform: uppercase;
      letter-spacing: 1.2pt;
      font-weight: bold;
      color: #444;
      border-bottom: 1px solid #ccc;
      padding-bottom: 4pt;
      margin-bottom: 12pt;
    }

    /* ── Meta table ──────────────────────────────────────────────── */
    .meta-table { width: 100%; border-collapse: collapse; }
    .meta-table td {
      padding: 4pt 10pt 4pt 0;
      font-size: 10pt;
      vertical-align: top;
    }
    .meta-table tr:not(:last-child) td { border-bottom: 1px dotted #e0e0e0; }
    .meta-table .label { font-weight: bold; width: 130pt; color: #444; font-size: 9.5pt; }

    /* ── Timeline entries ────────────────────────────────────────── */
    .entry {
      margin-bottom: 22pt;
      padding-bottom: 22pt;
      border-bottom: 1px dotted #ddd;
    }
    .entry:last-child { border-bottom: none; margin-bottom: 0; padding-bottom: 0; }

    .entry-meta {
      font-size: 8.5pt;
      text-transform: uppercase;
      letter-spacing: 0.7pt;
      color: #777;
      margin-bottom: 5pt;
    }
    .entry-user-meta { color: #333; font-weight: bold; }

    .entry-text {
      font-size: 11pt;
      line-height: 1.65;
    }
    .entry-text p { margin: 0 0 6pt 0; }
    .entry-text ul { margin: 4pt 0 6pt 16pt; }
    .entry-text li { margin-bottom: 2pt; }
    .entry-text strong { font-weight: bold; }
    .entry-text em { font-style: italic; }

    /* ── Alert block ─────────────────────────────────────────────── */
    .alert-block {
      margin-top: 10pt;
      padding: 9pt 13pt;
      border-left: 3pt solid #555;
      background: #f5f5f5;
      page-break-inside: avoid;
    }
    .alert-block.danger { border-left-color: #222; }
    .alert-block.caution { border-left-color: #666; }
    .alert-block.safe { border-left-color: #999; }

    .alert-label {
      font-size: 8pt;
      text-transform: uppercase;
      letter-spacing: 1pt;
      font-weight: bold;
      margin-bottom: 5pt;
      color: #333;
    }
    .alert-message { font-size: 10pt; line-height: 1.55; }

    .suggested-block {
      margin-top: 8pt;
      padding: 5pt 10pt;
      border-left: 2pt solid #aaa;
      background: #efefef;
    }
    .suggested-label {
      font-size: 8pt;
      text-transform: uppercase;
      letter-spacing: 0.8pt;
      color: #666;
      margin-bottom: 3pt;
    }
    .suggested-text { font-style: italic; font-size: 10pt; }

    .legal-ref {
      font-size: 8.5pt;
      color: #777;
      margin-top: 5pt;
    }

    /* ── Disclaimer ──────────────────────────────────────────────── */
    .disclaimer {
      margin-top: 36pt;
      padding-top: 14pt;
      border-top: 1px solid #bbb;
    }
    .disclaimer p {
      font-size: 8.5pt;
      color: #666;
      line-height: 1.6;
    }

    /* ── Footer ──────────────────────────────────────────────────── */
    .doc-footer {
      margin-top: 24pt;
      text-align: center;
      font-size: 8pt;
      color: #aaa;
      border-top: 1px solid #eee;
      padding-top: 10pt;
    }

    @media print {
      body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
      .page { padding: 0; }
      @page { margin: 20mm 20mm 20mm 25mm; size: A4; }
      .entry { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
<div class="page">

  <!-- Document header -->
  <div class="doc-header">
    <div>
      <div class="doc-title">WitnessAI Legal Interaction Report</div>
      <div class="doc-subtitle">Generated by WitnessAI &mdash; witnessai.app</div>
    </div>
    <div class="doc-badge">Confidential</div>
  </div>

  <!-- Section 1: Session Information -->
  <div class="section">
    <div class="section-heading">1. Session Information</div>
    <table class="meta-table">
      <tbody>
        ${tableRow("Session Title", escapeHTML(session.title))}
        ${tableRow("Date &amp; Time", date)}
        ${tableRow("Session Type", typeName)}
        ${durationRow}
        ${summaryRow}
        ${alertRow}
      </tbody>
    </table>
  </div>

  <!-- Section 2: Interaction Timeline -->
  <div class="section">
    <div class="section-heading">2. Interaction Timeline</div>
    ${timelineHTML || "<p style='color:#999;font-size:10pt'>No entries recorded in this session.</p>"}
  </div>

  <!-- Section 3: Disclaimer -->
  <div class="disclaimer">
    <div class="section-heading">Legal Disclaimer</div>
    <p>
      This document is generated by WitnessAI and contains general legal information
      based on Indian constitutional law and the Code of Criminal Procedure (CrPC).
      This document does <strong>not</strong> constitute legal advice and should not be
      relied upon as a substitute for professional legal counsel. For specific legal matters,
      please consult a licensed advocate or legal professional. WitnessAI is not responsible
      for any actions taken based on the information contained herein.
    </p>
  </div>

  <!-- Footer -->
  <div class="doc-footer">
    WitnessAI Legal Interaction Report &nbsp;&bull;&nbsp;
    ${new Date().toLocaleDateString("en-IN", { dateStyle: "long" })} &nbsp;&bull;&nbsp;
    witnessai.app
  </div>

</div>
</body>
</html>`;
}

// ── Timeline builders ─────────────────────────────────────────────────────────

function buildTimeline(session: ChatSession): string {
  if (session.type === "chat" && session.messages) {
    return session.messages
      .filter((m) => m.role !== "system")
      .map((m) => {
        const roleLabel =
          m.role === "user" ? "User Statement" : "WitnessAI Legal Assistant";
        const roleClass = m.role === "user" ? "entry-user-meta" : "";
        return `
          <div class="entry">
            <div class="entry-meta ${roleClass}">${roleLabel}</div>
            <div class="entry-text">${markdownToHTML(escapeHTML(m.content))}</div>
          </div>`;
      })
      .join("");
  }

  if (session.type === "recording" && session.entries) {
    return session.entries
      .map((e) => {
        let alertHTML = "";
        if (e.alertMessage) {
          const cls = (e.severity ?? "CAUTION").toLowerCase();
          const suggestedHTML = e.suggestedResponse
            ? `<div class="suggested-block">
                <div class="suggested-label">You may say</div>
                <div class="suggested-text">&ldquo;${escapeHTML(e.suggestedResponse)}&rdquo;</div>
               </div>`
            : "";
          const refHTML = e.legalReference
            ? `<div class="legal-ref">Legal basis: ${escapeHTML(e.legalReference)}</div>`
            : "";
          alertHTML = `
            <div class="alert-block ${cls}">
              <div class="alert-label">${e.severity ?? "CAUTION"} &mdash; Rights Alert</div>
              <div class="alert-message">${escapeHTML(e.alertMessage)}</div>
              ${suggestedHTML}
              ${refHTML}
            </div>`;
        }
        return `
          <div class="entry">
            <div class="entry-meta">${e.timestamp}</div>
            <div class="entry-text">${escapeHTML(e.text)}</div>
            ${alertHTML}
          </div>`;
      })
      .join("");
  }

  return "";
}

// ── Utilities ─────────────────────────────────────────────────────────────────

function tableRow(label: string, value: string): string {
  return `<tr><td class="label">${label}</td><td>${value}</td></tr>`;
}

function escapeHTML(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Convert basic markdown to print-safe HTML. */
function markdownToHTML(escapedMD: string): string {
  return escapedMD
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/^#{1,3}\s+(.+)$/gm, "<strong>$1</strong>")
    .replace(/^[-*]\s+(.+)$/gm, "<li>$1</li>")
    .replace(/(<li>[\s\S]*?<\/li>)/g, "<ul>$1</ul>")
    .replace(/\n\n/g, "</p><p>")
    .replace(/\n/g, "<br>")
    .replace(/^/, "<p>")
    .replace(/$/, "</p>");
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m} min ${s} sec` : `${s} sec`;
}
