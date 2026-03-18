
import React, { useState } from 'react';
import { BacktestRequest, BacktestStrategyInfo } from '../types';

interface BacktestConfigFormProps {
    strategies: BacktestStrategyInfo[];
    isLoading: boolean;
    onRunSingle: (request: BacktestRequest) => void;
    onRunBatch: (request: BacktestRequest, fromDate: string, toDate: string) => void;
}

const getTodayString = (): string => {
    const d = new Date();
    return d.toISOString().split('T')[0];
};

const BacktestConfigForm: React.FC<BacktestConfigFormProps> = ({ strategies, isLoading, onRunSingle, onRunBatch }) => {
    // --- Mode ---
    const [mode, setMode] = useState<'single' | 'batch'>('single');

    // --- Core Fields ---
    const [backtestDate, setBacktestDate] = useState(getTodayString());
    const [fromDate, setFromDate] = useState(getTodayString());
    const [toDate, setToDate] = useState(getTodayString());
    const [strategyType, setStrategyType] = useState<string>('SELL_ATM_STRADDLE');
    const [instrumentType, setInstrumentType] = useState<'NIFTY' | 'BANKNIFTY'>('NIFTY');
    const [expiryDate, setExpiryDate] = useState(getTodayString());
    const [lots, setLots] = useState(1);

    // --- SL/Target ---
    const [slTargetMode, setSlTargetMode] = useState<'points' | 'premium'>('points');
    const [stopLossPoints, setStopLossPoints] = useState(2.0);
    const [targetPoints, setTargetPoints] = useState(2.0);
    const [targetDecayPct, setTargetDecayPct] = useState(3.5);
    const [stopLossExpansionPct, setStopLossExpansionPct] = useState(7.0);

    // --- Advanced ---
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [startTime, setStartTime] = useState('09:20');
    const [endTime, setEndTime] = useState('15:30');
    const [autoSquareOffTime, setAutoSquareOffTime] = useState('15:10');
    const [candleInterval, setCandleInterval] = useState('minute');
    const [autoRestartEnabled, setAutoRestartEnabled] = useState(true);
    const [maxAutoRestarts, setMaxAutoRestarts] = useState(0);
    const [trailingStopEnabled, setTrailingStopEnabled] = useState(false);
    const [trailingActivationPoints, setTrailingActivationPoints] = useState(2.5);
    const [trailingDistancePoints, setTrailingDistancePoints] = useState(1.5);

    // --- Validation ---
    const [validationError, setValidationError] = useState<string | null>(null);

    const validate = (): boolean => {
        const dateToCheck = mode === 'single' ? backtestDate : fromDate;
        if (!dateToCheck) {
            setValidationError('Backtest date is required.');
            return false;
        }
        const dayOfWeek = new Date(dateToCheck + 'T00:00:00').getDay();
        if (mode === 'single' && (dayOfWeek === 0 || dayOfWeek === 6)) {
            setValidationError('Backtest date must not be a weekend.');
            return false;
        }
        if (!expiryDate) {
            setValidationError('Expiry date is required.');
            return false;
        }
        if (mode === 'batch' && (!fromDate || !toDate)) {
            setValidationError('Both from and to dates are required for batch mode.');
            return false;
        }
        if (mode === 'batch' && fromDate > toDate) {
            setValidationError('From date must be before or equal to To date.');
            return false;
        }
        setValidationError(null);
        return true;
    };

    const buildRequest = (): BacktestRequest => {
        const request: BacktestRequest = {
            backtestDate: mode === 'single' ? backtestDate : fromDate,
            strategyType: strategyType as BacktestRequest['strategyType'],
            instrumentType,
            expiryDate,
            lots,
            slTargetMode: slTargetMode === 'premium' ? 'premium' : 'points',
        };

        if (slTargetMode === 'points') {
            request.stopLossPoints = stopLossPoints;
            request.targetPoints = targetPoints;
        } else {
            request.targetDecayPct = targetDecayPct;
            request.stopLossExpansionPct = stopLossExpansionPct;
        }

        // Advanced settings (only send if changed from defaults)
        request.startTime = startTime;
        request.endTime = endTime;
        request.autoSquareOffTime = autoSquareOffTime;
        request.candleInterval = candleInterval;
        request.autoRestartEnabled = autoRestartEnabled;
        request.maxAutoRestarts = maxAutoRestarts;
        request.trailingStopEnabled = trailingStopEnabled;

        if (trailingStopEnabled) {
            request.trailingActivationPoints = trailingActivationPoints;
            request.trailingDistancePoints = trailingDistancePoints;
        }

        return request;
    };

    const handleSubmit = () => {
        if (!validate()) return;
        const request = buildRequest();
        if (mode === 'single') {
            onRunSingle(request);
        } else {
            onRunBatch(request, fromDate, toDate);
        }
    };

    const today = getTodayString();
    const backtestStrategies = strategies.length > 0
        ? strategies
        : [{ name: 'SELL_ATM_STRADDLE', description: 'Sell ATM Straddle', backtestSupported: true }];

    const inputClass = 'w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-kite-blue disabled:opacity-50';
    const labelClass = 'block text-xs font-medium text-slate-400 mb-1';

    return (
        <div className="bg-slate-800 p-4 rounded-lg border border-slate-700 mb-6">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-slate-200">Backtest Configuration</h2>
                {/* Mode Toggle */}
                <div className="flex bg-slate-900 border border-slate-700 rounded-md overflow-hidden">
                    <button
                        type="button"
                        onClick={() => setMode('single')}
                        disabled={isLoading}
                        className={`px-4 py-1.5 text-sm font-medium transition-colors ${
                            mode === 'single' ? 'bg-kite-blue text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                        } disabled:opacity-50`}
                    >
                        Single Day
                    </button>
                    <button
                        type="button"
                        onClick={() => setMode('batch')}
                        disabled={isLoading}
                        className={`px-4 py-1.5 text-sm font-medium transition-colors ${
                            mode === 'batch' ? 'bg-kite-blue text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                        } disabled:opacity-50`}
                    >
                        Date Range
                    </button>
                </div>
            </div>

            {validationError && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-md text-red-400 text-sm flex items-center">
                    <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/></svg>
                    {validationError}
                </div>
            )}

            {/* Row 1: Core Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 items-end mb-4">
                {/* Date Fields */}
                {mode === 'single' ? (
                    <div>
                        <label className={labelClass}>Backtest Date</label>
                        <input
                            type="date"
                            value={backtestDate}
                            max={today}
                            onChange={e => setBacktestDate(e.target.value)}
                            disabled={isLoading}
                            className={inputClass}
                        />
                    </div>
                ) : (
                    <>
                        <div>
                            <label className={labelClass}>From Date</label>
                            <input
                                type="date"
                                value={fromDate}
                                max={today}
                                onChange={e => setFromDate(e.target.value)}
                                disabled={isLoading}
                                className={inputClass}
                            />
                        </div>
                        <div>
                            <label className={labelClass}>To Date</label>
                            <input
                                type="date"
                                value={toDate}
                                max={today}
                                onChange={e => setToDate(e.target.value)}
                                disabled={isLoading}
                                className={inputClass}
                            />
                        </div>
                    </>
                )}

                {/* Strategy */}
                <div>
                    <label className={labelClass}>Strategy</label>
                    <select
                        value={strategyType}
                        onChange={e => setStrategyType(e.target.value)}
                        disabled={isLoading}
                        className={inputClass}
                    >
                        {backtestStrategies.map(s => (
                            <option key={s.name} value={s.name}>{s.name.replace(/_/g, ' ')}</option>
                        ))}
                    </select>
                </div>

                {/* Instrument */}
                <div>
                    <label className={labelClass}>Instrument</label>
                    <select
                        value={instrumentType}
                        onChange={e => setInstrumentType(e.target.value as 'NIFTY' | 'BANKNIFTY')}
                        disabled={isLoading}
                        className={inputClass}
                    >
                        <option value="NIFTY">NIFTY</option>
                        <option value="BANKNIFTY">BANKNIFTY</option>
                    </select>
                </div>

                {/* Expiry */}
                <div>
                    <label className={labelClass}>Expiry Date</label>
                    <input
                        type="date"
                        value={expiryDate}
                        onChange={e => setExpiryDate(e.target.value)}
                        disabled={isLoading}
                        className={inputClass}
                    />
                </div>

                {/* Lots */}
                <div>
                    <label className={labelClass}>Lots</label>
                    <div className="flex items-center bg-slate-900 border border-slate-700 rounded-md">
                        <button
                            onClick={() => setLots(l => Math.max(1, l - 1))}
                            disabled={isLoading}
                            className="px-2.5 py-1.5 text-base font-bold hover:bg-slate-700 transition-colors rounded-l-md disabled:opacity-50"
                        >-</button>
                        <div className="text-center flex-grow px-2 py-1.5 border-x border-slate-700">
                            <span className="font-semibold text-sm">{lots}</span>
                            <span className="text-xs text-slate-400 ml-1">
                                ({lots * (instrumentType === 'NIFTY' ? 75 : 30)} Qty)
                            </span>
                        </div>
                        <button
                            onClick={() => setLots(l => l + 1)}
                            disabled={isLoading}
                            className="px-2.5 py-1.5 text-base font-bold hover:bg-slate-700 transition-colors rounded-r-md disabled:opacity-50"
                        >+</button>
                    </div>
                </div>
            </div>

            {/* Row 2: SL/Target */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 items-end mb-4">
                {/* SL/Target Mode Toggle */}
                <div className="xl:col-span-2">
                    <label className={labelClass}>SL/Target Mode</label>
                    <div className="flex bg-slate-900 border border-slate-700 rounded-md overflow-hidden">
                        <button
                            type="button"
                            onClick={() => setSlTargetMode('points')}
                            disabled={isLoading}
                            className={`flex-1 px-3 py-1.5 text-sm font-medium transition-colors ${
                                slTargetMode === 'points' ? 'bg-kite-blue text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                            } disabled:opacity-50`}
                        >
                            Points
                        </button>
                        <button
                            type="button"
                            onClick={() => setSlTargetMode('premium')}
                            disabled={isLoading}
                            className={`flex-1 px-3 py-1.5 text-sm font-medium transition-colors ${
                                slTargetMode === 'premium' ? 'bg-kite-blue text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                            } disabled:opacity-50`}
                        >
                            Premium %
                        </button>
                    </div>
                </div>

                {/* Conditional SL/Target Inputs */}
                {slTargetMode === 'points' ? (
                    <>
                        <div>
                            <label className={labelClass}>Stop Loss (pts)</label>
                            <input
                                type="number" min="0" step="0.5"
                                value={stopLossPoints}
                                onChange={e => setStopLossPoints(Number(e.target.value))}
                                disabled={isLoading}
                                className={inputClass}
                            />
                        </div>
                        <div>
                            <label className={labelClass}>Target (pts)</label>
                            <input
                                type="number" min="0" step="0.5"
                                value={targetPoints}
                                onChange={e => setTargetPoints(Number(e.target.value))}
                                disabled={isLoading}
                                className={inputClass}
                            />
                        </div>
                    </>
                ) : (
                    <>
                        <div>
                            <label className={labelClass}>SL Expansion (%)</label>
                            <input
                                type="number" min="0" max="500" step="0.5"
                                value={stopLossExpansionPct}
                                onChange={e => setStopLossExpansionPct(Number(e.target.value))}
                                disabled={isLoading}
                                className={inputClass}
                            />
                        </div>
                        <div>
                            <label className={labelClass}>Target Decay (%)</label>
                            <input
                                type="number" min="0" max="100" step="0.5"
                                value={targetDecayPct}
                                onChange={e => setTargetDecayPct(Number(e.target.value))}
                                disabled={isLoading}
                                className={inputClass}
                            />
                        </div>
                    </>
                )}
            </div>

            {/* Advanced Section (Collapsible) */}
            <div className="mb-4">
                <button
                    type="button"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="flex items-center text-sm text-slate-400 hover:text-slate-200 transition-colors"
                >
                    <svg
                        className={`w-4 h-4 mr-1 transition-transform ${showAdvanced ? 'rotate-90' : ''}`}
                        fill="currentColor" viewBox="0 0 20 20"
                    >
                        <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd"/>
                    </svg>
                    Advanced Settings
                </button>

                {showAdvanced && (
                    <div className="mt-3 p-4 bg-slate-900/50 rounded-lg border border-slate-700/50">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 items-end">
                            {/* Time Settings */}
                            <div>
                                <label className={labelClass}>Start Time</label>
                                <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} disabled={isLoading} className={inputClass} />
                            </div>
                            <div>
                                <label className={labelClass}>End Time</label>
                                <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} disabled={isLoading} className={inputClass} />
                            </div>
                            <div>
                                <label className={labelClass}>Auto Square Off</label>
                                <input type="time" value={autoSquareOffTime} onChange={e => setAutoSquareOffTime(e.target.value)} disabled={isLoading} className={inputClass} />
                            </div>

                            {/* Candle Interval */}
                            <div>
                                <label className={labelClass}>Candle Interval</label>
                                <select value={candleInterval} onChange={e => setCandleInterval(e.target.value)} disabled={isLoading} className={inputClass}>
                                    <option value="minute">1 Minute</option>
                                    <option value="5minute">5 Minutes</option>
                                    <option value="15minute">15 Minutes</option>
                                    <option value="day">Day</option>
                                </select>
                            </div>

                            {/* Auto Restart */}
                            <div>
                                <label className={labelClass}>Auto Restart</label>
                                <div className="flex items-center space-x-2 py-1.5">
                                    <button
                                        type="button"
                                        onClick={() => setAutoRestartEnabled(!autoRestartEnabled)}
                                        disabled={isLoading}
                                        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                            autoRestartEnabled ? 'bg-kite-blue' : 'bg-slate-600'
                                        } disabled:opacity-50`}
                                        role="switch"
                                        aria-checked={autoRestartEnabled}
                                    >
                                        <span
                                            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                                autoRestartEnabled ? 'translate-x-5' : 'translate-x-0'
                                            }`}
                                        />
                                    </button>
                                    <span className="text-xs text-slate-400">{autoRestartEnabled ? 'On' : 'Off'}</span>
                                </div>
                            </div>

                            {/* Max Restarts */}
                            <div>
                                <label className={labelClass}>Max Restarts (0=∞)</label>
                                <input
                                    type="number" min="0" step="1"
                                    value={maxAutoRestarts}
                                    onChange={e => setMaxAutoRestarts(Number(e.target.value))}
                                    disabled={isLoading || !autoRestartEnabled}
                                    className={inputClass}
                                />
                            </div>
                        </div>

                        {/* Trailing Stop Section */}
                        <div className="mt-4 pt-4 border-t border-slate-700/50">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 items-end">
                                <div>
                                    <label className={labelClass}>Trailing Stop</label>
                                    <div className="flex items-center space-x-2 py-1.5">
                                        <button
                                            type="button"
                                            onClick={() => setTrailingStopEnabled(!trailingStopEnabled)}
                                            disabled={isLoading}
                                            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                                trailingStopEnabled ? 'bg-kite-blue' : 'bg-slate-600'
                                            } disabled:opacity-50`}
                                            role="switch"
                                            aria-checked={trailingStopEnabled}
                                        >
                                            <span
                                                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                                    trailingStopEnabled ? 'translate-x-5' : 'translate-x-0'
                                                }`}
                                            />
                                        </button>
                                        <span className="text-xs text-slate-400">{trailingStopEnabled ? 'On' : 'Off'}</span>
                                    </div>
                                </div>
                                {trailingStopEnabled && (
                                    <>
                                        <div>
                                            <label className={labelClass}>Activation (pts)</label>
                                            <input
                                                type="number" min="0" step="0.5"
                                                value={trailingActivationPoints}
                                                onChange={e => setTrailingActivationPoints(Number(e.target.value))}
                                                disabled={isLoading}
                                                className={inputClass}
                                            />
                                        </div>
                                        <div>
                                            <label className={labelClass}>Trail Distance (pts)</label>
                                            <input
                                                type="number" min="0" step="0.5"
                                                value={trailingDistancePoints}
                                                onChange={e => setTrailingDistancePoints(Number(e.target.value))}
                                                disabled={isLoading}
                                                className={inputClass}
                                            />
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between items-center">
                <div className="text-xs text-slate-500">
                    {mode === 'batch' && (
                        <span>⚠️ Batch requests can take 60-100s for 20-day ranges.</span>
                    )}
                </div>
                <button
                    onClick={handleSubmit}
                    disabled={isLoading}
                    className="px-6 py-2 rounded-md font-semibold text-white bg-kite-blue hover:bg-blue-700 transition-transform transform hover:scale-105 disabled:bg-gray-500 disabled:cursor-not-allowed disabled:scale-100 flex items-center space-x-2"
                >
                    {isLoading ? (
                        <>
                            <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                            </svg>
                            <span>Running...</span>
                        </>
                    ) : (
                        <span>{mode === 'single' ? 'Run Backtest' : 'Run Batch Backtest'}</span>
                    )}
                </button>
            </div>
        </div>
    );
};

export default BacktestConfigForm;
