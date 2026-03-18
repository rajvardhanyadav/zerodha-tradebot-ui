
import React, { useState, useEffect, useCallback } from 'react';
import { BacktestRequest, BacktestResult, BacktestStrategyInfo } from '../types';
import { backtestApi, pollBacktestResult, formatCurrency, formatPct } from '../services/backtestService';
import BacktestConfigForm from './BacktestConfigForm';
import BacktestResultView from './BacktestResultView';

// --- Batch Results Table ---
const BatchResultsTable: React.FC<{
    results: BacktestResult[];
    selectedId: string | null;
    onSelectResult: (result: BacktestResult) => void;
}> = ({ results, selectedId, onSelectResult }) => {
    // Compute batch summary
    const summary = results.reduce(
        (acc, r) => {
            if (r.status === 'COMPLETED') {
                acc.totalPnL += r.totalPnLAmount;
                acc.totalPoints += r.totalPnLPoints;
                acc.totalTrades += r.totalTrades;
                acc.winRateSum += r.winRate;
                acc.completedCount++;
            }
            return acc;
        },
        { totalPnL: 0, totalPoints: 0, totalTrades: 0, winRateSum: 0, completedCount: 0 }
    );

    const avgWinRate = summary.completedCount > 0 ? summary.winRateSum / summary.completedCount : 0;

    return (
        <div className="bg-slate-800 p-4 rounded-lg border border-slate-700 mb-4">
            <h3 className="text-md font-semibold text-slate-200 mb-3">
                Batch Results ({results.length} days)
            </h3>
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="border-b border-slate-700 bg-slate-700/50">
                        <tr>
                            <th className="p-2 text-xs text-slate-400">Date</th>
                            <th className="p-2 text-xs text-slate-400">Status</th>
                            <th className="p-2 text-xs text-slate-400 text-right">Spot</th>
                            <th className="p-2 text-xs text-slate-400 text-right">ATM Strike</th>
                            <th className="p-2 text-xs text-slate-400 text-right">Trades</th>
                            <th className="p-2 text-xs text-slate-400 text-right">P&L (₹)</th>
                            <th className="p-2 text-xs text-slate-400 text-right">P&L (pts)</th>
                            <th className="p-2 text-xs text-slate-400 text-right">Win Rate</th>
                            <th className="p-2 text-xs text-slate-400 text-right">Profit Factor</th>
                            <th className="p-2 text-xs text-slate-400 text-right">Max DD</th>
                            <th className="p-2 text-xs text-slate-400 text-right">Restarts</th>
                        </tr>
                    </thead>
                    <tbody>
                        {results.map(r => {
                            const isSelected = selectedId === r.backtestId;
                            const rowBg = isSelected ? 'bg-kite-blue/10 border-l-2 border-l-kite-blue' :
                                r.status === 'FAILED' ? 'bg-red-500/5' :
                                r.totalPnLAmount >= 0 ? 'bg-green-500/5' : 'bg-red-500/5';
                            return (
                                <tr
                                    key={r.backtestId}
                                    className={`border-b border-slate-700/50 last:border-b-0 cursor-pointer hover:bg-slate-700/30 transition-colors ${rowBg}`}
                                    onClick={() => onSelectResult(r)}
                                >
                                    <td className="p-2 font-mono text-slate-300">{r.backtestDate}</td>
                                    <td className="p-2">
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                                            r.status === 'COMPLETED' ? 'bg-green-500/20 text-green-400' :
                                            r.status === 'FAILED' ? 'bg-red-500/20 text-red-400' :
                                            'bg-blue-500/20 text-blue-400'
                                        }`}>
                                            {r.status}
                                        </span>
                                    </td>
                                    <td className="p-2 font-mono text-right text-slate-300">{r.spotPriceAtEntry ? formatCurrency(r.spotPriceAtEntry) : '-'}</td>
                                    <td className="p-2 font-mono text-right text-slate-300">{r.atmStrike ? r.atmStrike.toLocaleString() : '-'}</td>
                                    <td className="p-2 font-mono text-right text-slate-300">{r.totalTrades}</td>
                                    <td className={`p-2 font-mono text-right font-semibold ${r.totalPnLAmount >= 0 ? 'text-profit' : 'text-loss'}`}>
                                        {r.status === 'COMPLETED' ? formatCurrency(r.totalPnLAmount) : '-'}
                                    </td>
                                    <td className={`p-2 font-mono text-right ${r.totalPnLPoints >= 0 ? 'text-profit' : 'text-loss'}`}>
                                        {r.status === 'COMPLETED' ? r.totalPnLPoints.toFixed(2) : '-'}
                                    </td>
                                    <td className="p-2 font-mono text-right text-slate-300">
                                        {r.status === 'COMPLETED' ? formatPct(r.winRate) : '-'}
                                    </td>
                                    <td className="p-2 font-mono text-right text-slate-300">
                                        {r.status === 'COMPLETED' ? (r.profitFactor === 999.99 ? '∞' : r.profitFactor.toFixed(2)) : '-'}
                                    </td>
                                    <td className="p-2 font-mono text-right text-red-400">
                                        {r.status === 'COMPLETED' ? formatPct(r.maxDrawdownPct) : '-'}
                                    </td>
                                    <td className="p-2 font-mono text-right text-slate-300">{r.restartCount}</td>
                                </tr>
                            );
                        })}
                        {/* Summary Row */}
                        {summary.completedCount > 0 && (
                            <tr className="border-t-2 border-slate-600 bg-slate-700/30 font-semibold">
                                <td className="p-2 text-slate-300" colSpan={4}>Summary ({summary.completedCount} completed)</td>
                                <td className="p-2 font-mono text-right text-slate-200">{summary.totalTrades}</td>
                                <td className={`p-2 font-mono text-right ${summary.totalPnL >= 0 ? 'text-profit' : 'text-loss'}`}>
                                    {formatCurrency(summary.totalPnL)}
                                </td>
                                <td className={`p-2 font-mono text-right ${summary.totalPoints >= 0 ? 'text-profit' : 'text-loss'}`}>
                                    {summary.totalPoints.toFixed(2)}
                                </td>
                                <td className="p-2 font-mono text-right text-slate-200">{formatPct(avgWinRate)}</td>
                                <td className="p-2" colSpan={3}></td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            <p className="text-xs text-slate-500 mt-2">Click a row to view detailed results for that day.</p>
        </div>
    );
};

// --- Main Backtest Page ---
const BacktestPage: React.FC = () => {
    // Strategy types from API
    const [strategies, setStrategies] = useState<BacktestStrategyInfo[]>([]);

    // Loading & error state
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Results
    const [singleResult, setSingleResult] = useState<BacktestResult | null>(null);
    const [batchResults, setBatchResults] = useState<BacktestResult[]>([]);
    const [viewMode, setViewMode] = useState<'none' | 'single' | 'batch'>('none');
    const [selectedBatchResult, setSelectedBatchResult] = useState<BacktestResult | null>(null);

    // Fetch supported strategies on mount
    useEffect(() => {
        backtestApi.getStrategies()
            .then(res => {
                if (res.success && res.data) {
                    setStrategies(res.data.filter(s => s.backtestSupported));
                }
            })
            .catch(() => {
                // Silently fail — form will show default strategy
            });
    }, []);

    const clearResults = useCallback(() => {
        setSingleResult(null);
        setBatchResults([]);
        setSelectedBatchResult(null);
        setViewMode('none');
        setError(null);
        setSuccessMessage(null);
    }, []);

    const handleRunSingle = useCallback(async (request: BacktestRequest) => {
        setIsLoading(true);
        setError(null);
        setSuccessMessage(null);
        clearResults();
        setLoadingMessage('Running backtest...');

        try {
            const res = await backtestApi.run(request);

            if (res.success && res.data) {
                setSingleResult(res.data);
                setViewMode('single');

                if (res.data.status === 'FAILED') {
                    setError(`Backtest failed: ${res.data.errorMessage}`);
                } else if (res.data.status === 'COMPLETED') {
                    const pnl = res.data.totalPnLAmount >= 0
                        ? `+${formatCurrency(res.data.totalPnLAmount)}`
                        : formatCurrency(res.data.totalPnLAmount);
                    setSuccessMessage(`Backtest completed in ${(res.data.executionDurationMs / 1000).toFixed(1)}s — ${res.data.totalTrades} trades, P&L: ${pnl}`);
                }
            } else {
                setError(res.message || 'Backtest returned no data.');
            }
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setIsLoading(false);
            setLoadingMessage('');
        }
    }, [clearResults]);

    const handleRunBatch = useCallback(async (request: BacktestRequest, fromDate: string, toDate: string) => {
        setIsLoading(true);
        setError(null);
        setSuccessMessage(null);
        clearResults();
        setLoadingMessage(`Running batch backtest from ${fromDate} to ${toDate}...`);

        try {
            const res = await backtestApi.batch(fromDate, toDate, request);

            if (res.success && res.data) {
                setBatchResults(res.data);
                setViewMode('batch');

                const completed = res.data.filter(r => r.status === 'COMPLETED');
                const totalPnL = completed.reduce((sum, r) => sum + r.totalPnLAmount, 0);
                const pnlStr = totalPnL >= 0 ? `+${formatCurrency(totalPnL)}` : formatCurrency(totalPnL);
                setSuccessMessage(`Batch completed: ${completed.length}/${res.data.length} days processed. Total P&L: ${pnlStr}`);
            } else {
                setError(res.message || 'Batch backtest returned no data.');
            }
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setIsLoading(false);
            setLoadingMessage('');
        }
    }, [clearResults]);

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
            {/* Header */}
            <header className="flex flex-col md:flex-row justify-between items-center mb-6">
                <div className="flex items-center space-x-3">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-kite-blue">
                        <path d="M3 3v18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                        <path d="M7 14l4-4 3 3 5-6" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-200">Strategy Backtester</h1>
                        <p className="text-sm text-slate-400">Simulate strategies on historical data</p>
                    </div>
                </div>
                {viewMode !== 'none' && (
                    <button
                        onClick={clearResults}
                        className="mt-3 md:mt-0 px-4 py-2 text-sm bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-md transition-colors"
                    >
                        Clear Results
                    </button>
                )}
            </header>

            {/* Config Form */}
            <BacktestConfigForm
                strategies={strategies}
                isLoading={isLoading}
                onRunSingle={handleRunSingle}
                onRunBatch={handleRunBatch}
            />

            {/* Loading Indicator */}
            {isLoading && (
                <div className="mb-4 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg flex items-center space-x-3">
                    <svg className="animate-spin h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                    </svg>
                    <span className="text-blue-400 text-sm">{loadingMessage || 'Processing...'}</span>
                </div>
            )}

            {/* Error Banner */}
            {error && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-md flex items-center justify-between">
                    <div className="flex items-center text-red-400 text-sm">
                        <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
                        </svg>
                        {error}
                    </div>
                    <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300 ml-4">✕</button>
                </div>
            )}

            {/* Success Banner */}
            {successMessage && !error && (
                <div className="mb-4 p-3 bg-green-500/10 border border-green-500/30 rounded-md flex items-center justify-between">
                    <div className="flex items-center text-green-400 text-sm">
                        <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                        </svg>
                        {successMessage}
                    </div>
                    <button onClick={() => setSuccessMessage(null)} className="text-green-400 hover:text-green-300 ml-4">✕</button>
                </div>
            )}

            {/* Single Result View */}
            {viewMode === 'single' && singleResult && (
                <BacktestResultView result={singleResult} />
            )}

            {/* Batch Results View */}
            {viewMode === 'batch' && batchResults.length > 0 && (
                <>
                    <BatchResultsTable
                        results={batchResults}
                        selectedId={selectedBatchResult?.backtestId || null}
                        onSelectResult={r => setSelectedBatchResult(r)}
                    />
                    {selectedBatchResult && (
                        <BacktestResultView
                            result={selectedBatchResult}
                            title={`Day Detail — ${selectedBatchResult.backtestDate}`}
                        />
                    )}
                </>
            )}
        </div>
    );
};

export default BacktestPage;
