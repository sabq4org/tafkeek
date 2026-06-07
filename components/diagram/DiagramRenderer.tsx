'use client';

import type { Diagram } from '@/lib/ai/schema';

/**
 * يرسم المخطط برمجياً عبر SVG.
 * الفكرة الجوهرية: النص العربي يُكتب كـ <text> حقيقي يرسمه محرّك المتصفح
 * (تشكيل + RTL صحيحان)، وليس كبكسلات من مولّد صور — فلا أخطاء في النص أبداً.
 */

const NODE_WIDTH = 280;
const H_PADDING = 18;
const V_PADDING = 14;
const LINE_HEIGHT = 22;
const FONT_SIZE = 15;
const GAP = 56; // مسافة رأسية بين العقد
const MARGIN = 24;
const CHAR_W = FONT_SIZE * 0.58; // تقدير عرض الحرف العربي

function wrapLabel(label: string, maxWidth: number): string[] {
  const maxChars = Math.max(6, Math.floor(maxWidth / CHAR_W));
  const words = label.split(/\s+/);
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const tentative = current ? `${current} ${word}` : word;
    if (tentative.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = tentative;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [label];
}

type Box = {
  id: string;
  index: number;
  x: number;
  y: number;
  w: number;
  h: number;
  lines: string[];
};

export function DiagramRenderer({ diagram }: { diagram: Diagram }) {
  const innerWidth = NODE_WIDTH - H_PADDING * 2;

  // 1) ترتيب العقد عمودياً (تخطيط تدفّق بسيط ومتين).
  let cursorY = MARGIN;
  const boxes: Box[] = diagram.nodes.map((node, index) => {
    const lines = wrapLabel(node.label, innerWidth);
    const h = lines.length * LINE_HEIGHT + V_PADDING * 2;
    const box: Box = { id: node.id, index, x: MARGIN, y: cursorY, w: NODE_WIDTH, h, lines };
    cursorY += h + GAP;
    return box;
  });

  const byId = new Map(boxes.map((b) => [b.id, b]));
  const height = cursorY - GAP + MARGIN;
  const width = MARGIN * 2 + NODE_WIDTH + 64; // مساحة إضافية للأسهم الجانبية

  // 2) رسم الحواف: عمودية للعقد المتتالية، ومنحنية جانبية لغير المتتالية.
  const edges = diagram.edges
    .map((edge, key) => {
      const from = byId.get(edge.from);
      const to = byId.get(edge.to);
      if (!from || !to) return null;

      const fromCx = from.x + from.w / 2;
      const toCx = to.x + to.w / 2;
      const consecutive = to.index === from.index + 1;

      if (consecutive) {
        const y1 = from.y + from.h;
        const y2 = to.y;
        return {
          key,
          label: edge.label,
          path: `M ${fromCx} ${y1} L ${toCx} ${y2}`,
          labelX: (fromCx + toCx) / 2,
          labelY: (y1 + y2) / 2,
        };
      }

      const sideX = from.x + from.w + 28;
      const y1 = from.y + from.h / 2;
      const y2 = to.y + to.h / 2;
      return {
        key,
        label: edge.label,
        path: `M ${from.x + from.w} ${y1} C ${sideX} ${y1}, ${sideX} ${y2}, ${to.x + to.w} ${y2}`,
        labelX: sideX,
        labelY: (y1 + y2) / 2,
      };
    })
    .filter((e): e is NonNullable<typeof e> => e !== null);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      style={{ maxWidth: width, height: 'auto' }}
      role="img"
      aria-label={diagram.title}
    >
      <defs>
        <marker
          id="tafkeek-arrow"
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="7"
          markerHeight="7"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#6366f1" />
        </marker>
      </defs>

      {/* الأسهم */}
      {edges.map((e) => (
        <g key={e.key}>
          <path
            d={e.path}
            fill="none"
            stroke="#6366f1"
            strokeWidth={2}
            markerEnd="url(#tafkeek-arrow)"
          />
          {e.label && (
            <g>
              <rect
                x={e.labelX - (e.label.length * CHAR_W) / 2 - 4}
                y={e.labelY - 11}
                width={e.label.length * CHAR_W + 8}
                height={22}
                rx={6}
                fill="#ffffff"
                stroke="#e2e8f0"
              />
              <text
                x={e.labelX}
                y={e.labelY}
                textAnchor="middle"
                dominantBaseline="central"
                direction="rtl"
                fontSize={12}
                fill="#475569"
              >
                {e.label}
              </text>
            </g>
          )}
        </g>
      ))}

      {/* العقد */}
      {boxes.map((box) => {
        const cx = box.x + box.w / 2;
        const textStartY = box.y + V_PADDING + FONT_SIZE - 4;
        return (
          <g key={box.id}>
            <rect
              x={box.x}
              y={box.y}
              width={box.w}
              height={box.h}
              rx={14}
              fill="#eef2ff"
              stroke="#6366f1"
              strokeWidth={1.5}
            />
            {/* شارة الترتيب على جهة البداية (اليمين في RTL) */}
            <circle cx={box.x + box.w - 16} cy={box.y + 16} r={12} fill="#6366f1" />
            <text
              x={box.x + box.w - 16}
              y={box.y + 16}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={12}
              fontWeight={700}
              fill="#ffffff"
            >
              {box.index + 1}
            </text>
            <text
              x={cx}
              textAnchor="middle"
              direction="rtl"
              fontSize={FONT_SIZE}
              fontWeight={600}
              fill="#1e1b4b"
            >
              {box.lines.map((line, i) => (
                <tspan key={i} x={cx} y={textStartY + i * LINE_HEIGHT}>
                  {line}
                </tspan>
              ))}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
