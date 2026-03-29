import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { NeutralMarketLog, NeutralMarketSummary, Instrument } from '../types';
import {
    marketAnalysisApi,
    LogsQueryParams,
    getRegimeLabel,
    getBreakoutRiskLabel,
    formatConfidence,
    formatScore,
    formatTimeFromISO,
} from '../services/marketAnalysisService';

// ─── Helpers ───────────────────────────────────────────────

const getTodayString = (): string => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// ─── Inline Sub-components ─────────────────────────────────

const MaStat: React.FC<{ title: string; value: string; colorClass?: string; subtitle?: string }> = ({
    title, value, colorClass = 'text-slate-200', subtitle,
}) => (
    <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-700/50">
        <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">{title}</p>
        <p className={`text-lg font-bold font-mono ${colorClass}`}>{value}</p>
        {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
    </div>
);

// ─── Regime Distribution Donut ─────────────────────────────

const RegimeDonut: React.FC<{ distribution: Record<string, number> }> = ({ distribution }) => {
    if (!distribution) return <p className="text-sm text-slate-500 text-center py-8">No data</p>;
    const vals = Object.values(distribution) as number[];
    const total = vals.reduce((s, v) => s + v, 0);
    if (total === 0) return <p className="text-sm text-slate-500 text-center py-8">No data</p>;

    const strong = (distribution['STRONG_NEUTRAL'] || 0) as number;
    const weak = (distribution['WEAK_NEUTRAL'] || 0) as number;
    const trending = (distribution['TRENDING'] || 0) as number;

    const cx = 60, cy = 60, r = 40;
    const circumference = 2 * Math.PI * r;
    const strongPct = strong / total;
    const weakPct = weak / total;
    // trendingPct is the remainder

    const strongDash = circumference * strongPct;
    const weakDash = circumference * weakPct;
    const trendingDash = circumference * (1 - strongPct - weakPct);

    const strongOffset = 0;
    const weakOffset = -strongDash;
    const trendingOffset = -(strongDash + weakDash);

    return (
        <div className="flex flex-col items-center">
            <svg width="120" height="120" viewBox="0 0 120 120" className="w-28 h-28">
                {/* Trending (red) — base circle */}
                <circle cx={cx} cy={cy} r={r} fill="none" stroke="#EF4444" strokeOpacity="0.6"
                    strokeWidth="12" strokeDasharray={`${trendingDash} ${circumference - trendingDash}`}
                    strokeDashoffset={trendingOffset} transform={`rotate(-90 ${cx} ${cy})`} />
                {/* Weak Neutral (yellow) */}
                <circle cx={cx} cy={cy} r={r} fill="none" stroke="#FACC15" strokeOpacity="0.7"
                    strokeWidth="12" strokeDasharray={`${weakDash} ${circumference - weakDash}`}
                    strokeDashoffset={weakOffset} transform={`rotate(-90 ${cx} ${cy})`} />
                {/* Strong Neutral (green) */}
                <circle cx={cx} cy={cy} r={r} fill="none" stroke="#22C55E" strokeOpacity="0.85"
                    strokeWidth="12" strokeDasharray={`${strongDash} ${circumference - strongDash}`}
                    strokeDashoffset={strongOffset} transform={`rotate(-90 ${cx} ${cy})`} />
                <text x={cx} y={cy - 5} textAnchor="middle" className="text-xs fill-slate-400">Regime</text>
                <text x={cx} y={cy + 12} textAnchor="middle" className="text-sm font-bold fill-slate-200">{total}</text>
            </svg>
            <div className="flex gap-3 mt-2 text-xs">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> Strong ({strong})</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" /> Weak ({weak})</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> Trend ({trending})</span>
            </div>
        </div>
    );
};

// ─── Veto Reasons Bar ──────────────────────────────────────

const VetoBar: React.FC<{ distribution: Record<string, number> }> = ({ distribution }) => {
    if (!distribution) return <p className="text-sm text-slate-500 text-center py-8">No vetoes fired</p>;
    const entries = Object.entries(distribution) as [string, number][];
    if (entries.length === 0) return <p className="text-sm text-slate-500 text-center py-8">No vetoes fired</p>;

    const maxVal = Math.max(...entries.map(([, v]) => v), 1);

    return (
        <div className="space-y-2">
            {entries.map(([reason, count]) => (
                <div key={reason} className="flex items-center gap-2">
                    <span className="text-xs text-slate-400 w-32 truncate">{reason}</span>
                    <div className="flex-1 h-5 bg-slate-700/50 rounded overflow-hidden">
                        <div className="h-full bg-red-500/60 rounded transition-all" style={{ width: `${(count / maxVal) * 100}%` }} />
                    </div>
                    <span className="text-xs font-mono text-slate-300 w-8 text-right">{count}</span>
                </div>
            ))}
        </div>
    );
};

// ─── Signal Pass Rate Table ────────────────────────────────

const SIGNAL_DISPLAY_NAMES: Record<string, string> = {
    'VWAP_PROXIMITY': 'VWAP Proximity (R1)',
    'RANGE_COMPRESSION': 'Range Compression (R2)',
    'OSCILLATION': 'Oscillation (R3)',
    'ADX_TREND': 'ADX Trend (R4)',
    'GAMMA_PIN': 'Gamma Pin (R5)',
    'MICRO_VWAP_PULLBACK': 'VWAP Pullback (M1)',
    'MICRO_HF_OSCILLATION': 'HF Oscillation (M2)',
    'MICRO_RANGE_STABILITY': 'Range Stability (M3)',
};

const parsePassRate = (value: string): { passed: number; total: number; pct: number } => {
    const m = value.match(/(\d+)\/(\d+)\s*\((\d+\.?\d*)%\)/);
    if (!m) return { passed: 0, total: 0, pct: 0 };
    return { passed: parseInt(m[1]), total: parseInt(m[2]), pct: parseFloat(m[3]) };
};

const SignalPassRateTable: React.FC<{ rates: Record<string, string> }> = ({ rates }) => {
    if (!rates) return <p className="text-sm text-slate-500 text-center py-4">No signal data</p>;
    const entries = Object.entries(rates) as [string, string][];
    if (entries.length === 0) return <p className="text-sm text-slate-500 text-center py-4">No signal data</p>;

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b border-slate-700 bg-slate-700/50">
                        <th className="text-left p-2 text-xs text-slate-400">Signal</th>
                        <th className="text-right p-2 text-xs text-slate-400">Pass Rate</th>
                        <th className="text-left p-2 text-xs text-slate-400 w-40">Distribution</th>
                    </tr>
                </thead>
                <tbody>
                    {entries.map(([signal, value]) => {
                        const { pct } = parsePassRate(value);
                        const barColor = pct >= 70 ? 'bg-green-500/70' : pct >= 40 ? 'bg-yellow-500/70' : 'bg-red-500/70';
                        return (
                            <tr key={signal} className="border-b border-slate-700/50 last:border-b-0">
                                <td className="p-2 text-slate-300">{SIGNAL_DISPLAY_NAMES[signal] || signal}</td>
                                <td className="p-2 text-right font-mono text-slate-200">{value}</td>
                                <td className="p-2">
                                    <div className="h-3 bg-slate-700/50 rounded overflow-hidden">
                                        <div className={`h-full rounded transition-all ${barColor}`} style={{ width: `${pct}%` }} />
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};

// ─── Timeline Chart ────────────────────────────────────────

const TimelineChart: React.FC<{ logs: NeutralMarketLog[] }> = ({ logs }) => {
    if (logs.length === 0) return <p className="text-sm text-slate-500 text-center py-8">No evaluation logs available</p>;

    const width = 800, height = 300;
    const margin = { top: 20, right: 20, bottom: 40, left: 50 };
    const cw = width - margin.left - margin.right;
    const ch = height - margin.top - margin.bottom;

    const yMin = 0, yMax = 15;
    const yScale = (v: number) => ch - ((v - yMin) / (yMax - yMin)) * ch;

    // Parse times to minutes since 09:15
    const parseMinutes = (iso: string): number => {
        const time = iso.split('T')[1];
        if (!time) return 0;
        const [h, m] = time.split(':').map(Number);
        return (h * 60 + m) - (9 * 60 + 15);
    };
    const maxMinutes = (15 * 60 + 10) - (9 * 60 + 15); // 09:15 to 15:10 = 355 min
    const xScale = (minutes: number) => Math.max(0, Math.min(cw, (minutes / maxMinutes) * cw));

    // Y-axis ticks
    const yTicks = [0, 3, 6, 9, 12, 15];

    // X-axis time labels
    const xLabels = ['09:15', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00'];
    const xLabelMinutes = xLabels.map(l => {
        const [h, m] = l.split(':').map(Number);
        return (h * 60 + m) - (9 * 60 + 15);
    });

    const regimeColor = (regime: string) => {
        switch (regime) {
            case 'STRONG_NEUTRAL': return '#22C55E';
            case 'WEAK_NEUTRAL': return '#FACC15';
            case 'TRENDING': return '#EF4444';
            default: return '#94A3B8';
        }
    };

    return (
        <div className="w-full overflow-x-auto">
            <svg viewBox={`0 0 ${width} ${height}`} className="min-w-[600px]">
                <g transform={`translate(${margin.left}, ${margin.top})`}>
                    {/* Grid lines + Y labels */}
                    {yTicks.map(tick => (
                        <g key={tick}>
                            <line x1={0} x2={cw} y1={yScale(tick)} y2={yScale(tick)}
                                stroke="#475569" strokeWidth="0.5" strokeDasharray="2,3" />
                            <text x={-10} y={yScale(tick)} dy="0.32em" textAnchor="end"
                                className="text-xs fill-slate-500">{tick}</text>
                        </g>
                    ))}

                    {/* Regime threshold line at score 6 */}
                    <line x1={0} x2={cw} y1={yScale(6)} y2={yScale(6)}
                        stroke="#22C55E" strokeWidth="0.8" strokeDasharray="6,3" strokeOpacity="0.4" />
                    <text x={cw + 4} y={yScale(6)} dy="0.32em" className="text-[9px] fill-green-500/50">Strong</text>

                    {/* Regime threshold line at score 3 */}
                    <line x1={0} x2={cw} y1={yScale(3)} y2={yScale(3)}
                        stroke="#FACC15" strokeWidth="0.8" strokeDasharray="6,3" strokeOpacity="0.4" />
                    <text x={cw + 4} y={yScale(3)} dy="0.32em" className="text-[9px] fill-yellow-500/50">Weak</text>

                    {/* X-axis labels */}
                    {xLabels.map((label, i) => (
                        <text key={label} x={xScale(xLabelMinutes[i])} y={ch + 25}
                            textAnchor="middle" className="text-xs fill-slate-500">{label}</text>
                    ))}

                    {/* Y-axis title */}
                    <text x={-35} y={ch / 2} textAnchor="middle" className="text-xs fill-slate-400"
                        transform={`rotate(-90, -35, ${ch / 2})`}>Score</text>

                    {/* Data points */}
                    {logs.map((log) => {
                        const x = xScale(parseMinutes(log.evaluatedAt));
                        const y = yScale(log.finalScore);
                        const color = regimeColor(log.regime);

                        if (log.vetoReason) {
                            // Vetoed — draw ✗
                            const s = 4;
                            return (
                                <g key={log.id}>
                                    <line x1={x - s} y1={y - s} x2={x + s} y2={y + s} stroke="#EF4444" strokeWidth="1.5" />
                                    <line x1={x + s} y1={y - s} x2={x - s} y2={y + s} stroke="#EF4444" strokeWidth="1.5" />
                                </g>
                            );
                        }

                        return (
                            <circle key={log.id} cx={x} cy={y} r={2.5} fill={color} opacity={0.8}>
                                <title>{`${formatTimeFromISO(log.evaluatedAt)} | Score: ${log.finalScore} | ${log.regime}${log.tradable ? '' : ' (skip)'}`}</title>
                            </circle>
                        );
                    })}
                </g>
            </svg>
        </div>
    );
};

// ─── Log Detail Table ──────────────────────────────────────

const SIGNAL_DETAILS = [
    { key: 'vwapProximityPassed', label: 'VWAP Proximity (R1)', valueKey: 'vwapDeviation', valueLabel: 'Deviation', format: (v: number | null) => v !== null ? (v * 100).toFixed(3) + '%' : '—' },
    { key: 'rangeCompressionPassed', label: 'Range Compression (R2)', valueKey: 'rangeFraction', valueLabel: 'Range Fraction', format: (v: number | null) => v !== null ? (v * 100).toFixed(3) + '%' : '—' },
    { key: 'oscillationPassed', label: 'Oscillation (R3)', valueKey: 'oscillationReversals', valueLabel: 'Reversals', format: (v: number | null) => v !== null ? String(v) : '—' },
    { key: 'adxPassed', label: 'ADX Trend (R4)', valueKey: 'adxValue', valueLabel: 'ADX', format: (v: number | null) => v !== null ? v.toFixed(2) : '—' },
    { key: 'gammaPinPassed', label: 'Gamma Pin (R5)', valueKey: 'expiryDay', valueLabel: 'Expiry Day', format: (v: boolean) => v ? 'Yes' : 'No' },
    { key: 'microVwapPullbackPassed', label: 'VWAP Pullback (M1)', valueKey: null, valueLabel: '', format: () => '' },
    { key: 'microHfOscillationPassed', label: 'HF Oscillation (M2)', valueKey: null, valueLabel: '', format: () => '' },
    { key: 'microRangeStabilityPassed', label: 'Range Stability (M3)', valueKey: null, valueLabel: '', format: () => '' },
    { key: 'breakoutRiskLow', label: 'Breakout Risk Safe', valueKey: null, valueLabel: '', format: () => '' },
    { key: 'excessiveRangeSafe', label: 'Range Safe', valueKey: null, valueLabel: '', format: () => '' },
] as const;

const LogDetailTable: React.FC<{ logs: NeutralMarketLog[] }> = ({ logs }) => {
    const [expandedId, setExpandedId] = useState<number | null>(null);

    if (logs.length === 0) return <p className="text-sm text-slate-500 text-center py-8">No logs found for the selected filters</p>;

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b border-slate-700 bg-slate-700/50">
                        <th className="text-left p-2 text-xs text-slate-400">Time</th>
                        <th className="text-right p-2 text-xs text-slate-400">Spot</th>
                        <th className="text-right p-2 text-xs text-slate-400">VWAP</th>
                        <th className="text-center p-2 text-xs text-slate-400">Regime</th>
                        <th className="text-center p-2 text-xs text-slate-400">Score</th>
                        <th className="text-center p-2 text-xs text-slate-400">Confidence</th>
                        <th className="text-center p-2 text-xs text-slate-400">Tradable</th>
                        <th className="text-center p-2 text-xs text-slate-400">Veto</th>
                    </tr>
                </thead>
                <tbody>
                    {logs.map((log) => {
                        const regime = getRegimeLabel(log.regime);
                        const isExpanded = expandedId === log.id;

                        return (
                            <React.Fragment key={log.id}>
                                <tr
                                    className={`border-b border-slate-700/50 cursor-pointer transition-colors hover:bg-slate-700/30 ${
                                        log.tradable ? 'bg-green-500/5' : 'bg-red-500/5'
                                    }`}
                                    onClick={() => setExpandedId(isExpanded ? null : log.id)}
                                >
                                    <td className="p-2 font-mono text-slate-300">{formatTimeFromISO(log.evaluatedAt)}</td>
                                    <td className="p-2 text-right font-mono text-slate-200">{log.spotPrice.toFixed(2)}</td>
                                    <td className="p-2 text-right font-mono text-slate-200">{log.vwapValue?.toFixed(2) ?? '—'}</td>
                                    <td className="p-2 text-center">
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${regime.bgClass}`}>{regime.label}</span>
                                    </td>
                                    <td className="p-2 text-center font-mono text-slate-200">{formatScore(log.finalScore, 15)}</td>
                                    <td className="p-2 text-center font-mono text-slate-200">{formatConfidence(log.confidence)}</td>
                                    <td className="p-2 text-center">
                                        {log.tradable
                                            ? <span className="text-green-400 font-semibold">✓</span>
                                            : <span className="text-red-400 font-semibold">✗</span>}
                                    </td>
                                    <td className="p-2 text-center">
                                        {log.vetoReason
                                            ? <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/20 text-red-400">{log.vetoReason}</span>
                                            : <span className="text-slate-500">—</span>}
                                    </td>
                                </tr>
                                {isExpanded && (
                                    <tr className="bg-slate-800/80">
                                        <td colSpan={8} className="p-3">
                                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 text-xs">
                                                <div className="bg-slate-900/50 p-2 rounded">
                                                    <span className="text-slate-400">Regime Score:</span>
                                                    <span className="ml-1 font-mono text-slate-200">{formatScore(log.regimeScore, 9)}</span>
                                                </div>
                                                <div className="bg-slate-900/50 p-2 rounded">
                                                    <span className="text-slate-400">Micro Score:</span>
                                                    <span className="ml-1 font-mono text-slate-200">{formatScore(log.microScore, 5)}</span>
                                                </div>
                                                <div className="bg-slate-900/50 p-2 rounded">
                                                    <span className="text-slate-400">Time Adj:</span>
                                                    <span className="ml-1 font-mono text-slate-200">{log.timeAdjustment ?? 0}</span>
                                                </div>
                                                <div className="bg-slate-900/50 p-2 rounded">
                                                    <span className="text-slate-400">Breakout Risk:</span>
                                                    <span className={`ml-1 font-medium ${getBreakoutRiskLabel(log.breakoutRisk).colorClass}`}>{log.breakoutRisk}</span>
                                                </div>
                                                <div className="bg-slate-900/50 p-2 rounded">
                                                    <span className="text-slate-400">Eval Duration:</span>
                                                    <span className="ml-1 font-mono text-slate-200">{log.evaluationDurationMs ?? '—'}ms</span>
                                                </div>
                                            </div>
                                            <div className="mt-2 grid grid-cols-2 md:grid-cols-5 gap-1 text-xs">
                                                {SIGNAL_DETAILS.map(({ key, label, valueKey, valueLabel, format }) => {
                                                    const passed = (log as any)[key] as boolean;
                                                    const raw = valueKey ? (log as any)[valueKey] : null;
                                                    return (
                                                        <div key={key} className={`p-1.5 rounded flex items-center gap-1 ${passed ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                                                            <span className={`font-semibold ${passed ? 'text-green-400' : 'text-red-400'}`}>{passed ? '✓' : '✗'}</span>
                                                            <span className="text-slate-400">{label}</span>
                                                            {valueKey && raw !== null && raw !== undefined && (
                                                                <span className="ml-auto font-mono text-slate-300">{(format as (v: any) => string)(raw)}</span>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                            {log.summary && (
                                                <p className="mt-2 text-xs font-mono text-slate-500 bg-slate-900/50 p-1.5 rounded">{log.summary}</p>
                                            )}
                                        </td>
                                    </tr>
                                )}
                            </React.Fragment>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};

// ─── Tradable Donut ────────────────────────────────────────

const TradableDonut: React.FC<{ tradable: number; skipped: number }> = ({ tradable, skipped }) => {
    const total = tradable + skipped;
    if (total === 0) return null;
    const pct = tradable / total;
    const cx = 60, cy = 60, r = 40;
    const circumference = 2 * Math.PI * r;

    return (
        <div className="flex flex-col items-center">
            <svg width="120" height="120" viewBox="0 0 120 120" className="w-28 h-28">
                <circle cx={cx} cy={cy} r={r} fill="none" stroke="#EF4444" strokeOpacity="0.6"
                    strokeWidth="12" />
                <circle cx={cx} cy={cy} r={r} fill="none" stroke="#22C55E" strokeOpacity="0.85"
                    strokeWidth="12"
                    strokeDasharray={`${circumference * pct} ${circumference * (1 - pct)}`}
                    transform={`rotate(-90 ${cx} ${cy})`} />
                <text x={cx} y={cy - 3} textAnchor="middle" className="text-lg font-bold fill-slate-200">
                    {(pct * 100).toFixed(0)}%
                </text>
                <text x={cx} y={cy + 12} textAnchor="middle" className="text-[10px] fill-slate-400">Tradable</text>
            </svg>
        </div>
    );
};

// ─── Main Page Component ───────────────────────────────────

const MarketAnalysisPage: React.FC = () => {
    // Mode & filters
    const [mode, setMode] = useState<'summary' | 'logs'>('summary');
    const [summaryDate, setSummaryDate] = useState(getTodayString());
    const [logsDate, setLogsDate] = useState(getTodayString());
    const [logsFrom, setLogsFrom] = useState('');
    const [logsTo, setLogsTo] = useState('');
    const [logsDateMode, setLogsDateMode] = useState<'single' | 'range'>('single');
    const [instrument, setInstrument] = useState('');

    // Data
    const [summary, setSummary] = useState<NeutralMarketSummary | null>(null);
    const [logs, setLogs] = useState<NeutralMarketLog[]>([]);

    // UI state
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const inputClass = 'w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-kite-blue disabled:opacity-50';
    const labelClass = 'block text-xs font-medium text-slate-400 mb-1';

    // ─── Fetch Summary ─────────────────────────────────────

    const fetchSummary = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await marketAnalysisApi.getSummary(summaryDate);
            if (res.success && res.data) {
                setSummary(res.data);
            } else {
                setSummary(null);
                setError(res.message || 'No summary data available');
            }
        } catch (e) {
            setSummary(null);
            setError((e as Error).message);
        } finally {
            setIsLoading(false);
        }
    }, [summaryDate]);

    // ─── Fetch Logs ────────────────────────────────────────

    const fetchLogs = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const params: LogsQueryParams = {};
            if (logsDateMode === 'single') {
                params.date = logsDate;
            } else {
                params.from = logsFrom;
                params.to = logsTo;
            }
            if (instrument) params.instrument = instrument;

            const res = await marketAnalysisApi.getLogs(params);
            if (res.success && res.data) {
                setLogs(res.data);
            } else {
                setLogs([]);
                setError(res.message || 'No log data available');
            }
        } catch (e) {
            setLogs([]);
            setError((e as Error).message);
        } finally {
            setIsLoading(false);
        }
    }, [logsDateMode, logsDate, logsFrom, logsTo, instrument]);

    // ─── Auto-fetch on mode / filter change ────────────────

    useEffect(() => {
        if (mode === 'summary') {
            fetchSummary();
        }
    }, [mode, fetchSummary]);

    useEffect(() => {
        if (mode === 'logs') {
            fetchLogs();
        }
    }, [mode, fetchLogs]);

    // ─── Computed stats for summary ────────────────────────

    const summaryStats = useMemo(() => {
        if (!summary) return null;
        const tradablePctColor = summary.tradablePercentage >= 50 ? 'text-green-400' : 'text-red-400';
        return { tradablePctColor };
    }, [summary]);

    // ─── Render ────────────────────────────────────────────

    return (
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-200">Market Analysis</h1>
                    <p className="text-sm text-slate-400">Neutral Market Detection Engine — Evaluation Logs & Summary</p>
                </div>
            </div>

            {/* Controls */}
            <div className="bg-slate-800 p-4 rounded-lg border border-slate-700 mb-6">
                <div className="flex flex-col md:flex-row items-start md:items-end gap-4">
                    {/* Mode Toggle */}
                    <div>
                        <label className={labelClass}>View</label>
                        <div className="flex bg-slate-900 border border-slate-700 rounded-md overflow-hidden">
                            <button
                                onClick={() => setMode('summary')}
                                className={`px-4 py-1.5 text-sm font-medium transition-colors ${
                                    mode === 'summary' ? 'bg-kite-blue text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                                }`}
                            >Summary</button>
                            <button
                                onClick={() => setMode('logs')}
                                className={`px-4 py-1.5 text-sm font-medium transition-colors ${
                                    mode === 'logs' ? 'bg-kite-blue text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                                }`}
                            >Logs</button>
                        </div>
                    </div>

                    {mode === 'summary' ? (
                        /* Summary: single date */
                        <div>
                            <label className={labelClass}>Date</label>
                            <input type="date" value={summaryDate} max={getTodayString()}
                                onChange={e => setSummaryDate(e.target.value)}
                                className={inputClass} style={{ width: '180px' }} />
                        </div>
                    ) : (
                        /* Logs: date mode toggle + inputs + instrument */
                        <>
                            <div>
                                <label className={labelClass}>Date Mode</label>
                                <div className="flex bg-slate-900 border border-slate-700 rounded-md overflow-hidden">
                                    <button
                                        onClick={() => setLogsDateMode('single')}
                                        className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                                            logsDateMode === 'single' ? 'bg-kite-blue text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                                        }`}
                                    >Single</button>
                                    <button
                                        onClick={() => setLogsDateMode('range')}
                                        className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                                            logsDateMode === 'range' ? 'bg-kite-blue text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                                        }`}
                                    >Range</button>
                                </div>
                            </div>

                            {logsDateMode === 'single' ? (
                                <div>
                                    <label className={labelClass}>Date</label>
                                    <input type="date" value={logsDate} max={getTodayString()}
                                        onChange={e => setLogsDate(e.target.value)}
                                        className={inputClass} style={{ width: '180px' }} />
                                </div>
                            ) : (
                                <>
                                    <div>
                                        <label className={labelClass}>From</label>
                                        <input type="date" value={logsFrom} max={getTodayString()}
                                            onChange={e => setLogsFrom(e.target.value)}
                                            className={inputClass} style={{ width: '180px' }} />
                                    </div>
                                    <div>
                                        <label className={labelClass}>To</label>
                                        <input type="date" value={logsTo} max={getTodayString()}
                                            onChange={e => setLogsTo(e.target.value)}
                                            className={inputClass} style={{ width: '180px' }} />
                                    </div>
                                </>
                            )}

                            <div>
                                <label className={labelClass}>Instrument</label>
                                <select value={instrument} onChange={e => setInstrument(e.target.value)}
                                    className={inputClass} style={{ width: '150px' }}>
                                    <option value="">All</option>
                                    {Object.values(Instrument).map(inst => (
                                        <option key={inst} value={inst}>{inst}</option>
                                    ))}
                                </select>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Error Banner */}
            {error && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-md text-red-400 text-sm flex items-center">
                    <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {error}
                    <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-300 pl-3">✕</button>
                </div>
            )}

            {/* Loading */}
            {isLoading && (
                <div className="mb-4 p-3 bg-slate-800 border border-slate-700 rounded-md text-slate-300 text-sm flex items-center">
                    <svg className="animate-spin h-4 w-4 mr-2 text-kite-blue" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Loading {mode === 'summary' ? 'summary' : 'evaluation logs'}...
                </div>
            )}

            {/* ═══ Summary View ═══════════════════════════════ */}
            {mode === 'summary' && summary && summaryStats && (
                <div className="space-y-6">
                    {/* Stat Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                        <MaStat title="Total Evaluations" value={String(summary.totalEvaluations)} />
                        <MaStat title="Tradable %" value={`${summary.tradablePercentage.toFixed(1)}%`}
                            colorClass={summaryStats.tradablePctColor}
                            subtitle={`${summary.tradableCount} / ${summary.totalEvaluations}`} />
                        <MaStat title="Avg Regime Score" value={summary.avgRegimeScore !== null ? formatScore(Math.round(summary.avgRegimeScore * 10) / 10, 9) : '—'}
                            subtitle="0–9 scale" />
                        <MaStat title="Avg Micro Score" value={summary.avgMicroScore !== null ? formatScore(Math.round(summary.avgMicroScore * 10) / 10, 5) : '—'}
                            subtitle="0–5 scale" />
                        <MaStat title="Avg Confidence" value={summary.avgConfidence !== null ? formatConfidence(summary.avgConfidence) : '—'}
                            colorClass={summary.avgConfidence !== null && summary.avgConfidence >= 0.5 ? 'text-green-400' : 'text-yellow-400'} />
                        <MaStat title="Avg Eval Duration" value={summary.avgEvaluationDurationMs !== null ? `${summary.avgEvaluationDurationMs.toFixed(1)}ms` : '—'}
                            colorClass="text-slate-300" />
                    </div>

                    {/* Charts Row */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Tradable Donut */}
                        <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
                            <h3 className="text-sm font-semibold text-slate-300 mb-3 text-center">Tradable vs Skipped</h3>
                            <TradableDonut tradable={summary.tradableCount} skipped={summary.skippedCount} />
                        </div>
                        {/* Regime Distribution Donut */}
                        <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
                            <h3 className="text-sm font-semibold text-slate-300 mb-3 text-center">Regime Distribution</h3>
                            <RegimeDonut distribution={summary.regimeDistribution} />
                        </div>
                        {/* Veto Reasons */}
                        <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
                            <h3 className="text-sm font-semibold text-slate-300 mb-3">Veto Reasons</h3>
                            <VetoBar distribution={summary.vetoReasonDistribution} />
                        </div>
                    </div>

                    {/* Signal Pass Rates */}
                    <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
                        <h3 className="text-sm font-semibold text-slate-300 mb-3">Signal Pass Rates</h3>
                        <SignalPassRateTable rates={summary.signalPassRates} />
                    </div>
                </div>
            )}

            {/* Empty summary state */}
            {mode === 'summary' && !summary && !isLoading && !error && (
                <div className="text-center py-12 text-slate-500">
                    <p className="text-lg">No summary data available</p>
                    <p className="text-sm mt-1">Select a date with market evaluations</p>
                </div>
            )}

            {/* ═══ Logs View ═════════════════════════════════ */}
            {mode === 'logs' && !isLoading && (
                <div className="space-y-6">
                    {/* Timeline Chart */}
                    {logs.length > 0 && (
                        <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
                            <div className="flex justify-between items-center mb-3">
                                <h3 className="text-sm font-semibold text-slate-300">Score Timeline</h3>
                                <span className="text-xs text-slate-500">{logs.length} evaluations</span>
                            </div>
                            <TimelineChart logs={logs} />
                            <div className="flex gap-4 mt-2 text-xs text-slate-500 justify-center">
                                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> Strong Neutral</span>
                                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" /> Weak Neutral</span>
                                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> Trending</span>
                                <span className="flex items-center gap-1"><span className="text-red-400">✗</span> Vetoed</span>
                            </div>
                        </div>
                    )}

                    {/* Log Detail Table */}
                    <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
                        <div className="flex justify-between items-center mb-3">
                            <h3 className="text-sm font-semibold text-slate-300">Evaluation Logs</h3>
                            {logs.length > 0 && (
                                <span className="text-xs text-slate-500">Click a row to expand signal details</span>
                            )}
                        </div>
                        <LogDetailTable logs={logs} />
                    </div>
                </div>
            )}
        </div>
    );
};

export default MarketAnalysisPage;
