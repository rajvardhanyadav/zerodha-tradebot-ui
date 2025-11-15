import React, { useMemo } from 'react';
import { HistoricalRunResult } from '../types';

interface ChartMetricProps {
    label: string;
    value: string;
    valueColor?: string;
}

const ChartMetric: React.FC<ChartMetricProps> = ({ label, value, valueColor = 'text-slate-200' }) => (
    <div className="bg-slate-900/50 p-3 rounded-lg text-center">
        <p className="text-xs text-slate-400 uppercase tracking-wider">{label}</p>
        <p className={`text-lg font-bold font-mono ${valueColor}`}>{value}</p>
    </div>
);

const HistoricalPLChart: React.FC<{ data: HistoricalRunResult, onClear: () => void }> = ({ data, onClear }) => {
    const { pnlData, finalPnL } = data;

    const { maxProfit, maxDrawdown, yMin, yMax } = useMemo(() => {
        if (!pnlData || !Array.isArray(pnlData) || pnlData.length === 0) {
            return { maxProfit: 0, maxDrawdown: 0, yMin: -100, yMax: 100 };
        }

        let maxP = -Infinity;
        let minP = Infinity;
        let peak = -Infinity;
        let drawdown = 0;

        pnlData.forEach(point => {
            const pnl = point.pnl;
            if (pnl > maxP) maxP = pnl;
            if (pnl < minP) minP = pnl;
            if (pnl > peak) peak = pnl;
            const currentDrawdown = peak - pnl;
            if (currentDrawdown > drawdown) drawdown = currentDrawdown;
        });
        
        if (maxP === -Infinity) maxP = 0;
        if (minP === Infinity) minP = 0;


        const buffer = Math.max(Math.abs(maxP), Math.abs(minP)) * 0.15 || 100;
        return {
            maxProfit: maxP,
            maxDrawdown: -drawdown,
            yMin: minP - buffer,
            yMax: maxP + buffer,
        };
    }, [pnlData]);

    const finalPnLColor = finalPnL > 0 ? 'text-profit' : finalPnL < 0 ? 'text-loss' : 'text-slate-200';

    if (!pnlData || pnlData.length < 2) {
        return (
             <div className="text-center py-10 text-slate-400">
                <h2 className="text-lg font-semibold text-slate-200 mb-2">Historical Performance</h2>
                <p>{data.message || 'Not enough data to display chart.'}</p>
                <button onClick={onClear} className="mt-4 px-4 py-2 text-sm bg-slate-600 hover:bg-slate-500 rounded-md">
                    Clear Results
                </button>
            </div>
        );
    }
    
    const width = 800;
    const height = 400;
    const margin = { top: 20, right: 20, bottom: 40, left: 60 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    const xScale = (index: number) => (index / (pnlData.length - 1)) * chartWidth;
    const yScale = (pnl: number) => {
        if (yMax === yMin) return chartHeight / 2; // Avoid division by zero
        return chartHeight - ((pnl - yMin) / (yMax - yMin)) * chartHeight;
    };

    const pathData = pnlData.map((point, i) => `${i === 0 ? 'M' : 'L'} ${xScale(i)} ${yScale(point.pnl)}`).join(' ');
    
    const yAxisTicks = 5;
    const tickValues = (yMax === yMin) ? [yMin] : Array.from({ length: yAxisTicks + 1 }, (_, i) => yMin + (i * (yMax - yMin)) / yAxisTicks);

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-slate-200">Historical Performance</h2>
                <button onClick={onClear} className="px-3 py-1.5 text-xs bg-slate-600 hover:bg-slate-500 rounded-md">
                    Clear Results
                </button>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-4">
                <ChartMetric label="Final P/L" value={`₹${finalPnL.toFixed(2)}`} valueColor={finalPnLColor} />
                <ChartMetric label="Max Profit" value={`₹${maxProfit.toFixed(2)}`} valueColor="text-profit" />
                <ChartMetric label="Max Drawdown" value={`₹${maxDrawdown.toFixed(2)}`} valueColor="text-loss" />
            </div>
            
            <div className="w-full overflow-x-auto">
                <svg viewBox={`0 0 ${width} ${height}`} className="min-w-[600px]">
                    <g transform={`translate(${margin.left}, ${margin.top})`}>
                        {/* Y-axis grid lines and labels */}
                        {tickValues.map(tick => (
                             <g key={tick} className="text-slate-500">
                                <line x1={0} x2={chartWidth} y1={yScale(tick)} y2={yScale(tick)} stroke="currentColor" strokeWidth="0.5" strokeDasharray="2,3" />
                                <text x={-10} y={yScale(tick)} dy="0.32em" textAnchor="end" className="text-xs fill-current">{tick.toFixed(0)}</text>
                            </g>
                        ))}

                        {/* Zero Line */}
                        {yMin < 0 && yMax > 0 && (
                            <line x1={0} x2={chartWidth} y1={yScale(0)} y2={yScale(0)} stroke="currentColor" strokeWidth="1" className="text-slate-400"/>
                        )}
                        
                        {/* P/L Path */}
                        <path d={pathData} fill="none" stroke={finalPnL >= 0 ? '#22C55E' : '#EF4444'} strokeWidth="2" />

                         {/* X-axis labels */}
                        <text x={0} y={chartHeight + 30} textAnchor="start" className="text-xs fill-current text-slate-400">{pnlData[0].timestamp}</text>
                        <text x={chartWidth / 2} y={chartHeight + 30} textAnchor="middle" className="text-xs fill-current text-slate-400">Time</text>
                        <text x={chartWidth} y={chartHeight + 30} textAnchor="end" className="text-xs fill-current text-slate-400">{pnlData[pnlData.length - 1].timestamp}</text>
                    </g>
                </svg>
            </div>
        </div>
    );
};

export default HistoricalPLChart;