'use client';

import React, { useMemo } from 'react';
import type { Diagram } from '@/lib/ai/schema';

/**
 * DiagramRenderer - Professional SVG Engine for Arabic Diagrams
 * Features: 
 * - TB (Top-to-Bottom) and RL (Right-to-Left) layouts.
 * - Smooth cubic bezier paths with markers.
 * - Modern styling: Soft gradients, dropout shadows, refined typography.
 * - Intelligent Arabic text wrapping.
 */

const NODE_WIDTH = 260;
const NODE_MIN_HEIGHT = 86;
const H_PADDING = 24;
const V_PADDING = 20;
const LINE_HEIGHT = 26;
const FONT_SIZE = 16;
const GAP_V = 65; 
const GAP_H = 85;
const MARGIN = 50;

// Slightly more conservative char width for bold Arabic fonts to ensure no overflow
const CHAR_W = FONT_SIZE * 0.62;

function wrapLabel(label: string, maxWidth: number): string[] {
  const maxChars = Math.max(8, Math.floor(maxWidth / CHAR_W));
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
  const { nodes, edges, direction = 'TB', title } = diagram;

  // 1) Layout Calculation
  const boxes = useMemo(() => {
    const innerWidth = NODE_WIDTH - H_PADDING * 2;
    let cursorX = MARGIN;
    let cursorY = MARGIN;
    
    // In RL mode, we need to pre-calculate width to know our starting X
    if (direction === 'RL') {
      const totalWidth = nodes.length * (NODE_WIDTH + GAP_H) - GAP_H + MARGIN * 2;
      cursorX = totalWidth - MARGIN - NODE_WIDTH;
    }

    const calculatedBoxes: Box[] = [];
    
    nodes.forEach((node, index) => {
      const lines = wrapLabel(node.label, innerWidth);
      const h = Math.max(NODE_MIN_HEIGHT, lines.length * LINE_HEIGHT + V_PADDING * 2);
      
      const box: Box = {
        id: node.id,
        index,
        x: cursorX,
        y: cursorY,
        w: NODE_WIDTH,
        h,
        lines,
      };
      
      calculatedBoxes.push(box);
      
      if (direction === 'TB') {
        cursorY += h + GAP_V;
      } else {
        // RL: move cursor to the left for the next node
        cursorX -= (NODE_WIDTH + GAP_H);
      }
    });
    
    return calculatedBoxes;
  }, [nodes, direction]);

  const byId = useMemo(() => new Map(boxes.map((b) => [b.id, b])), [boxes]);

  // 2) Coordinate Bounds
  const bounds = useMemo(() => {
    if (boxes.length === 0) return { width: 400, height: 400 };

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    boxes.forEach(b => {
      minX = Math.min(minX, b.x);
      minY = Math.min(minY, b.y);
      maxX = Math.max(maxX, b.x + b.w);
      maxY = Math.max(maxY, b.y + b.h);
    });
    
    return {
      width: maxX + MARGIN,
      height: maxY + MARGIN,
    };
  }, [boxes]);

  // 3) Path Rendering Logic
  const renderedEdges = useMemo(() => {
    return edges.map((edge, i) => {
      const from = byId.get(edge.from);
      const to = byId.get(edge.to);
      if (!from || !to) return null;

      let d = '';
      let labelX = 0;
      let labelY = 0;
      const isConsecutive = to.index === from.index + 1;

      if (direction === 'TB') {
        // Top-to-Bottom: From center-bottom to center-top
        const x1 = from.x + from.w / 2;
        const y1 = from.y + from.h;
        const x2 = to.x + to.w / 2;
        const y2 = to.y;
        
        if (isConsecutive) {
          // Subtle curve for consecutive nodes
          const midY = (y1 + y2) / 2;
          d = `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`;
        } else {
          // Arc for non-consecutive
          const offsetX = NODE_WIDTH / 2 + 30;
          d = `M ${from.x + from.w} ${y1 - from.h/2} C ${from.x + from.w + offsetX} ${y1}, ${to.x + to.w + offsetX} ${y2}, ${to.x + to.w} ${y2 + to.h/2}`;
        }
        labelX = (x1 + x2) / 2;
        labelY = (y1 + y2) / 2;
      } else {
        // Right-to-Left: From center-left to center-right
        const x1 = from.x;
        const y1 = from.y + from.h / 2;
        const x2 = to.x + to.w;
        const y2 = to.y + to.h / 2;
        
        const midX = (x1 + x2) / 2;
        d = `M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`;
        labelX = midX;
        labelY = (y1 + y2) / 2;
      }

      return { key: `edge-${i}`, path: d, label: edge.label, labelX, labelY };
    }).filter((e): e is NonNullable<typeof e> => e !== null);
  }, [edges, byId, direction]);

  return (
    <div className="w-full overflow-x-auto rounded-2xl bg-slate-50/50 p-6 shadow-inner ring-1 ring-slate-200/50">
      <svg
        viewBox={`0 0 ${bounds.width} ${bounds.height}`}
        width={bounds.width}
        height={bounds.height}
        className="mx-auto block h-auto max-w-full"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label={title}
      >
        <defs>
          <filter id="nodeShadow" x="-20%" y="-20%" width="150%" height="150%">
            <feDropShadow dx="0" dy="4" stdDeviation="8" floodColor="#6366f1" floodOpacity="0.12" />
          </filter>
          
          <linearGradient id="nodeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#f8faff" />
          </linearGradient>

          <marker
            id="edgeArrow"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#6366f1" />
          </marker>
        </defs>

        {/* 1) Connections (Edges) */}
        <g>
          {renderedEdges.map((e) => (
            <g key={e.key}>
              <path
                d={e.path}
                fill="none"
                stroke="#6366f1"
                strokeWidth={2.8}
                strokeLinecap="round"
                opacity="0.8"
                markerEnd="url(#edgeArrow)"
              />
              {e.label && (
                <g>
                  <rect
                    x={e.labelX - (e.label.length * CHAR_W) / 2 - 10}
                    y={e.labelY - 13}
                    width={e.label.length * CHAR_W + 20}
                    height={26}
                    rx={10}
                    fill="white"
                    stroke="#e2e8f0"
                    strokeWidth={1}
                  />
                  <text
                    x={e.labelX}
                    y={e.labelY + 1}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    direction="rtl"
                    fontSize={13}
                    fontWeight={500}
                    fill="#64748b"
                  >
                    {e.label}
                  </text>
                </g>
              )}
            </g>
          ))}
        </g>

        {/* 2) Nodes */}
        {boxes.map((box) => (
          <g key={box.id} filter="url(#nodeShadow)">
            <rect
              x={box.x}
              y={box.y}
              width={box.w}
              height={box.h}
              rx={24}
              fill="url(#nodeGrad)"
              stroke="#e0e7ff"
              strokeWidth={2}
            />
            
            {/* Number Badge */}
            <g transform={`translate(${box.x + box.w - 28}, ${box.y + 28})`}>
              <circle r={14} fill="#6366f1" />
              <text
                dy=".3em"
                textAnchor="middle"
                fontSize={12}
                fontWeight={800}
                fill="#ffffff"
              >
                {box.index + 1}
              </text>
            </g>

            {/* Content Text (Arabic) */}
            <text
              x={box.x + box.w / 2}
              y={box.y + V_PADDING + 8}
              textAnchor="middle"
              direction="rtl"
            >
              {box.lines.map((line, i) => (
                <tspan
                  key={i}
                  x={box.x + box.w / 2}
                  dy={i === 0 ? "1em" : LINE_HEIGHT}
                  fontSize={FONT_SIZE}
                  fontWeight={600}
                  fill="#1e1b4b"
                >
                  {line}
                </tspan>
              ))}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
