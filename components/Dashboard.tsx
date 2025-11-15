

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Instrument, BotStatus, TradeLog, StrategyType, ApiStrategyType, ApiInstrument, StrategyPosition, UserProfile, MonitoringStatus, Order, Position, DayPNL, ChargesBreakdown, HistoricalRunResult } from '../types';
import * as tradingService from '../services/tradingService';
import * as api from '../services/kiteConnect';
import StatCard from './StatCard';
import ActiveStrategiesTable from './ActiveStrategiesTable';
import PositionsTable from './PositionsTable';
import OrdersTable from './OrdersTable';
import TradeLogView from './TradeLogView';
import HistoricalPLChart from './HistoricalPLChart';

const TabButton: React.FC<{ title: string; isActive: boolean; onClick: () => void }> = ({ title, isActive, onClick }) => (
    <button
        onClick={onClick}
        className={`px-4 py-2 text-sm font-medium transition-colors focus:outline-none ${
            isActive
                ? 'border-b-2 border-kite-blue text-slate-200'
                : 'text-slate-400 hover:text-slate-200'
        }`}
    >
        {title}
    </button>
);

const Dashboard: React.FC<{ onLogout: () => void; }> = ({ onLogout }) => {
    const [botStatus, setBotStatus] = useState<BotStatus>(BotStatus.STOPPED);
    const [instrument, setInstrument] = useState<Instrument | ''>('');
    const [strategy, setStrategy] = useState<StrategyType | ''>('');
    const [strangleDistance, setStrangleDistance] = useState<number>(100);
    const [lots, setLots] = useState<number>(1);
    const [stopLossPoints, setStopLossPoints] = useState<number>(10);
    const [targetPoints, setTargetPoints] = useState<number>(15);
    const [maxLossLimit, setMaxLossLimit] = useState<number>(3000);
    const [expiries, setExpiries] = useState<string[]>([]);
    const [selectedExpiry, setSelectedExpiry] = useState<string>('');
    const [totalPL, setTotalPL] = useState<number>(0);
    const [chargesBreakdown, setChargesBreakdown] = useState<ChargesBreakdown>({ brokerage: 0, stt: 0, exchange: 0, sebi: 0, stampDuty: 0, gst: 0, total: 0 });
    const [activeStrategies, setActiveStrategies] = useState<StrategyPosition[]>([]);
    const [orders, setOrders] = useState<Order[]>([]);
    const [positions, setPositions] = useState<Position[]>([]);
    const [tradeLog, setTradeLog] = useState<TradeLog[]>([]);
    const [currentTime, setCurrentTime] = useState<Date>(new Date());
    const [strategyTypes, setStrategyTypes] = useState<ApiStrategyType[]>([]);
    const [instruments, setInstruments] = useState<ApiInstrument[]>([]);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [ltp, setLtp] = useState<number>(0);
    const [isLtpLoading, setIsLtpLoading] = useState<boolean>(false);
    const [ltpLoadingDots, setLtpLoadingDots] = useState<string>('');
    const [monitoringStatus, setMonitoringStatus] = useState<MonitoringStatus | null>(null);
    const [stoppingMonitorId, setStoppingMonitorId] = useState<string | null>(null);
    const [isStoppingBot, setIsStoppingBot] = useState<boolean>(false);
    const [activeTab, setActiveTab] = useState<'strategies' | 'positions' | 'orders'>('strategies');
    const [confirmingStopBot, setConfirmingStopBot] = useState<boolean>(false);
    const [confirmingStopMonitorId, setConfirmingStopMonitorId] = useState<string | null>(null);
    const [isAutoRefreshEnabled, setIsAutoRefreshEnabled] = useState<boolean>(true);
    const [isManualRefreshing, setIsManualRefreshing] = useState<boolean>(false);
    const [isPositionsLoading, setIsPositionsLoading] = useState<boolean>(false);
    const [isOrdersLoading, setIsOrdersLoading] = useState<boolean>(false);
    const [historicalResult, setHistoricalResult] = useState<HistoricalRunResult | null>(null);
    const [isHistoricalRunning, setIsHistoricalRunning] = useState<boolean>(false);


    const addLog = useCallback((message: string, type: TradeLog['type']) => {
        setTradeLog(prev => [{ timestamp: new Date().toLocaleTimeString(), message, type }, ...prev].slice(0, 100));
    }, []);
    
    // Timeout for stop bot confirmation
    useEffect(() => {
        let timer: number | undefined;
        if (confirmingStopBot) {
            addLog('Click "Stop Bot" again within 5 seconds to confirm.', 'warning');
            timer = window.setTimeout(() => {
                setConfirmingStopBot(false);
            }, 5000);
        }
        return () => clearTimeout(timer);
    }, [confirmingStopBot, addLog]);

    // Timeout for stop monitor confirmation
    useEffect(() => {
        let timer: number | undefined;
        if (confirmingStopMonitorId) {
            addLog(`Click "Stop Monitor" again for the strategy to confirm.`, 'warning');
            timer = window.setTimeout(() => {
                setConfirmingStopMonitorId(null);
            }, 5000);
        }
        return () => clearTimeout(timer);
    }, [confirmingStopMonitorId, addLog]);


    // Effect for loading animation dots
    useEffect(() => {
        let intervalId: number | undefined;
        if (isLtpLoading) {
            intervalId = window.setInterval(() => {
                setLtpLoadingDots(dots => (dots.length >= 3 ? '' : dots + '.'));
            }, 400);
        } else {
            setLtpLoadingDots('');
        }
        return () => {
            if (intervalId) clearInterval(intervalId);
        };
    }, [isLtpLoading]);

    // Effect for the footer clock
    useEffect(() => {
        const clockTimer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(clockTimer);
    }, []);

    // Effect for loading initial config data
    useEffect(() => {
        const loadInitialData = async () => {
            try {
                addLog('Loading configurations & user profile...', 'info');
                const [fetchedStrategies, fetchedInstruments, profile] = await Promise.all([
                    api.getStrategyTypes(),
                    api.getTradeableInstruments(),
                    api.getUserProfile(),
                ]);

                setUserProfile(profile);
                const implementedStrategies = fetchedStrategies.filter(s => s.implemented);
                setStrategyTypes(implementedStrategies);
                setInstruments(fetchedInstruments);

                if (implementedStrategies.length > 0) {
                    setStrategy(implementedStrategies[0].name as StrategyType);
                }
                if (fetchedInstruments.length > 0) {
                    setInstrument(fetchedInstruments[0].code as Instrument);
                }
                 addLog(`Welcome, ${profile.userName}. Configurations loaded.`, 'success');
            } catch (e) {
                addLog(`Failed to load initial data: ${(e as Error).message}`, 'error');
            }
        };
        loadInitialData();
    }, [addLog]);

    // Effect to run when instrument is changed by the user
    useEffect(() => {
        const loadExpiriesAndLtp = async () => {
            if (!instrument || instruments.length === 0) return;
            
            addLog(`Fetching expiries and latest price for ${instrument}...`, 'info');
            setExpiries([]);
            setSelectedExpiry('');
            setIsLtpLoading(true);
            setLtp(0);
            setLots(1); // Reset lots on instrument change

            try {
                const fetchedExpiries = (await api.getStrategyExpiries(instrument) || []).filter(Boolean);
                setExpiries(fetchedExpiries);
                if (fetchedExpiries.length > 0) {
                    setSelectedExpiry(fetchedExpiries[0]);
                    addLog(`Expiries loaded successfully for ${instrument}.`, 'success');
                } else {
                    addLog(`Could not find any expiries for ${instrument}`, 'warning');
                }

                const selectedInstrumentObject = instruments.find(i => i.code === instrument);
                if (selectedInstrumentObject) {
                    const currentLtp = await api.getLTP(selectedInstrumentObject.name);
                    setLtp(currentLtp);
                }
            } catch (e) {
                 addLog(`Failed to fetch expiries for ${instrument}: ${(e as Error).message}`, 'error');
            } finally {
                setIsLtpLoading(false);
            }
        };
        loadExpiriesAndLtp();
    }, [instrument, instruments, addLog]);
    
    // Fetch data for the active tab (Positions or Orders)
    useEffect(() => {
        const fetchTabData = async () => {
            if (activeTab === 'positions') {
                setIsPositionsLoading(true);
                try {
                    const fetchedPositions = await api.getPositions();
                    setPositions(fetchedPositions);
                } catch (e) {
                    addLog(`Failed to fetch positions: ${(e as Error).message}`, 'error');
                } finally {
                    setIsPositionsLoading(false);
                }
            } else if (activeTab === 'orders') {
                setIsOrdersLoading(true);
                try {
                    const fetchedOrders = await api.getOrders();
                    setOrders(fetchedOrders);
                } catch (e) {
                    addLog(`Failed to fetch orders: ${(e as Error).message}`, 'error');
                } finally {
                    setIsOrdersLoading(false);
                }
            }
        };

        fetchTabData();
    }, [activeTab, addLog]);

    const executeStrategy = useCallback(async () => {
        if (totalPL <= -maxLossLimit) {
            setBotStatus(BotStatus.MAX_LOSS_REACHED);
            addLog(`Max daily loss of ${maxLossLimit} reached. Stopping trade for the day.`, 'error');
            return;
        }
        
        if (!selectedExpiry || !strategy || !instrument) {
            addLog('Strategy, instrument, or expiry not selected. Cannot place trade.', 'error');
            return;
        }
        
        addLog('Note: New API does not support auto-closing positions. A new strategy will be opened.', 'warning');

        const params = {
            strategyType: strategy,
            instrumentType: instrument,
            expiry: selectedExpiry,
            lots: lots,
            stopLossPoints,
            targetPoints,
            maxLossLimit,
            strikeGap: strategy === StrategyType.OTM_STRANGLE ? strangleDistance : undefined,
        };

        if (strategy === StrategyType.OTM_STRANGLE) {
            if (strangleDistance <= 0) {
                addLog(`Strangle distance must be positive.`, 'error');
                return;
            }
        }

        const strategyDesc = strategy.replace(/_/g, ' ');
        const fullDesc = strategy === StrategyType.OTM_STRANGLE ? `${strategyDesc} (${strangleDistance} pts)` : strategyDesc;
        addLog(`Executing: ${fullDesc} on ${instrument} for ${selectedExpiry} expiry with ${lots} lot(s).`, 'info');

        try {
            const result = await tradingService.runStrategy(params);
            addLog(`Strategy execution request sent successfully. Message: ${result.message}`, 'success');
        } catch (error) {
            addLog(`Failed to execute strategy: ${(error as Error).message}`, 'error');
        }
    }, [instrument, addLog, totalPL, selectedExpiry, strategy, strangleDistance, lots, stopLossPoints, targetPoints, maxLossLimit]);
    
    const handleRunHistorical = useCallback(async () => {
        if (!selectedExpiry || !strategy || !instrument) {
            addLog('Strategy, instrument, or expiry not selected. Cannot run simulation.', 'error');
            return;
        }

        const params = {
            strategyType: strategy,
            instrumentType: instrument,
            expiry: selectedExpiry,
            lots: lots,
            stopLossPoints,
            targetPoints,
            maxLossLimit,
            strikeGap: strategy === StrategyType.OTM_STRANGLE ? strangleDistance : undefined,
        };
        
        if (strategy === StrategyType.OTM_STRANGLE && strangleDistance <= 0) {
            addLog(`Strangle distance must be positive.`, 'error');
            return;
        }

        setIsHistoricalRunning(true);
        setHistoricalResult(null);
        addLog('Starting historical simulation...', 'info');

        try {
            const result = await api.executeHistoricalStrategy(params);
            setHistoricalResult(result);
            addLog(`Historical simulation complete. Final P/L: ${result.finalPnL.toFixed(2)}`, 'success');
        } catch (error) {
            addLog(`Historical simulation failed: ${(error as Error).message}`, 'error');
        } finally {
            setIsHistoricalRunning(false);
        }
    }, [addLog, selectedExpiry, strategy, instrument, lots, stopLossPoints, targetPoints, maxLossLimit, strangleDistance]);


    const fetchData = useCallback(async (isManual = false) => {
        if (isManual) {
            setIsManualRefreshing(true);
            addLog('Manually refreshing data...', 'info');
        }
    
        try {
            const selectedInstrumentObject = instruments.find(i => i.code === instrument);
            if (!selectedInstrumentObject) return;
    
            const [fetchedStrategies, currentLtp, monitorStatus, dayPnl, orderCharges] = await Promise.all([
                tradingService.getActiveStrategies(),
                api.getLTP(selectedInstrumentObject.name),
                api.getMonitoringStatus(),
                api.getTotalDayPNL(),
                api.getOrderCharges(),
            ]);
            
            setLtp(prevLtp => (currentLtp !== prevLtp ? currentLtp : prevLtp));
            setActiveStrategies(prev => JSON.stringify(prev) !== JSON.stringify(fetchedStrategies) ? fetchedStrategies : prev);
            setMonitoringStatus(prev => JSON.stringify(prev) !== JSON.stringify(monitorStatus) ? monitorStatus : prev);

            const totalBreakdown = (orderCharges && Array.isArray(orderCharges))
                ? orderCharges.reduce((acc, item) => {
                    const c = item.charges;
                    if (c) {
                        acc.brokerage += c.brokerage ?? 0;
                        acc.stt += c.transactionTax ?? 0;
                        acc.exchange += c.exchangeTurnoverCharge ?? 0;
                        acc.sebi += c.sebiTurnoverCharge ?? 0;
                        acc.stampDuty += c.stampDuty ?? 0;
                        acc.gst += c.gst?.total ?? 0;
                        acc.total += c.total ?? 0;
                    }
                    return acc;
                }, { brokerage: 0, stt: 0, exchange: 0, sebi: 0, stampDuty: 0, gst: 0, total: 0 })
                : { brokerage: 0, stt: 0, exchange: 0, sebi: 0, stampDuty: 0, gst: 0, total: 0 };
            
            setChargesBreakdown(prev => JSON.stringify(prev) !== JSON.stringify(totalBreakdown) ? totalBreakdown : prev);
    
            if (dayPnl) {
                const currentGrossPL = dayPnl.totalDayPnL;
                setTotalPL(prevPL => prevPL !== currentGrossPL ? currentGrossPL : prevPL);
                 
                if (botStatus === BotStatus.RUNNING && currentGrossPL <= -maxLossLimit) {
                    setBotStatus(BotStatus.MAX_LOSS_REACHED);
                    addLog(`Max daily loss of ${maxLossLimit} reached. Bot stopped.`, 'error');
                    addLog('Note: Positions must be closed manually.', 'warning');
                }
            }

            if (isManual) {
                addLog('Manual refresh complete.', 'success');
            }
    
        } catch(e) {
            addLog(`Error in main loop: ${(e as Error).message}`, 'error');
            if ((e as Error).message.includes('Unauthorized')) {
                addLog('Session expired. Please log in again.', 'error');
                onLogout();
            }
        } finally {
            if (isManual) {
                setIsManualRefreshing(false);
            }
        }
    }, [botStatus, instrument, instruments, addLog, onLogout, maxLossLimit]);
    
    // Main background loop for fetching data silently
    useEffect(() => {
        if (!instrument || instruments.length === 0 || !isAutoRefreshEnabled) {
            return;
        }

        fetchData(); // Initial fetch
        
        const timer = setInterval(fetchData, 10000); 

        return () => clearInterval(timer);
    }, [isAutoRefreshEnabled, fetchData, instrument, instruments.length]);
    
    const handleStopMonitoring = async (executionId: string) => {
        if (confirmingStopMonitorId === executionId) {
            addLog(`Requesting to stop monitoring for ${executionId}...`, 'info');
            setStoppingMonitorId(executionId);
            setConfirmingStopMonitorId(null); // Reset confirmation
            try {
                const message = await api.stopMonitoringExecution(executionId);
                addLog(message, 'success');
                const strategies = await tradingService.getActiveStrategies();
                setActiveStrategies(strategies);
            } catch (e) {
                addLog(`Failed to stop monitoring: ${(e as Error).message}`, 'error');
            } finally {
                setStoppingMonitorId(null);
            }
        } else {
            setConfirmingStopMonitorId(executionId);
            setConfirmingStopBot(false);
        }
    };

    const handleStartStop = async () => {
        if (botStatus === BotStatus.RUNNING) {
            if (isStoppingBot) return;
            if (confirmingStopBot) {
                setIsStoppingBot(true);
                setConfirmingStopBot(false);
                addLog('Requesting to stop all strategies...', 'info');
                try {
                    const response = await tradingService.stopAllStrategies();
                    addLog(response.message, 'success');
                    setBotStatus(BotStatus.STOPPED);
                    const strategies = await tradingService.getActiveStrategies();
                    setActiveStrategies(strategies);
                } catch (e) {
                    addLog(`Failed to stop bot: ${(e as Error).message}`, 'error');
                } finally {
                    setIsStoppingBot(false);
                }
            } else {
                setConfirmingStopBot(true);
                setConfirmingStopMonitorId(null);
            }
        } else if (botStatus === BotStatus.STOPPED || botStatus === BotStatus.INACTIVE) {
            setBotStatus(BotStatus.RUNNING);
            const strategyDesc = strategy.replace(/_/g, ' ');
            const fullDesc = strategy === StrategyType.OTM_STRANGLE 
                ? `${strategyDesc} (${strangleDistance} pts)` 
                : strategyDesc;
            addLog(`Bot started for ${instrument} (${selectedExpiry}) with strategy: ${fullDesc}.`, 'success');
            
            await executeStrategy();
        }
    };
    
    const isRunning = botStatus === BotStatus.RUNNING;
    
    const { lotSize, strikeInterval } = useMemo(() => {
        const selected = instruments.find(i => i.code === instrument);
        return {
            lotSize: selected?.lotSize || 0,
            strikeInterval: selected?.strikeInterval || 50,
        };
    }, [instrument, instruments]);
    
    // Effect to update strangle distance when instrument or strategy changes
    useEffect(() => {
        if (strategy === StrategyType.OTM_STRANGLE) {
            setStrangleDistance(strikeInterval);
        }
    }, [instrument, strategy, strikeInterval]);

    const handleIncrementLots = () => setLots(l => l + 1);
    const handleDecrementLots = () => setLots(l => Math.max(1, l - 1));
    
    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
             <header className="flex flex-col md:flex-row justify-between items-center mb-6">
                <div className="flex items-center space-x-3">
                    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-kite-blue">
                        <path d="M4 9H28" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                        <path d="M16 9V26" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                        <path d="M16 20L22 14L28 20" stroke="#22C55E" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-200">TradeBot Dashboard</h1>
                        {userProfile && <p className="text-sm text-slate-400">Welcome, {userProfile.userName}</p>}
                    </div>
                </div>
                <div className="flex items-center space-x-4 mt-4 md:mt-0">
                    <div className="flex items-center space-x-2">
                        <label htmlFor="auto-refresh-toggle" className="text-sm text-slate-400 cursor-pointer">Auto-Refresh</label>
                        <button
                            id="auto-refresh-toggle"
                            onClick={() => {
                                const newState = !isAutoRefreshEnabled;
                                setIsAutoRefreshEnabled(newState);
                                addLog(`Auto-refresh ${newState ? 'enabled' : 'disabled'}.`, 'info');
                            }}
                            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-kite-blue focus:ring-offset-2 focus:ring-offset-slate-900 ${isAutoRefreshEnabled ? 'bg-kite-blue' : 'bg-slate-600'}`}
                            role="switch"
                            aria-checked={isAutoRefreshEnabled}
                        >
                            <span
                                aria-hidden="true"
                                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isAutoRefreshEnabled ? 'translate-x-5' : 'translate-x-0'}`}
                            />
                        </button>
                    </div>
                    {!isAutoRefreshEnabled && (
                        <button
                            onClick={() => fetchData(true)}
                            disabled={isManualRefreshing}
                            className="px-3 py-1.5 text-sm rounded-md font-semibold text-white bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:cursor-wait"
                        >
                            {isManualRefreshing ? 'Refreshing...' : 'Refresh Now'}
                        </button>
                    )}
                    <button onClick={onLogout} className="px-4 py-2 rounded-md font-semibold text-white bg-slate-700 hover:bg-slate-600">
                        Logout
                    </button>
                </div>
            </header>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
                <StatCard icon="status" title="Bot Status" value={botStatus} status={botStatus} />
                <StatCard 
                    icon="monitoring"
                    title="Monitoring" 
                    value={monitoringStatus ? (monitoringStatus.connected ? 'Connected' : 'Disconnect') : '...'}
                    status={monitoringStatus ? (monitoringStatus.connected ? BotStatus.RUNNING : BotStatus.STOPPED) : undefined}
                    subtitle={monitoringStatus ? `${monitoringStatus.activeMonitors} active` : ''}
                />
                <StatCard icon="ltp" title={`${instrument || 'Index'} LTP`} value={isLtpLoading ? ltpLoadingDots : (ltp > 0 ? ltp.toFixed(2) : '...')} />
                <StatCard icon="gross-pl" title="Gross P/L" value={totalPL.toFixed(2)} isCurrency={true} isPL={true} />
                <StatCard icon="charges" title="Charges" value={chargesBreakdown.total.toFixed(2)} isCurrency={true} breakdown={chargesBreakdown} />
                <StatCard icon="net-pl" title="Net P/L" value={(totalPL - chargesBreakdown.total).toFixed(2)} isCurrency={true} isPL={true} />
            </div>

            <div className="bg-slate-800 p-4 rounded-lg border border-slate-700 mb-6">
                <h2 className="text-lg font-semibold mb-4 text-slate-200">Strategy Configuration</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 items-end mb-4">
                    <div>
                        <label htmlFor="strategy-select" className="block text-xs font-medium text-slate-400 mb-1">Strategy</label>
                         <select 
                            id="strategy-select"
                            value={strategy}
                            onChange={(e) => setStrategy(e.target.value as StrategyType)}
                            disabled={isRunning}
                            className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-kite-blue"
                         >
                            {strategyTypes.map(s => (
                                <option key={s.name} value={s.name}>
                                    {s.name.replace(/_/g, ' ')}
                                </option>
                            ))}
                         </select>
                    </div>

                    <div>
                        <label htmlFor="instrument-select" className="block text-xs font-medium text-slate-400 mb-1">Instrument</label>
                        <select
                            id="instrument-select"
                            value={instrument}
                            onChange={(e) => setInstrument(e.target.value as Instrument)}
                            disabled={isRunning}
                            className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-kite-blue"
                        >
                            {instruments.map(i => <option key={i.code} value={i.code}>{i.name}</option>)}
                        </select>
                    </div>

                     <div>
                        <label htmlFor="expiry-select" className="block text-xs font-medium text-slate-400 mb-1">Expiry</label>
                        <select
                            id="expiry-select"
                            value={selectedExpiry}
                            onChange={(e) => setSelectedExpiry(e.target.value)}
                            disabled={isRunning || expiries.length === 0}
                            className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-kite-blue disabled:opacity-50"
                        >
                            {expiries.length === 0 && <option>{instrument ? 'Loading...' : 'Select Instrument'}</option>}
                            {expiries.map((expiry) => (
                                <option key={expiry} value={expiry}>
                                    {expiry.charAt(0).toUpperCase() + expiry.slice(1).toLowerCase()}
                                </option>
                            ))}
                        </select>
                    </div>

                    {strategy === StrategyType.OTM_STRANGLE && (
                        <div>
                            <label htmlFor="strangle-distance" className="block text-xs font-medium text-slate-400 mb-1">Strangle Distance (pts)</label>
                            <input
                                id="strangle-distance"
                                type="number"
                                step={strikeInterval}
                                value={strangleDistance}
                                onChange={(e) => setStrangleDistance(Number(e.target.value))}
                                disabled={isRunning}
                                className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-kite-blue"
                            />
                        </div>
                    )}

                    <div>
                        <label htmlFor="quantity" className="block text-xs font-medium text-slate-400 mb-1">Lots</label>
                        <div className="flex items-center bg-slate-900 border border-slate-700 rounded-md">
                            <button onClick={handleDecrementLots} disabled={isRunning} className="px-2.5 py-1.5 text-base font-bold hover:bg-slate-700 transition-colors rounded-l-md disabled:opacity-50 disabled:cursor-not-allowed">-</button>
                            <div className="text-center flex-grow px-2 py-1.5 border-x border-slate-700">
                                <span className="font-semibold text-sm">{lots}</span>
                                {lotSize > 0 && <span className="text-xs text-slate-400"> ({lots * lotSize} Qty)</span>}
                            </div>
                            <button onClick={handleIncrementLots} disabled={isRunning} className="px-2.5 py-1.5 text-base font-bold hover:bg-slate-700 transition-colors rounded-r-md disabled:opacity-50 disabled:cursor-not-allowed">+</button>
                        </div>
                    </div>
                    <div>
                        <label htmlFor="stop-loss" className="block text-xs font-medium text-slate-400 mb-1">SL per Leg (pts)</label>
                        <input
                            id="stop-loss"
                            type="number"
                            value={stopLossPoints}
                            onChange={(e) => setStopLossPoints(Number(e.target.value))}
                            disabled={isRunning}
                            className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-kite-blue"
                        />
                    </div>
                    <div>
                        <label htmlFor="target-points" className="block text-xs font-medium text-slate-400 mb-1">Target per Leg (pts)</label>
                        <input
                            id="target-points"
                            type="number"
                            value={targetPoints}
                            onChange={(e) => setTargetPoints(Number(e.target.value))}
                            disabled={isRunning}
                            className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-kite-blue"
                        />
                    </div>
                    <div>
                        <label htmlFor="max-loss" className="block text-xs font-medium text-slate-400 mb-1">Max Loss Limit (₹)</label>
                        <input
                            id="max-loss"
                            type="number"
                            value={maxLossLimit}
                            onChange={(e) => setMaxLossLimit(Number(e.target.value))}
                            disabled={isRunning}
                            className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-kite-blue"
                        />
                    </div>
                </div>
                 <div className="flex justify-end mt-4 space-x-4">
                     <button
                        onClick={handleRunHistorical}
                        disabled={isRunning || isHistoricalRunning || !instrument || !strategy || !selectedExpiry}
                        className="px-6 py-2 rounded-md font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-transform transform hover:scale-105 disabled:bg-gray-500 disabled:cursor-not-allowed disabled:scale-100"
                     >
                        {isHistoricalRunning ? 'Simulating...' : 'Run Historical'}
                     </button>
                     <button 
                        onClick={handleStartStop}
                        disabled={isStoppingBot || isHistoricalRunning || botStatus === BotStatus.MAX_LOSS_REACHED || !instrument || !strategy || !selectedExpiry}
                        className={`px-6 py-2 rounded-md font-semibold text-white transition-transform transform hover:scale-105 ${
                            isRunning 
                                ? (confirmingStopBot ? 'bg-orange-600 hover:bg-orange-700' : 'bg-red-600 hover:bg-red-700') 
                                : 'bg-green-600 hover:bg-green-700'
                        } disabled:bg-gray-500 disabled:cursor-not-allowed disabled:scale-100`}
                     >
                        {isRunning ? (isStoppingBot ? 'Stopping...' : (confirmingStopBot ? 'Confirm Stop?' : 'Stop Bot')) : 'Start Bot'}
                     </button>
                </div>
            </div>

            {historicalResult && (
                <div className="bg-slate-800 p-4 rounded-lg border border-slate-700 mb-6">
                    <HistoricalPLChart data={historicalResult} onClear={() => setHistoricalResult(null)} />
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-slate-800 p-4 rounded-lg border border-slate-700">
                    <div className="flex border-b border-slate-700">
                        <TabButton title={`Active Strategies (${activeStrategies.length})`} isActive={activeTab === 'strategies'} onClick={() => setActiveTab('strategies')} />
                        <TabButton title={`Positions (${positions.length})`} isActive={activeTab === 'positions'} onClick={() => setActiveTab('positions')} />
                        <TabButton title={`Orders (${orders.length})`} isActive={activeTab === 'orders'} onClick={() => setActiveTab('orders')} />
                    </div>
                    <div className="mt-4">
                        {activeTab === 'strategies' && (
                            <ActiveStrategiesTable 
                                strategies={activeStrategies} 
                                onStopMonitoring={handleStopMonitoring} 
                                stoppingMonitorId={stoppingMonitorId}
                                confirmingStopMonitorId={confirmingStopMonitorId}
                            />
                        )}
                        {activeTab === 'positions' && <PositionsTable positions={positions} isLoading={isPositionsLoading} />}
                        {activeTab === 'orders' && <OrdersTable orders={orders} isLoading={isOrdersLoading} />}
                    </div>
                </div>
                <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
                   <h2 className="text-xl font-semibold mb-4 text-slate-200">Logs</h2>
                   <TradeLogView logs={tradeLog} />
                </div>
            </div>
             <footer className="text-center text-slate-400 mt-8 text-sm">
                <p>Current Time: {currentTime.toLocaleTimeString()}</p>
                <p className="mt-2">This application interacts with a live backend. Not financial advice.</p>
            </footer>
        </div>
    );
};

export default Dashboard;