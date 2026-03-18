
import React, { useMemo } from 'react';
import { BacktestResult, BacktestTrade } from '../types';
import { getExitLabel, formatCurrency, formatPoints, formatTimeFromISO, formatPct } from '../services/backtestService';

// --- Stat Card for Backtest ---
const BtStatCard: React.FC<{
    title: string;
    value: string;
    colorClass?: string;
    subtitle?: string;
}> = ({ title, value, colorClass = 'text-slate-200', subtitle }) => (
    <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-700/50">
        <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">{title}</p>
        <p className={`text-lg font-bold font-mono ${colorClass}`}>{value}</p>
        {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
    </div>
);

// --- SVG Charts ---

const EquityCurveChart: React.FC<{ trades: BacktestTrade[] }> = ({ trades }) => {
    const cumulativePnL = useMemo(() => {
        const data: { trade: number; cumPnl: number }[] = [{ trade: 0, cumPnl: 0 }];
        let running = 0;
        trades.forEach((t, i) => {
            running += t.pnlAmount;
            data.push({ trade: i + 1, cumPnl: running });
        });
        return data;
    }, [trades]);

    if (cumulativePnL.length < 2) return null;

    const width = 400;
    const height = 200;
    const margin = { top: 15, right: 15, bottom: 30, left: 55 };
    const cw = width - margin.left - margin.right;
    const ch = height - margin.top - margin.bottom;

    const values = cumulativePnL.map(d => d.cumPnl);
    const yMin = Math.min(0, ...values);
    const yMax = Math.max(0, ...values);
    const yRange = yMax - yMin || 100;
    const yBuffer = yRange * 0.1;
    const yMinB = yMin - yBuffer;
    const yMaxB = yMax + yBuffer;

    const xScale = (i: number) => (i / (cumulativePnL.length - 1)) * cw;
    const yScale = (v: number) => ch - ((v - yMinB) / (yMaxB - yMinB)) * ch;

    const pathData = cumulativePnL.map((d, i) => `${i === 0 ? 'M' : 'L'} ${xScale(i)} ${yScale(d.cumPnl)}`).join(' ');
    const finalPnL = values[values.length - 1];

    // Area fill
    const areaPath = pathData + ` L ${xScale(cumulativePnL.length - 1)} ${yScale(0)} L ${xScale(0)} ${yScale(0)} Z`;

    return (
        <div className="bg-slate-900/40 p-3 rounded-lg border border-slate-700/50">
            <h3 className="text-sm font-semibold text-slate-300 mb-2">Equity Curve</h3>
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full">
                <g transform={`translate(${margin.left}, ${margin.top})`}>
                    {/* Zero line */}
                    <line x1={0} x2={cw} y1={yScale(0)} y2={yScale(0)} stroke="#475569" strokeWidth="1" strokeDasharray="4,3"/>
                    {/* Area */}
                    <path d={areaPath} fill={finalPnL >= 0 ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)'} />
                    {/* Line */}
                    <path d={pathData} fill="none" stroke={finalPnL >= 0 ? '#22C55E' : '#EF4444'} strokeWidth="2" />
                    {/* Y axis labels */}
                    {[yMinB, (yMinB + yMaxB) / 2, yMaxB].map((v, i) => (
                        <text key={i} x={-8} y={yScale(v)} dy="0.32em" textAnchor="end" className="text-[10px] fill-slate-500">{formatCurrency(v)}</text>
                    ))}
                    {/* X axis */}
                    <text x={0} y={ch + 18} textAnchor="start" className="text-[10px] fill-slate-500">0</text>
                    <text x={cw / 2} y={ch + 18} textAnchor="middle" className="text-[10px] fill-slate-500">Trade #</text>
                    <text x={cw} y={ch + 18} textAnchor="end" className="text-[10px] fill-slate-500">{trades.length}</text>
                </g>
            </svg>
        </div>
    );
};

const PnLBarChart: React.FC<{ trades: BacktestTrade[] }> = ({ trades }) => {
    if (trades.length === 0) return null;

    const width = 400;
    const height = 200;
    const margin = { top: 15, right: 15, bottom: 30, left: 55 };
    const cw = width - margin.left - margin.right;
    const ch = height - margin.top - margin.bottom;

    const amounts = trades.map(t => t.pnlAmount);
    const yMin = Math.min(0, ...amounts);
    const yMax = Math.max(0, ...amounts);
    const yRange = yMax - yMin || 100;
    const yBuffer = yRange * 0.1;
    const yMinB = yMin - yBuffer;
    const yMaxB = yMax + yBuffer;

    const barWidth = Math.max(4, Math.min(30, (cw / trades.length) * 0.7));
    const gap = (cw - barWidth * trades.length) / (trades.length + 1);
    const yScale = (v: number) => ch - ((v - yMinB) / (yMaxB - yMinB)) * ch;
    const zeroY = yScale(0);

    return (
        <div className="bg-slate-900/40 p-3 rounded-lg border border-slate-700/50">
            <h3 className="text-sm font-semibold text-slate-300 mb-2">P&L Per Trade</h3>
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full">
                <g transform={`translate(${margin.left}, ${margin.top})`}>
                    {/* Zero line */}
                    <line x1={0} x2={cw} y1={zeroY} y2={zeroY} stroke="#475569" strokeWidth="1"/>
                    {/* Bars */}
                    {trades.map((t, i) => {
                        const x = gap + i * (barWidth + gap);
                        const barY = yScale(t.pnlAmount);
                        const barH = Math.abs(barY - zeroY);
                        const y = t.pnlAmount >= 0 ? barY : zeroY;
                        return (
                            <rect
                                key={i}
                                x={x}
                                y={y}
                                width={barWidth}
                                height={Math.max(1, barH)}
                                rx={1}
                                fill={t.pnlAmount >= 0 ? '#22C55E' : '#EF4444'}
                                opacity={0.85}
                            />
                        );
                    })}
                    {/* Y axis labels */}
                    {[yMinB, 0, yMaxB].map((v, i) => (
                        <text key={i} x={-8} y={yScale(v)} dy="0.32em" textAnchor="end" className="text-[10px] fill-slate-500">{formatCurrency(v)}</text>
                    ))}
                    {/* X axis */}
                    <text x={cw / 2} y={ch + 18} textAnchor="middle" className="text-[10px] fill-slate-500">Trade #</text>
                </g>
            </svg>
        </div>
    );
};

const WinLossDonut: React.FC<{ wins: number; losses: number }> = ({ wins, losses }) => {
    const total = wins + losses;
    if (total === 0) return null;

    const winPct = wins / total;
    const radius = 40;
    const circumference = 2 * Math.PI * radius;
    const winStroke = circumference * winPct;
    const lossStroke = circumference * (1 - winPct);

    return (
        <div className="bg-slate-900/40 p-3 rounded-lg border border-slate-700/50 flex flex-col items-center">
            <h3 className="text-sm font-semibold text-slate-300 mb-2">Win/Loss</h3>
            <svg viewBox="0 0 120 120" className="w-28 h-28">
                {/* Loss ring (background) */}
                <circle cx="60" cy="60" r={radius} fill="none" stroke="#EF4444" strokeWidth="12" opacity="0.6"/>
                {/* Win ring (overlay) */}
                <circle
                    cx="60" cy="60" r={radius} fill="none"
                    stroke="#22C55E" strokeWidth="12"
                    strokeDasharray={`${winStroke} ${lossStroke}`}
                    strokeDashoffset={circumference * 0.25}
                    strokeLinecap="round"
                    opacity="0.85"
                />
                <text x="60" y="56" textAnchor="middle" className="text-lg font-bold fill-slate-200">{(winPct * 100).toFixed(0)}%</text>
                <text x="60" y="72" textAnchor="middle" className="text-[10px] fill-slate-400">Win Rate</text>
            </svg>
            <div className="flex space-x-4 mt-2 text-xs">
                <span className="text-green-400">● {wins} Wins</span>
                <span className="text-red-400">● {losses} Losses</span>
            </div>
        </div>
    );
};


// --- Trade History Table ---
const TradeTable: React.FC<{ trades: BacktestTrade[] }> = ({ trades }) => {
    if (trades.length === 0) {
        return <div className="text-center py-8 text-slate-400">No trades recorded.</div>;
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-700 bg-slate-700/50">
                    <tr>
                        <th className="p-2 text-xs text-slate-400">#</th>
                        <th className="p-2 text-xs text-slate-400">CE Symbol</th>
                        <th className="p-2 text-xs text-slate-400">PE Symbol</th>
                        <th className="p-2 text-xs text-slate-400">Strike</th>
                        <th className="p-2 text-xs text-slate-400">Entry</th>
                        <th className="p-2 text-xs text-slate-400 text-right">CE In</th>
                        <th className="p-2 text-xs text-slate-400 text-right">PE In</th>
                        <th className="p-2 text-xs text-slate-400 text-right">Combined In</th>
                        <th className="p-2 text-xs text-slate-400">Exit</th>
                        <th className="p-2 text-xs text-slate-400 text-right">CE Out</th>
                        <th className="p-2 text-xs text-slate-400 text-right">PE Out</th>
                        <th className="p-2 text-xs text-slate-400 text-right">Combined Out</th>
                        <th className="p-2 text-xs text-slate-400 text-right">Qty</th>
                        <th className="p-2 text-xs text-slate-400 text-right">P&L (pts)</th>
                        <th className="p-2 text-xs text-slate-400 text-right">P&L (₹)</th>
                        <th className="p-2 text-xs text-slate-400">Exit Reason</th>
                        <th className="p-2 text-xs text-slate-400"></th>
                    </tr>
                </thead>
                <tbody>
                    {trades.map(trade => {
                        const { label, bgClass } = getExitLabel(trade.exitReason);
                        const rowBg = trade.pnlAmount >= 0 ? 'bg-green-500/5' : 'bg-red-500/5';
                        return (
                            <tr key={trade.tradeNumber} className={`border-b border-slate-700/50 last:border-b-0 ${rowBg}`}>
                                <td className="p-2 font-mono text-slate-300">{trade.tradeNumber}</td>
                                <td className="p-2 font-mono text-xs text-slate-300">{trade.ceSymbol}</td>
                                <td className="p-2 font-mono text-xs text-slate-300">{trade.peSymbol}</td>
                                <td className="p-2 font-mono text-slate-300">{trade.strikePrice.toLocaleString()}</td>
                                <td className="p-2 font-mono text-xs text-slate-400">{formatTimeFromISO(trade.entryTime)}</td>
                                <td className="p-2 font-mono text-right text-slate-300">₹{trade.ceEntryPrice.toFixed(2)}</td>
                                <td className="p-2 font-mono text-right text-slate-300">₹{trade.peEntryPrice.toFixed(2)}</td>
                                <td className="p-2 font-mono text-right text-slate-200 font-semibold">₹{trade.combinedEntryPremium.toFixed(2)}</td>
                                <td className="p-2 font-mono text-xs text-slate-400">{formatTimeFromISO(trade.exitTime)}</td>
                                <td className="p-2 font-mono text-right text-slate-300">₹{trade.ceExitPrice.toFixed(2)}</td>
                                <td className="p-2 font-mono text-right text-slate-300">₹{trade.peExitPrice.toFixed(2)}</td>
                                <td className="p-2 font-mono text-right text-slate-200 font-semibold">₹{trade.combinedExitPremium.toFixed(2)}</td>
                                <td className="p-2 font-mono text-right text-slate-300">{trade.quantity}</td>
                                <td className={`p-2 font-mono text-right font-semibold ${trade.pnlPoints >= 0 ? 'text-profit' : 'text-loss'}`}>
                                    {formatPoints(trade.pnlPoints)}
                                </td>
                                <td className={`p-2 font-mono text-right font-semibold ${trade.pnlAmount >= 0 ? 'text-profit' : 'text-loss'}`}>
                                    {formatCurrency(trade.pnlAmount)}
                                </td>
                                <td className="p-2">
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${bgClass}`}>{label}</span>
                                </td>
                                <td className="p-2">
                                    {trade.wasRestarted && (
                                        <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-blue-500/20 text-blue-400">Restart</span>
                                    )}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};

// --- Main Result View ---

interface BacktestResultViewProps {
    result: BacktestResult;
    title?: string;
}

const BacktestResultView: React.FC<BacktestResultViewProps> = ({ result, title }) => {
    const pnlColor = result.totalPnLAmount >= 0 ? 'text-profit' : 'text-loss';
    const winRateColor = result.winRate >= 50 ? 'text-green-400' : 'text-red-400';
    const pfColor = result.profitFactor > 1 ? 'text-green-400' : 'text-red-400';

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between">
                <div>
                    <h2 className="text-lg font-semibold text-slate-200">
                        {title || `Results — ${result.backtestDate}`}
                    </h2>
                    <div className="flex items-center space-x-3 mt-1 text-sm text-slate-400">
                        <span>{result.strategyType.replace(/_/g, ' ')}</span>
                        <span>•</span>
                        <span>{result.instrumentType}</span>
                        <span>•</span>
                        <span
                            className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                                result.status === 'COMPLETED' ? 'bg-green-500/20 text-green-400' :
                                result.status === 'FAILED' ? 'bg-red-500/20 text-red-400' :
                                'bg-blue-500/20 text-blue-400 animate-pulse'
                            }`}
                        >
                            {result.status}
                        </span>
                    </div>
                </div>
                <div className="text-xs text-slate-500 mt-2 md:mt-0">
                    Execution: {(result.executionDurationMs / 1000).toFixed(1)}s • ID: {result.backtestId?.substring(0, 8)}...
                </div>
            </div>

            {/* Error Banner */}
            {result.status === 'FAILED' && result.errorMessage && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-md text-red-400 text-sm">
                    <strong>Error:</strong> {result.errorMessage}
                </div>
            )}

            {/* Status: RUNNING */}
            {result.status === 'RUNNING' && (
                <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-md text-blue-400 text-sm flex items-center space-x-3">
                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                    </svg>
                    <span>Backtest is running... Results will appear when complete.</span>
                </div>
            )}

            {/* Summary Stat Cards */}
            {result.status === 'COMPLETED' && (
                <>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
                        <BtStatCard title="Total P&L" value={formatCurrency(result.totalPnLAmount)} colorClass={pnlColor} />
                        <BtStatCard title="P&L Points" value={formatPoints(result.totalPnLPoints)} colorClass={pnlColor} />
                        <BtStatCard title="Win Rate" value={formatPct(result.winRate)} colorClass={winRateColor} />
                        <BtStatCard title="Profit Factor" value={result.profitFactor === 999.99 ? '∞' : result.profitFactor.toFixed(2)} colorClass={pfColor} />
                        <BtStatCard title="Max Drawdown" value={formatPct(result.maxDrawdownPct)} colorClass="text-red-400" />
                        <BtStatCard title="Max Profit" value={formatPct(result.maxProfitPct)} colorClass="text-green-400" />
                        <BtStatCard title="Total Trades" value={String(result.totalTrades)} />
                        <BtStatCard title="Wins / Losses" value={`${result.winningTrades} / ${result.losingTrades}`} subtitle={`Avg Win: ${formatCurrency(result.avgWinAmount)} | Avg Loss: ${formatCurrency(result.avgLossAmount)}`} />
                        <BtStatCard title="Restarts" value={String(result.restartCount)} />
                        <BtStatCard title="Spot Price" value={formatCurrency(result.spotPriceAtEntry)} />
                        <BtStatCard title="ATM Strike" value={result.atmStrike.toLocaleString()} />
                        <BtStatCard title="Execution Time" value={`${(result.executionDurationMs / 1000).toFixed(1)}s`} />
                    </div>

                    {/* Charts */}
                    {result.trades.length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <EquityCurveChart trades={result.trades} />
                            <PnLBarChart trades={result.trades} />
                            <WinLossDonut wins={result.winningTrades} losses={result.losingTrades} />
                        </div>
                    )}

                    {/* Trade History Table */}
                    <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
                        <h3 className="text-md font-semibold text-slate-200 mb-3">Trade History ({result.trades.length} trades)</h3>
                        <TradeTable trades={result.trades} />
                    </div>
                </>
            )}
        </div>
    );
};

export default BacktestResultView;
