import React, { useMemo } from 'react';
import { BarChart2 } from 'lucide-react';

interface ResultRow {
  internalMarks: number;
  midSemMarks: number;
  endSemMarks: number;
  labMarks: number;
  maxMarks?: {
    internal: number;
    midSem: number;
    endSem: number;
    lab: number;
  };
}

interface PerformanceAnalyticsProps {
  results: ResultRow[];
  isPublished: boolean;
  type?: 'overall' | 'lab';
}

const RANGES = [
  { label: 'Above 90%',  min: 90, max: 101, color: '#059669', lightColor: '#d1fae5' },
  { label: '80% – 90%',  min: 80, max: 90,  color: '#2563eb', lightColor: '#dbeafe' },
  { label: '70% – 80%',  min: 70, max: 80,  color: '#7c3aed', lightColor: '#ede9fe' },
  { label: '60% – 70%',  min: 60, max: 70,  color: '#d97706', lightColor: '#fef3c7' },
  { label: '50% – 60%',  min: 50, max: 60,  color: '#f59e0b', lightColor: '#fff7ed' },
  { label: 'Below 50%',  min: 0,  max: 50,  color: '#dc2626', lightColor: '#fee2e2' },
];

function getStudentPercentage(row: ResultRow, type: 'overall' | 'lab'): number {
  if (type === 'lab') {
    const maxL = row.maxMarks?.lab ?? 40;
    if (maxL === 0) return 0;
    return (row.labMarks / maxL) * 100;
  }
  const maxI = row.maxMarks?.internal ?? 20;
  const maxM = row.maxMarks?.midSem   ?? 30;
  const maxE = row.maxMarks?.endSem   ?? 50;
  const maxL = row.maxMarks?.lab      ?? 100;
  const maxTotal = maxI + maxM + maxE + maxL;
  if (maxTotal === 0) return 0;
  const obtained = (row.internalMarks || 0) + (row.midSemMarks || 0) + (row.endSemMarks || 0) + (row.labMarks || 0);
  return (obtained / maxTotal) * 100;
}

// Returns SVG donut path for a slice. Handles the 360° edge case by capping at 359.99°.
function donutPath(
  cx: number, cy: number,
  outerR: number, innerR: number,
  startDeg: number, endDeg: number,
): string {
  const sweep = endDeg - startDeg;
  // Cap to avoid degenerate arcs when sweep == 360
  const safeEnd = sweep >= 360 ? startDeg + 359.99 : endDeg;

  const toRad = (d: number) => (d - 90) * (Math.PI / 180);
  const ox1 = cx + outerR * Math.cos(toRad(startDeg));
  const oy1 = cy + outerR * Math.sin(toRad(startDeg));
  const ox2 = cx + outerR * Math.cos(toRad(safeEnd));
  const oy2 = cy + outerR * Math.sin(toRad(safeEnd));
  const ix1 = cx + innerR * Math.cos(toRad(safeEnd));
  const iy1 = cy + innerR * Math.sin(toRad(safeEnd));
  const ix2 = cx + innerR * Math.cos(toRad(startDeg));
  const iy2 = cy + innerR * Math.sin(toRad(startDeg));
  const large = (safeEnd - startDeg) > 180 ? 1 : 0;

  return [
    `M ${ox1} ${oy1}`,
    `A ${outerR} ${outerR} 0 ${large} 1 ${ox2} ${oy2}`,
    `L ${ix1} ${iy1}`,
    `A ${innerR} ${innerR} 0 ${large} 0 ${ix2} ${iy2}`,
    'Z',
  ].join(' ');
}

export const PerformanceAnalytics: React.FC<PerformanceAnalyticsProps> = ({
  results,
  isPublished,
  type = 'overall',
}) => {
  const validResults = useMemo(() => {
    if (!results) return [];
    if (type === 'lab') {
      return results.filter(r => r.labMarks != null && r.labMarks >= 0);
    }
    return results;
  }, [results, type]);

  const distribution = useMemo(() => {
    if (validResults.length === 0) return RANGES.map(r => ({ ...r, count: 0 }));
    return RANGES.map(range => ({
      ...range,
      count: validResults.filter(row => {
        const pct = getStudentPercentage(row, type);
        return pct >= range.min && pct < range.max;
      }).length,
    }));
  }, [validResults, type]);

  const total = validResults.length;

  if (!isPublished) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="p-5 rounded-full bg-slate-100 mb-6">
          <BarChart2 className="h-12 w-12 text-slate-400" />
        </div>
        <h3 className="text-xl font-bold text-slate-900 mb-2">Analytics Not Available</h3>
        <p className="text-slate-500 text-sm max-w-xs">
          {type === 'lab' 
            ? 'Lab analytics will be available after lab results are published.'
            : 'Analytics will be available after the final results are published.'}
        </p>
      </div>
    );
  }

  if (total === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="p-5 rounded-full bg-slate-100 mb-6">
          <BarChart2 className="h-12 w-12 text-slate-400" />
        </div>
        <h3 className="text-xl font-bold text-slate-900 mb-2">No Data Found</h3>
        <p className="text-slate-500 text-sm max-w-xs">
          No student results are available for analysis yet.
        </p>
      </div>
    );
  }

  // SVG dimensions
  const cx = 190;
  const cy = 190;
  const outerR = 140;
  const innerR = 80;

  // Build segments (skip zero-count bands)
  const segments: {
    range: (typeof RANGES[0]) & { count: number };
    startAngle: number;
    endAngle: number;
  }[] = [];
  let cur = 0;
  distribution.forEach(range => {
    if (range.count === 0) return;
    const sweep = (range.count / total) * 360;
    segments.push({ range, startAngle: cur, endAngle: cur + sweep });
    cur += sweep;
  });

  const toRad = (d: number) => (d - 90) * (Math.PI / 180);

  return (
    <div className="space-y-8 p-6 lg:p-10">
      {/* Title */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-slate-900">
          {type === 'lab' ? 'Lab Performance Distribution' : 'Performance Distribution'}
        </h2>
        <p className="text-slate-500 text-sm mt-1">
          {type === 'lab' ? 'Lab marks percentage breakdown for ' : 'Final result percentage breakdown for all '}
          <strong>{total}</strong> enrolled students
        </p>
      </div>

      {/* Chart + Legend side-by-side */}
      <div className="flex flex-col lg:flex-row items-center justify-center gap-12">

        {/* ── Donut Chart ── */}
        <div className="shrink-0">
          <svg
            width="380"
            height="380"
            viewBox="0 0 380 380"
            style={{ overflow: 'visible' }}
          >
            {/* ── Slices ── */}
            {segments.length === 0 ? (
              // All zeros – grey ring placeholder
              <circle cx={cx} cy={cy} r={outerR} fill="#e2e8f0" />
            ) : (
              segments.map(({ range, startAngle, endAngle }, idx) => {
                const midAngle  = (startAngle + endAngle) / 2;
                const midRad    = toRad(midAngle);
                const pct       = Math.round((range.count / total) * 100);

                // Callout positions
                const calloutR  = outerR + 22;
                const calloutX  = cx + calloutR * Math.cos(midRad);
                const calloutY  = cy + calloutR * Math.sin(midRad);
                const lineX2    = cx + (outerR + 10) * Math.cos(midRad);
                const lineY2    = cy + (outerR + 10) * Math.sin(midRad);
                const anchor    = calloutX > cx ? 'start' : 'end';

                return (
                  <g key={idx}>
                    {/* Slice arc */}
                    <path
                      d={donutPath(cx, cy, outerR, innerR, startAngle, endAngle)}
                      fill={range.color}
                      opacity={0.9}
                    />
                    {/* Callout only for slices ≥ 5% */}
                    {pct >= 5 && (
                      <>
                        <line
                          x1={cx + (outerR + 2) * Math.cos(midRad)}
                          y1={cy + (outerR + 2) * Math.sin(midRad)}
                          x2={lineX2} y2={lineY2}
                          stroke={range.color} strokeWidth="1.5" strokeDasharray="3 2"
                        />
                        <text
                          x={calloutX} y={calloutY - 7}
                          textAnchor={anchor} fontSize="12" fontWeight="700"
                          fill={range.color}
                        >
                          {pct}%
                        </text>
                        <text
                          x={calloutX} y={calloutY + 9}
                          textAnchor={anchor} fontSize="10.5"
                          fill="#475569"
                        >
                          {range.count} {range.count === 1 ? 'student' : 'students'}
                        </text>
                      </>
                    )}
                  </g>
                );
              })
            )}

            {/* ── Donut hole ── */}
            <circle cx={cx} cy={cy} r={innerR} fill="white" />

            {/* ── Centre label ── */}
            <text x={cx} y={cy - 12} textAnchor="middle" fontSize="30" fontWeight="800" fill="#0f172a">
              {total}
            </text>
            <text x={cx} y={cy + 14} textAnchor="middle" fontSize="13" fill="#64748b" fontWeight="500">
              Students
            </text>
          </svg>
        </div>

        {/* ── Legend ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-sm">
          {distribution.map((range, idx) => {
            const pct = total > 0 ? Math.round((range.count / total) * 100) : 0;
            return (
              <div
                key={idx}
                className="flex items-center gap-3 p-3 rounded-xl border"
                style={{ borderColor: `${range.color}40`, backgroundColor: range.lightColor }}
              >
                <div
                  className="w-3.5 h-3.5 rounded-full shrink-0"
                  style={{ backgroundColor: range.color }}
                />
                <div>
                  <p className="text-xs font-semibold text-slate-700">{range.label}</p>
                  <p className="text-xl font-bold leading-tight" style={{ color: range.color }}>
                    {range.count}
                    <span className="text-xs font-normal text-slate-500 ml-1.5">({pct}%)</span>
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
