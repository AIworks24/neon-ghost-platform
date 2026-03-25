// lib/pdf-export.ts
//
// PURPOSE: Generates the 7-slide client presentation as a crisp, vector PDF.
//
// WHY NOT html2canvas:
//   html2canvas takes a bitmap screenshot of DOM nodes and compresses them
//   into A4 paper. This causes blurry text, incorrect proportions, cards
//   with giant empty spaces, and gradient artifacts. It was never built for
//   print-quality output.
//
// THIS APPROACH:
//   Every element — backgrounds, cards, borders, typography — is drawn
//   directly using jsPDF's drawing APIs. The result is a proper vector PDF
//   with crisp text at any resolution, consistent layout, and no dependencies
//   on the DOM or screen rendering.

import type jsPDFType from 'jspdf';

// ─────────────────────────────────────────────────────────────────────────────
// Type definitions
// ─────────────────────────────────────────────────────────────────────────────

type RGB = [number, number, number];

export interface PlatformHighlight {
  platform: string;
  headline: string;
  detail:   string;
}

export interface PDFPresentationData {
  campaignName:          string;
  clientName:            string;
  dateStart:             string;
  dateEnd:               string;
  score:                 number;
  executiveSummary:      string;
  performanceNarrative:  string;
  keyWins:               string[];
  platformHighlights:    PlatformHighlight[];
  insights:              string[];
  alerts:                string[];
  recommendations:       string[];
  nextSteps:             string[];
  closingStatement:      string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Design tokens — all RGB
// ─────────────────────────────────────────────────────────────────────────────

const C = {
  // Backgrounds
  darkBg:     [10, 10, 10]    as RGB,
  gradBg:     [14, 6, 28]     as RGB,  // deep purple — gradient slides
  cardBg:     [20, 20, 20]    as RGB,
  surface:    [28, 28, 28]    as RGB,
  surface2:   [36, 36, 36]    as RGB,
  border:     [45, 45, 45]    as RGB,

  // Accent colours (neon theme)
  purple:     [181, 55, 242]  as RGB,
  purpleDim:  [100, 30, 150]  as RGB,
  purpleBg:   [35, 12, 60]    as RGB,
  cyan:       [0,  200, 220]  as RGB,
  cyanDim:    [0,  100, 120]  as RGB,

  // Status colours
  green:      [34,  197, 94]  as RGB,
  greenBg:    [5,   26,  10]  as RGB,
  greenBdr:   [22,  101, 52]  as RGB,
  yellow:     [234, 179,  8]  as RGB,
  yellowBg:   [42,  34,   5]  as RGB,
  yellowBdr:  [133,  77, 14]  as RGB,
  red:        [239,  68, 68]  as RGB,

  // Text
  white:      [255, 255, 255] as RGB,
  grayL:      [209, 213, 219] as RGB,  // light body text
  grayM:      [156, 163, 175] as RGB,  // secondary
  grayD:      [107, 114, 128] as RGB,  // tertiary
  grayDark:   [ 60,  60,  60] as RGB,  // very dim
  grayLabel:  [ 80,  80,  80] as RGB,  // section labels

  // Footer bar
  footerBg:   [20,  8,  40]   as RGB,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Page geometry (A4 landscape, mm)
// ─────────────────────────────────────────────────────────────────────────────

const W   = 297;   // page width
const H   = 210;   // page height
const M   = 14;    // margin
const CW  = W - M * 2;   // content width  = 269mm
const FH  = 7;     // footer bar height

// ─────────────────────────────────────────────────────────────────────────────
// Low-level drawing helpers
// ─────────────────────────────────────────────────────────────────────────────

function bg(pdf: jsPDFType, color: RGB) {
  pdf.setFillColor(color[0], color[1], color[2]);
  pdf.rect(0, 0, W, H, 'F');
}

function filledRect(
  pdf: jsPDFType,
  x: number, y: number, w: number, h: number,
  fillColor: RGB,
  strokeColor?: RGB,
  lineW = 0.3,
  radius = 2,
) {
  pdf.setFillColor(fillColor[0], fillColor[1], fillColor[2]);
  if (strokeColor) {
    pdf.setDrawColor(strokeColor[0], strokeColor[1], strokeColor[2]);
    pdf.setLineWidth(lineW);
    pdf.roundedRect(x, y, w, h, radius, radius, 'FD');
  } else {
    pdf.roundedRect(x, y, w, h, radius, radius, 'F');
  }
}

function solidRect(pdf: jsPDFType, x: number, y: number, w: number, h: number, color: RGB) {
  pdf.setFillColor(color[0], color[1], color[2]);
  pdf.rect(x, y, w, h, 'F');
}

function hLine(pdf: jsPDFType, x1: number, x2: number, y: number, color: RGB, lw = 0.4) {
  pdf.setDrawColor(color[0], color[1], color[2]);
  pdf.setLineWidth(lw);
  pdf.line(x1, y, x2, y);
}

function txt(
  pdf: jsPDFType,
  text: string,
  x: number, y: number,
  color: RGB,
  size: number,
  style: 'normal' | 'bold' | 'italic' = 'normal',
  align: 'left' | 'center' | 'right' = 'left',
) {
  pdf.setTextColor(color[0], color[1], color[2]);
  pdf.setFont('helvetica', style);
  pdf.setFontSize(size);
  pdf.text(text, x, y, { align });
}

// Wraps text to maxW, draws it, returns the Y after the last line
function wrappedTxt(
  pdf: jsPDFType,
  text: string,
  x: number, y: number,
  maxW: number,
  color: RGB,
  size: number,
  style: 'normal' | 'bold' | 'italic' = 'normal',
  lineH?: number,
): number {
  pdf.setTextColor(color[0], color[1], color[2]);
  pdf.setFont('helvetica', style);
  pdf.setFontSize(size);
  const lh = lineH ?? size * 0.42;
  const lines = pdf.splitTextToSize(text, maxW) as string[];
  pdf.text(lines, x, y);
  return y + (lines.length - 1) * lh;
}

// Draws a section header with a vertical purple accent bar
function sectionHeader(
  pdf: jsPDFType,
  title: string,
  y: number,
  accentColor: RGB = C.purple,
): number {
  solidRect(pdf, M, y, 2, 9, accentColor);
  txt(pdf, title, M + 6, y + 7, C.white, 15, 'bold');
  return y + 16;
}

// Draw a small label (e.g. "STRATEGIC RECOMMENDATIONS")
function label(pdf: jsPDFType, text: string, x: number, y: number) {
  txt(pdf, text, x, y, C.grayLabel, 6.5, 'bold');
}

// Draw the thin footer bar at bottom of every slide
function pageFooter(pdf: jsPDFType, pageN: number) {
  solidRect(pdf, 0, H - FH, W, FH, C.footerBg);
  txt(pdf, 'NEON GHOST', M, H - 1.8, C.purple, 7, 'bold');
  txt(pdf, 'Social Media Advertising', M + 28, H - 1.8, C.grayD, 7);
  txt(pdf, `${pageN} / 7`, W - M, H - 1.8, C.grayD, 7, 'normal', 'right');
}

// Draw a tick (checkmark) shape without relying on unicode
function drawTick(pdf: jsPDFType, cx: number, cy: number, size: number, color: RGB) {
  pdf.setDrawColor(color[0], color[1], color[2]);
  pdf.setLineWidth(size * 0.18);
  // Short leg of tick
  pdf.line(cx,              cy + size * 0.45, cx + size * 0.38, cy + size * 0.8);
  // Long leg of tick
  pdf.line(cx + size * 0.38, cy + size * 0.8,  cx + size * 0.95, cy);
}

// Draw right arrow (-->) without relying on unicode
function drawArrow(pdf: jsPDFType, cx: number, cy: number, size: number, color: RGB) {
  pdf.setDrawColor(color[0], color[1], color[2]);
  pdf.setLineWidth(size * 0.12);
  const hs = size * 0.5;
  pdf.line(cx, cy,           cx + size * 0.75, cy);
  pdf.line(cx + size * 0.5,  cy - hs * 0.55,   cx + size * 0.75 + hs * 0.1, cy);
  pdf.line(cx + size * 0.5,  cy + hs * 0.55,   cx + size * 0.75 + hs * 0.1, cy);
}

// Draw warning triangle
function drawWarning(pdf: jsPDFType, cx: number, cy: number, size: number, color: RGB) {
  pdf.setFillColor(color[0], color[1], color[2]);
  pdf.setDrawColor(color[0], color[1], color[2]);
  pdf.setLineWidth(0.2);
  // Draw filled triangle
  const s = size;
  pdf.triangle(cx, cy - s * 0.6, cx - s * 0.65, cy + s * 0.5, cx + s * 0.65, cy + s * 0.5, 'F');
  // '!' inside
  pdf.setTextColor(10, 10, 10);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(s * 1.5);
  pdf.text('!', cx - 0.6, cy + s * 0.38);
}

// ─────────────────────────────────────────────────────────────────────────────
// Slide builders
// ─────────────────────────────────────────────────────────────────────────────

function slide1_Title(pdf: jsPDFType, d: PDFPresentationData) {
  bg(pdf, C.gradBg);

  // Top purple accent band
  solidRect(pdf, 0, 0, W, 2, C.purple);

  // Subtle side accent
  solidRect(pdf, 0, 2, 3, H - FH - 2, C.purpleDim);

  // Top label
  txt(pdf, 'NEON GHOST  —  CONFIDENTIAL', M + 6, 11, C.grayLabel, 6.5, 'bold');
  txt(pdf, `${d.dateStart}  —  ${d.dateEnd}`, W - M, 11, C.grayD, 7, 'normal', 'right');

  // Campaign name — large
  pdf.setTextColor(C.white[0], C.white[1], C.white[2]);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(30);
  const nameLines = pdf.splitTextToSize(d.campaignName, 185) as string[];
  const nameLineH = 12.5;
  nameLines.forEach((line, i) => pdf.text(line, M + 6, 38 + i * nameLineH));
  const afterName = 38 + nameLines.length * nameLineH;

  // Subtitle
  txt(pdf, 'Performance Report', M + 6, afterName + 4, C.grayM, 14, 'normal');

  // Divider
  hLine(pdf, M, W - M, 130, C.purpleDim, 0.5);

  // "Prepared for" label + client name
  txt(pdf, 'PREPARED FOR', M + 6, 141, C.grayD, 7, 'bold');
  txt(pdf, d.clientName, M + 6, 151, C.white, 16, 'bold');

  // Score badge (right side, vertically centered in lower half)
  const bx = W - M - 50, by = 133, bw = 50, bh = 42;
  filledRect(pdf, bx, by, bw, bh, C.surface, C.purpleDim, 0.5, 3);

  const scoreColor: RGB =
    d.score >= 8 ? C.green :
    d.score >= 6 ? C.yellow :
    C.red;

  // Score number
  pdf.setTextColor(scoreColor[0], scoreColor[1], scoreColor[2]);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(30);
  pdf.text(String(d.score), bx + 11, by + 24);

  // "/10"
  pdf.setTextColor(C.grayD[0], C.grayD[1], C.grayD[2]);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(14);
  pdf.text('/10', bx + 27, by + 24);

  // "PERFORMANCE SCORE" label
  txt(pdf, 'PERFORMANCE SCORE', bx + 3, by + 34, C.grayM, 6.5, 'bold');

  pageFooter(pdf, 1);
}

function slide2_ExecutiveSummary(pdf: jsPDFType, d: PDFPresentationData) {
  bg(pdf, C.darkBg);

  let y = sectionHeader(pdf, 'Executive Summary', M);

  // Summary paragraph
  y = wrappedTxt(pdf, d.executiveSummary, M, y, CW, C.grayL, 10, 'normal', 5.2) + 8;

  // Narrative card with purple left accent
  // Calculate card height based on text content
  pdf.setFont('helvetica', 'italic');
  pdf.setFontSize(9.5);
  const narLines = pdf.splitTextToSize(d.performanceNarrative, CW - 16) as string[];
  const narH = Math.max(22, narLines.length * 5 + 14);

  filledRect(pdf, M, y, CW, narH, C.surface, C.border, 0.3, 2);
  // Purple accent bar
  solidRect(pdf, M, y, 2.5, narH, C.purple);

  pdf.setTextColor(C.grayL[0], C.grayL[1], C.grayL[2]);
  pdf.setFont('helvetica', 'italic');
  pdf.setFontSize(9.5);
  pdf.text(narLines, M + 9, y + 8);

  pageFooter(pdf, 2);
}

function slide3_KeyWins(pdf: jsPDFType, d: PDFPresentationData) {
  bg(pdf, C.darkBg);

  let y = sectionHeader(pdf, 'Key Wins', M);

  const wins = d.keyWins.slice(0, 3);
  const gap   = 5;
  const cardW = (CW - gap * (wins.length - 1)) / wins.length;

  // Pre-calculate card heights based on actual text content
  const cardHeights = wins.map(win => {
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    const lines = pdf.splitTextToSize(win, cardW - 14) as string[];
    // tick(12) + gap(6) + text lines
    return Math.max(52, 18 + lines.length * 5.5 + 14);
  });
  const maxCardH = Math.max(...cardHeights);

  wins.forEach((win, i) => {
    const x = M + i * (cardW + gap);

    // Card
    filledRect(pdf, x, y, cardW, maxCardH, C.greenBg, C.greenBdr, 0.5, 3);

    // Tick mark — drawn, not unicode
    drawTick(pdf, x + 6, y + 9, 7, C.green);

    // Win text
    pdf.setTextColor(C.white[0], C.white[1], C.white[2]);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    const lines = pdf.splitTextToSize(win, cardW - 14) as string[];
    pdf.text(lines, x + 6, y + 24);
  });

  pageFooter(pdf, 3);
}

function slide4_Platforms(pdf: jsPDFType, d: PDFPresentationData) {
  bg(pdf, C.darkBg);

  let y = sectionHeader(pdf, 'Platform Performance', M);

  const highlights = d.platformHighlights.slice(0, 4);
  const cols  = 2;
  const gap   = 6;
  const cardW = (CW - gap * (cols - 1)) / cols;

  // Pre-measure each card's content height
  highlights.forEach((ph, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x   = M + col * (cardW + gap);

    // Measure text heights
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9.5);
    const hLines = pdf.splitTextToSize(ph.headline, cardW - 16) as string[];

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8.5);
    const dLines = pdf.splitTextToSize(ph.detail, cardW - 16) as string[];

    const cardH = Math.max(46, 10 + 6 + hLines.length * 5 + dLines.length * 4.5 + 10);
    const rowH  = cardH + gap;
    const cy    = y + row * rowH;

    // Card
    filledRect(pdf, x, cy, cardW, cardH, C.surface, C.border, 0.3, 2);

    // Purple accent left bar
    solidRect(pdf, x, cy, 2.5, cardH, C.purple);

    // Platform name
    txt(pdf, ph.platform.charAt(0).toUpperCase() + ph.platform.slice(1), x + 8, cy + 9, C.white, 10, 'bold');

    // Headline (purple)
    pdf.setTextColor(C.purple[0], C.purple[1], C.purple[2]);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9.5);
    pdf.text(hLines, x + 8, cy + 18);

    // Detail (gray)
    const afterH = cy + 18 + (hLines.length - 1) * 5 + 5;
    pdf.setTextColor(C.grayM[0], C.grayM[1], C.grayM[2]);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8.5);
    pdf.text(dLines, x + 8, afterH);
  });

  pageFooter(pdf, 4);
}

function slide5_Insights(pdf: jsPDFType, d: PDFPresentationData) {
  bg(pdf, C.gradBg);

  let y = sectionHeader(pdf, 'AI Insights', M, C.cyan);

  const insights = d.insights.slice(0, 4);
  const cols     = 2;
  const gap      = 6;
  const cardW    = (CW - gap * (cols - 1)) / cols;
  const insGap   = 4;

  // Pre-measure each insight card
  const insHeights = insights.map(insight => {
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    const lines = pdf.splitTextToSize(insight, cardW - 18) as string[];
    return Math.max(24, lines.length * 4.8 + 12);
  });

  // Two-column layout
  const maxRowH = [0, 1].map(row =>
    Math.max(
      insHeights[row * 2]     ?? 0,
      insHeights[row * 2 + 1] ?? 0
    )
  );

  insights.forEach((insight, i) => {
    const col = i % cols;
    const row = Math.floor(i / 2);
    const x   = M + col * (cardW + gap);
    const iy  = y + (row === 0 ? 0 : maxRowH[0] + insGap);

    filledRect(pdf, x, iy, cardW, insHeights[i], [18, 18, 36], [50, 50, 90], 0.3, 2);

    // Arrow drawn
    drawArrow(pdf, x + 4, iy + insHeights[i] / 2 - 0.5, 6, C.cyan);

    pdf.setTextColor(C.grayL[0], C.grayL[1], C.grayL[2]);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    const lines = pdf.splitTextToSize(insight, cardW - 18) as string[];
    const textY = iy + insHeights[i] / 2 - ((lines.length - 1) * 4.8) / 2;
    pdf.text(lines, x + 14, textY);
  });

  // Attention items (alerts)
  if (d.alerts && d.alerts.length > 0) {
    const alertsStartY = y + maxRowH[0] + insGap + (maxRowH[1] ?? 0) + 8;

    label(pdf, 'ATTENTION ITEMS', M, alertsStartY);

    d.alerts.slice(0, 2).forEach((alert, i) => {
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      const lines   = pdf.splitTextToSize(alert, CW - 22) as string[];
      const alertH  = Math.max(18, lines.length * 4.8 + 10);
      const alertY  = alertsStartY + 5 + i * (alertH + 4);

      filledRect(pdf, M, alertY, CW, alertH, C.yellowBg, C.yellowBdr, 0.3, 2);

      // Warning icon — drawn triangle
      drawWarning(pdf, M + 7, alertY + alertH / 2, 4, C.yellow);

      pdf.setTextColor(C.grayL[0], C.grayL[1], C.grayL[2]);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      pdf.text(lines, M + 17, alertY + alertH / 2 - ((lines.length - 1) * 4.8) / 2);
    });
  }

  pageFooter(pdf, 5);
}

function slide6_Recommendations(pdf: jsPDFType, d: PDFPresentationData) {
  bg(pdf, C.darkBg);

  let y = sectionHeader(pdf, 'Recommendations & Next Steps', M);

  const colW  = (CW - 8) / 2;
  const gap   = 8;
  const recX  = M;
  const stepX = M + colW + gap;

  // Column headers
  label(pdf, 'STRATEGIC RECOMMENDATIONS', recX, y);
  label(pdf, 'IMMEDIATE NEXT STEPS', stepX, y);
  y += 7;

  const maxItems = 4;
  const recItemH: number[] = [];
  const stepItemH: number[] = [];

  // Pre-measure
  d.recommendations.slice(0, maxItems).forEach(rec => {
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    const lines = pdf.splitTextToSize(rec, colW - 20) as string[];
    recItemH.push(Math.max(20, lines.length * 4.8 + 10));
  });
  d.nextSteps.slice(0, maxItems).forEach(step => {
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    const lines = pdf.splitTextToSize(step, colW - 20) as string[];
    stepItemH.push(Math.max(20, lines.length * 4.8 + 10));
  });

  const rowGap = 4;

  // Draw recs
  let ry = y;
  d.recommendations.slice(0, maxItems).forEach((rec, i) => {
    const h = recItemH[i];
    filledRect(pdf, recX, ry, colW, h, C.surface, C.border, 0.3, 2);

    txt(pdf, `${i + 1}.`, recX + 5, ry + h / 2 + 1, C.purple, 11, 'bold');

    pdf.setTextColor(C.grayL[0], C.grayL[1], C.grayL[2]);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    const lines = pdf.splitTextToSize(rec, colW - 20) as string[];
    pdf.text(lines, recX + 14, ry + h / 2 - ((lines.length - 1) * 4.8) / 2);

    ry += h + rowGap;
  });

  // Draw next steps
  let sy = y;
  d.nextSteps.slice(0, maxItems).forEach((step, i) => {
    const h = stepItemH[i];
    filledRect(pdf, stepX, sy, colW, h, [15, 15, 32], [50, 50, 90], 0.3, 2);

    drawArrow(pdf, stepX + 4, sy + h / 2 - 0.5, 6, C.cyan);

    pdf.setTextColor(C.grayL[0], C.grayL[1], C.grayL[2]);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    const lines = pdf.splitTextToSize(step, colW - 20) as string[];
    pdf.text(lines, stepX + 14, sy + h / 2 - ((lines.length - 1) * 4.8) / 2);

    sy += h + rowGap;
  });

  pageFooter(pdf, 6);
}

function slide7_Closing(pdf: jsPDFType, d: PDFPresentationData) {
  bg(pdf, C.gradBg);

  // Side accent
  solidRect(pdf, W - 3, 0, 3, H - FH, C.purpleDim);

  let y = sectionHeader(pdf, 'Moving Forward', M, C.cyan);

  // Closing statement
  y = wrappedTxt(pdf, d.closingStatement, M, y, CW, C.grayL, 11, 'normal', 6) + 14;

  // Divider
  hLine(pdf, M, W - M, H - 22, C.purpleDim, 0.4);

  // Branding footer
  txt(pdf, 'Neon Ghost', M, H - 13, C.purple, 13, 'bold');
  txt(pdf, 'Social Media Advertising', M, H - 8, C.grayD, 8);
  txt(pdf, `Report generated: ${new Date().toLocaleDateString()}`, W - M, H - 10, C.grayD, 8, 'normal', 'right');

  pageFooter(pdf, 7);
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

export async function exportPresentationToPDF(data: PDFPresentationData): Promise<void> {
  // Dynamically import jsPDF to keep bundle size down
  const { default: jsPDF } = await import('jspdf');

  const pdf = new jsPDF({
    orientation: 'landscape',
    unit:        'mm',
    format:      'a4',
  });

  // Build all 7 slides
  slide1_Title(pdf, data);
  pdf.addPage();
  slide2_ExecutiveSummary(pdf, data);
  pdf.addPage();
  slide3_KeyWins(pdf, data);
  pdf.addPage();
  slide4_Platforms(pdf, data);
  pdf.addPage();
  slide5_Insights(pdf, data);
  pdf.addPage();
  slide6_Recommendations(pdf, data);
  pdf.addPage();
  slide7_Closing(pdf, data);

  // Save — sanitize filename
  const filename = `${data.campaignName.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-report.pdf`;
  pdf.save(filename);
}
