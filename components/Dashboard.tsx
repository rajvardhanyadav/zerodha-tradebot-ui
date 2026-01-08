
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Instrument, BotStatus, TradeLog, StrategyType, ApiStrategyType, ApiInstrument, StrategyPosition, UserProfile, MonitoringStatus, Order, Position, OrderCharge, BotStatusResponse, HistoricalRunResult } from '../types';
import * as tradingService from '../services/tradingService';
import * as api from './../services/kiteConnect';
import { subscribeToApiLogs } from './../services/kiteConnect';
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
    const [strategy, setStrategy] = useState<string>('');
    const [strangleDistance, setStrangleDistance] = useState<number>(100);
    const [lots, setLots] = useState<number>(1);
    const [stopLossPoints, setStopLossPoints] = useState<number>(5);
    const [targetPoints, setTargetPoints] = useState<number>(5);
    const [maxLossLimit, setMaxLossLimit] = useState<number>(3000);
    // Percentage-based SL/Target mode
    const [slTargetMode, setSlTargetMode] = useState<'points' | 'percentage'>('points');
    const [targetDecayPct, setTargetDecayPct] = useState<number>(50);
    const [stopLossExpansionPct, setStopLossExpansionPct] = useState<number>(100);
    const [expiries, setExpiries] = useState<string[]>([]);
    const [selectedExpiry, setSelectedExpiry] = useState<string>('');
    const [totalPL, setTotalPL] = useState<number>(0);
    const [totalCharges, setTotalCharges] = useState<number>(0);
    const [netPL, setNetPL] = useState<number>(0);
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
    const [isStartingBot, setIsStartingBot] = useState<boolean>(false);
    const [activeTab, setActiveTab] = useState<'strategies' | 'positions' | 'orders'>('strategies');
    const [confirmingStopBot, setConfirmingStopBot] = useState<boolean>(false);
    const [confirmingStartBot, setConfirmingStartBot] = useState<boolean>(false);
    const [confirmingStopMonitorId, setConfirmingStopMonitorId] = useState<string | null>(null);
    const [isAutoRefreshEnabled, setIsAutoRefreshEnabled] = useState<boolean>(true);
    const [isManualRefreshing, setIsManualRefreshing] = useState<boolean>(false);
    const [isPositionsLoading, setIsPositionsLoading] = useState<boolean>(false);
    const [isOrdersLoading, setIsOrdersLoading] = useState<boolean>(false);
    const [tradingMode, setTradingMode] = useState<'PAPER_TRADING' | 'LIVE_TRADING' | null>(null);
    const [isSwitchingMode, setIsSwitchingMode] = useState<boolean>(false);
    const [confirmingSwitchMode, setConfirmingSwitchMode] = useState<boolean>(false);
    const [confirmingLogout, setConfirmingLogout] = useState<boolean>(false);

    // Refs to prevent duplicate API calls during initial load
    const initialDataLoadedRef = useRef<boolean>(false);
    const expiriesLoadedForInstrumentRef = useRef<string>('');

    const addLog = useCallback((message: string, type: TradeLog['type']) => {
        setTradeLog(prev => [{ timestamp: new Date().toLocaleTimeString(), message, type }, ...prev].slice(0, 100));
    }, []);

    // Subscribe to API logs for streaming backend call information
    useEffect(() => {
        const unsubscribe = subscribeToApiLogs((logEntry) => {
            setTradeLog(prev => [{ 
                timestamp: logEntry.timestamp, 
                message: logEntry.message, 
                type: logEntry.type 
            }, ...prev].slice(0, 100));
        });
        return unsubscribe;
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

    // Timeout for start bot confirmation
    useEffect(() => {
        let timer: number | undefined;
        if (confirmingStartBot) {
            addLog('Click "Start Bot" again within 5 seconds to confirm.', 'warning');
            timer = window.setTimeout(() => {
                setConfirmingStartBot(false);
            }, 5000);
        }
        return () => clearTimeout(timer);
    }, [confirmingStartBot, addLog]);
    
    // Timeout for mode switch confirmation
    useEffect(() => {
        let timer: number | undefined;
        if (confirmingSwitchMode) {
            const targetMode = tradingMode === 'LIVE_TRADING' ? 'PAPER' : 'LIVE';
            addLog(`Click again within 5 seconds to confirm switch to ${targetMode} mode.`, 'warning');
            timer = window.setTimeout(() => {
                setConfirmingSwitchMode(false);
            }, 5000);
        }
        return () => clearTimeout(timer);
    }, [confirmingSwitchMode, tradingMode, addLog]);

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

    // Timeout for logout confirmation
    useEffect(() => {
        let timer: number | undefined;
        if (confirmingLogout) {
            timer = window.setTimeout(() => {
                setConfirmingLogout(false);
            }, 5000);
        }
        return () => clearTimeout(timer);
    }, [confirmingLogout]);


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

    // Effect for loading initial config data - Sequential API calls to respect rate limits
    useEffect(() => {
        if (initialDataLoadedRef.current) return;
        initialDataLoadedRef.current = true;

        const loadInitialData = async () => {
            try {
                // Sequential API calls to respect server rate limits
                const profile = await api.getUserProfile();
                setUserProfile(profile);

                const modeStatus = await api.getTradingModeStatus();
                if (modeStatus) {
                    setTradingMode(modeStatus.mode);
                }

                const fetchedStrategies = await api.getStrategyTypes();
                const availableStrategies = fetchedStrategies;
                setStrategyTypes(availableStrategies);
                if (availableStrategies.length > 0) {
                    setStrategy(availableStrategies[0].name);
                }

                const fetchedInstruments = await api.getTradeableInstruments();
                setInstruments(fetchedInstruments);
                if (fetchedInstruments.length > 0) {
                    setInstrument(fetchedInstruments[0].code as Instrument);
                }

                addLog(`Welcome, ${profile.userName}. Configurations loaded.`, 'success');
            } catch (e) {
                // Error is logged by API logger
            }
        };
        loadInitialData();
    }, [addLog]);

    // Effect to run when instrument is changed by the user
    useEffect(() => {
        const loadExpiriesAndLtp = async () => {
            if (!instrument || instruments.length === 0) return;
            
            // Skip if we already loaded expiries for this instrument
            if (expiriesLoadedForInstrumentRef.current === instrument) return;
            expiriesLoadedForInstrumentRef.current = instrument;
            
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
                } else {
                    addLog(`No expiries found for ${instrument}`, 'warning');
                }

                const selectedInstrumentObject = instruments.find(i => i.code === instrument);
                if (selectedInstrumentObject) {
                    const currentLtp = await api.getLTP(selectedInstrumentObject.name);
                    setLtp(currentLtp);
                }
            } catch (e) {
                // Error is logged by API logger
            } finally {
                setIsLtpLoading(false);
            }
        };
        loadExpiriesAndLtp();
    }, [instrument, instruments, addLog]);
    
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

        const params: any = {
            strategyType: strategy,
            instrumentType: instrument,
            expiry: selectedExpiry,
            lots: lots,
            maxLossLimit,
            strikeGap: strategy === StrategyType.ATM_STRANGLE ? strangleDistance : undefined,
        };

        // Include SL/Target params based on selected mode
        if (slTargetMode === 'points') {
            params.stopLossPoints = stopLossPoints;
            params.targetPoints = targetPoints;
        } else {
            params.targetDecayPct = targetDecayPct;
            params.stopLossExpansionPct = stopLossExpansionPct;
        }

        if (strategy === StrategyType.ATM_STRANGLE) {
            if (strangleDistance <= 0) {
                addLog(`Strangle distance must be positive.`, 'error');
                return;
            }
        }

        const strategyDesc = strategy.replace(/_/g, ' ');
        const fullDesc = strategy === StrategyType.ATM_STRANGLE ? `${strategyDesc} (${strangleDistance} pts)` : strategyDesc;
        const slTargetDesc = slTargetMode === 'points' 
            ? `SL: ${stopLossPoints}pts, Target: ${targetPoints}pts`
            : `SL Expansion: ${stopLossExpansionPct}%, Target Decay: ${targetDecayPct}%`;
        addLog(`Executing: ${fullDesc} on ${instrument} for ${selectedExpiry} expiry with ${lots} lot(s). ${slTargetDesc}`, 'info');

        try {
            const result = await tradingService.runStrategy(params);
            setBotStatus(BotStatus.RUNNING); // Optimistically set to running, next poll will confirm
        } catch (error) {
            // Error is logged by API logger
        }
    }, [instrument, addLog, totalPL, selectedExpiry, strategy, strangleDistance, lots, stopLossPoints, targetPoints, maxLossLimit, slTargetMode, targetDecayPct, stopLossExpansionPct]);
    
    const fetchData = useCallback(async (isManual = false) => {
        if (isManual) {
            setIsManualRefreshing(true);
        }
    
        try {
            // Sequential API calls to respect server rate limits
            const fetchedStrategies = await tradingService.getActiveStrategies();
            const monitorStatus = await api.getMonitoringStatus();
            const fetchedPositions = await api.getPositions();
            const fetchedOrders = await api.getOrders();
            const fetchedCharges = await api.getOrderCharges();
            const fetchedBotStatus = await api.getBotStatus();
            
            let currentLtp: number | undefined;
            const selectedInstrumentObject = instruments.find(i => i.code === instrument);
            if (selectedInstrumentObject) {
                currentLtp = await api.getLTP(selectedInstrumentObject.name);
            }
            
            if (currentLtp !== undefined) {
                setLtp(prevLtp => (currentLtp !== prevLtp ? currentLtp : prevLtp));
            }
            setActiveStrategies(prev => JSON.stringify(prev) !== JSON.stringify(fetchedStrategies) ? fetchedStrategies : prev);
            setMonitoringStatus(prev => JSON.stringify(prev) !== JSON.stringify(monitorStatus) ? monitorStatus : prev);
            setPositions(prev => JSON.stringify(prev) !== JSON.stringify(fetchedPositions) ? fetchedPositions : prev);
            setOrders(prev => JSON.stringify(prev) !== JSON.stringify(fetchedOrders) ? fetchedOrders : prev);
    
            // Calculate P/L from strategies API - only for COMPLETED strategies (not ACTIVE ones)
            let currentGrossPL = 0;
            if (fetchedStrategies && fetchedStrategies.length > 0) {
                const completedStatuses = ['COMPLETED', 'STOPPED', 'MAX_LOSS_REACHED'];
                currentGrossPL = fetchedStrategies
                    .filter((strategy: StrategyPosition) => completedStatuses.includes(strategy.status.toUpperCase()))
                    .reduce((sum: number, strategy: StrategyPosition) => {
                        let strategyPL = strategy.profitLoss ?? 0;
                        
                        // If profitLoss is not set, calculate from orderLegs
                        if ((strategy.profitLoss === null || strategy.profitLoss === undefined) && strategy.orderLegs) {
                            strategyPL = strategy.orderLegs.reduce((legSum, leg) => legSum + (leg.realizedPnl || 0), 0);
                        }
                        
                        return sum + strategyPL;
                    }, 0);
            }
            setTotalPL(prevPL => prevPL !== currentGrossPL ? currentGrossPL : prevPL);

            let currentTotalCharges = totalCharges;
            if (fetchedCharges) {
                currentTotalCharges = fetchedCharges.reduce((sum: number, charge: OrderCharge) => sum + (charge.charges?.total || 0), 0);
                setTotalCharges(prevCharges => prevCharges !== currentTotalCharges ? currentTotalCharges : prevCharges);
            }
            
            const currentNetPL = currentGrossPL - currentTotalCharges;
            setNetPL(prevNetPL => prevNetPL !== currentNetPL ? currentNetPL : prevNetPL);

            // Update Bot Status based on API + Max Loss Logic
            if (fetchedBotStatus) {
                let newStatus = fetchedBotStatus.status === 'RUNNING' ? BotStatus.RUNNING : BotStatus.STOPPED;
                
                // Override status if Max Loss is reached locally while bot is running
                if (newStatus === BotStatus.RUNNING && currentGrossPL <= -maxLossLimit) {
                    newStatus = BotStatus.MAX_LOSS_REACHED;
                    // Log error if we are transitioning into this state
                    if (botStatus !== BotStatus.MAX_LOSS_REACHED) {
                        addLog(`Max daily loss of ${maxLossLimit} reached. Bot status forced to STOPPED locally.`, 'error');
                    }
                }
                setBotStatus(newStatus);
            }

            if (isManual) {
                addLog('Data refreshed.', 'success');
            }
    
        } catch(e) {
            // API errors are logged by API logger
            if ((e as Error).message.includes('Unauthorized')) {
                addLog('Session expired. Please log in again.', 'error');
                onLogout();
            }
        } finally {
            if (isManual) {
                setIsManualRefreshing(false);
            }
        }
    }, [botStatus, instrument, instruments, addLog, onLogout, maxLossLimit, totalPL, totalCharges]);
    
    // Main background loop for fetching data silently
    useEffect(() => {
        if (!isAutoRefreshEnabled) return;

        fetchData(); // Initial fetch
        const timer = setInterval(() => fetchData(), 10000); 

        return () => clearInterval(timer);
    }, [isAutoRefreshEnabled, fetchData]);
    
    const handleStopMonitoring = async (executionId: string) => {
        if (confirmingStopMonitorId === executionId) {
            setStoppingMonitorId(executionId);
            setConfirmingStopMonitorId(null); // Reset confirmation
            try {
                await api.stopMonitoringExecution(executionId);
                const strategies = await tradingService.getActiveStrategies();
                setActiveStrategies(strategies);
            } catch (e) {
                // Error is logged by API logger
            } finally {
                setStoppingMonitorId(null);
            }
        } else {
            setConfirmingStopMonitorId(executionId);
            setConfirmingStopBot(false);
            setConfirmingStartBot(false);
        }
    };
    
    const handleModeSwitch = async () => {
        if (isSwitchingMode || !tradingMode) return;

        if (confirmingSwitchMode) {
            setIsSwitchingMode(true);
            setConfirmingSwitchMode(false);
            const targetModeIsPaper = tradingMode === 'LIVE_TRADING';

            try {
                const result = await api.setTradingMode(targetModeIsPaper);
                setTradingMode(result.mode);
            } catch (e) {
                // Error is logged by API logger
            } finally {
                setIsSwitchingMode(false);
            }
        } else {
            setConfirmingSwitchMode(true);
            setConfirmingStopBot(false);
            setConfirmingStartBot(false);
            setConfirmingStopMonitorId(null);
        }
    };

    const handleStartStop = async () => {
        if (botStatus === BotStatus.RUNNING) {
            if (isStoppingBot) return;
            if (confirmingStopBot) {
                setIsStoppingBot(true);
                setConfirmingStopBot(false);
                try {
                    await tradingService.stopAllStrategies();
                    // Status update will happen in next fetchData poll or we can optimistically set it
                    setBotStatus(BotStatus.STOPPED);
                } catch (e) {
                    // Error is logged by API logger
                } finally {
                    setIsStoppingBot(false);
                }
            } else {
                setConfirmingStopBot(true);
                setConfirmingStartBot(false);
                setConfirmingStopMonitorId(null);
                setConfirmingSwitchMode(false);
                setConfirmingLogout(false);
            }
        } else if (botStatus === BotStatus.STOPPED || botStatus === BotStatus.INACTIVE) {
            if (isStartingBot) return;
            if (confirmingStartBot) {
                setIsStartingBot(true);
                setConfirmingStartBot(false);
                const strategyDesc = strategy.replace(/_/g, ' ');
                const fullDesc = strategy === StrategyType.ATM_STRANGLE 
                    ? `${strategyDesc} (${strangleDistance} pts)` 
                    : strategyDesc;
                const slTargetInfo = slTargetMode === 'points'
                    ? `SL: ${stopLossPoints}pts, Target: ${targetPoints}pts`
                    : `SL Expansion: ${stopLossExpansionPct}%, Target Decay: ${targetDecayPct}%`;
                addLog(`Starting bot for ${instrument} (${selectedExpiry}) with strategy: ${fullDesc}. ${slTargetInfo}`, 'info');
                
                try {
                    await executeStrategy();
                } finally {
                    setIsStartingBot(false);
                }
            } else {
                setConfirmingStartBot(true);
                setConfirmingStopBot(false);
                setConfirmingStopMonitorId(null);
                setConfirmingSwitchMode(false);
                setConfirmingLogout(false);
            }
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
        if (strategy === StrategyType.ATM_STRANGLE) {
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
                    {tradingMode && (
                        <button
                            onClick={handleModeSwitch}
                            disabled={isSwitchingMode}
                             className={`px-3 py-1.5 text-sm rounded-md font-semibold text-white transition-colors disabled:bg-slate-700 disabled:cursor-wait ${
                                isSwitchingMode
                                    ? 'bg-slate-600 animate-pulse'
                                    : confirmingSwitchMode
                                    ? 'bg-orange-500 hover:bg-orange-600'
                                    : tradingMode === 'PAPER_TRADING'
                                    ? 'bg-profit/80 hover:bg-profit'
                                    : 'bg-loss/80 hover:bg-loss'
                            }`}
                        >
                             {isSwitchingMode
                                ? 'Switching...'
                                : confirmingSwitchMode
                                ? `Confirm ${tradingMode === 'PAPER_TRADING' ? 'Live' : 'Paper'}?`
                                : `Mode: ${tradingMode === 'PAPER_TRADING' ? 'Paper' : 'Live'}`
                            }
                        </button>
                    )}
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
                    <button 
                        onClick={() => {
                            if (confirmingLogout) {
                                onLogout();
                            } else {
                                setConfirmingLogout(true);
                                setConfirmingStartBot(false);
                                setConfirmingStopBot(false);
                                setConfirmingSwitchMode(false);
                            }
                        }} 
                        className={`px-4 py-2 rounded-md font-semibold text-white transition-colors ${
                            confirmingLogout ? 'bg-orange-600 hover:bg-orange-700' : 'bg-slate-700 hover:bg-slate-600'
                        }`}
                    >
                        {confirmingLogout ? 'Confirm Logout?' : 'Logout'}
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
                <StatCard icon="charges" title="Charges" value={totalCharges.toFixed(2)} isCurrency={true} />
                <StatCard icon="net-pl" title="Net P/L" value={netPL.toFixed(2)} isCurrency={true} isPL={true} />
            </div>

            <div className="bg-slate-800 p-4 rounded-lg border border-slate-700 mb-6">
                <h2 className="text-lg font-semibold mb-4 text-slate-200">Strategy Configuration</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 items-end mb-4">
                    <div>
                        <label htmlFor="strategy-select" className="block text-xs font-medium text-slate-400 mb-1">Strategy</label>
                         <select 
                            id="strategy-select"
                            value={strategy}
                            onChange={(e) => setStrategy(e.target.value)}
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
                            onChange={(e) => {
                                const newInstrument = e.target.value as Instrument;
                                // Reset ref to allow reloading expiries for the new instrument
                                expiriesLoadedForInstrumentRef.current = '';
                                setInstrument(newInstrument);
                            }}
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

                    {strategy === StrategyType.ATM_STRANGLE && (
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
                    {/* SL/Target Mode Toggle */}
                    <div className="col-span-1 md:col-span-2 lg:col-span-3 xl:col-span-2">
                        <label className="block text-xs font-medium text-slate-400 mb-1">SL/Target Mode</label>
                        <div className="flex bg-slate-900 border border-slate-700 rounded-md overflow-hidden">
                            <button
                                type="button"
                                onClick={() => setSlTargetMode('points')}
                                disabled={isRunning}
                                className={`flex-1 px-3 py-1.5 text-sm font-medium transition-colors ${
                                    slTargetMode === 'points'
                                        ? 'bg-kite-blue text-white'
                                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                                } disabled:opacity-50 disabled:cursor-not-allowed`}
                            >
                                Points
                            </button>
                            <button
                                type="button"
                                onClick={() => setSlTargetMode('percentage')}
                                disabled={isRunning}
                                className={`flex-1 px-3 py-1.5 text-sm font-medium transition-colors ${
                                    slTargetMode === 'percentage'
                                        ? 'bg-kite-blue text-white'
                                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                                } disabled:opacity-50 disabled:cursor-not-allowed`}
                            >
                                Percentage
                            </button>
                        </div>
                    </div>

                    {/* Point-based inputs */}
                    {slTargetMode === 'points' && (
                        <>
                            <div>
                                <label htmlFor="stop-loss" className="block text-xs font-medium text-slate-400 mb-1">SL per Leg (pts)</label>
                                <input
                                    id="stop-loss"
                                    type="number"
                                    min="0"
                                    step="1"
                                    value={stopLossPoints}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        if (val === '' || /^\d*\.?\d*$/.test(val)) {
                                            setStopLossPoints(val === '' ? 0 : Number(val));
                                        }
                                    }}
                                    disabled={isRunning}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-kite-blue"
                                />
                            </div>
                            <div>
                                <label htmlFor="target-points" className="block text-xs font-medium text-slate-400 mb-1">Target per Leg (pts)</label>
                                <input
                                    id="target-points"
                                    type="number"
                                    min="0"
                                    step="1"
                                    value={targetPoints}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        if (val === '' || /^\d*\.?\d*$/.test(val)) {
                                            setTargetPoints(val === '' ? 0 : Number(val));
                                        }
                                    }}
                                    disabled={isRunning}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-kite-blue"
                                />
                            </div>
                        </>
                    )}

                    {/* Percentage-based inputs */}
                    {slTargetMode === 'percentage' && (
                        <>
                            <div>
                                <label htmlFor="stop-loss-expansion" className="block text-xs font-medium text-slate-400 mb-1">SL Expansion (%)</label>
                                <input
                                    id="stop-loss-expansion"
                                    type="number"
                                    min="0"
                                    max="500"
                                    step="1"
                                    value={stopLossExpansionPct}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        if (val === '' || /^\d*\.?\d*$/.test(val)) {
                                            const numVal = val === '' ? 0 : Number(val);
                                            setStopLossExpansionPct(Math.min(500, Math.max(0, numVal)));
                                        }
                                    }}
                                    disabled={isRunning}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-kite-blue"
                                    title="Percentage by which stop-loss expands (0-500%)"
                                />
                            </div>
                            <div>
                                <label htmlFor="target-decay" className="block text-xs font-medium text-slate-400 mb-1">Target Decay (%)</label>
                                <input
                                    id="target-decay"
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="1"
                                    value={targetDecayPct}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        if (val === '' || /^\d*\.?\d*$/.test(val)) {
                                            const numVal = val === '' ? 0 : Number(val);
                                            setTargetDecayPct(Math.min(100, Math.max(0, numVal)));
                                        }
                                    }}
                                    disabled={isRunning}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-kite-blue"
                                    title="Target percentage decay (0-100%)"
                                />
                            </div>
                        </>
                    )}
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
                        onClick={handleStartStop}
                        disabled={isStoppingBot || isStartingBot || botStatus === BotStatus.MAX_LOSS_REACHED || !instrument || !strategy || !selectedExpiry}
                        className={`px-6 py-2 rounded-md font-semibold text-white transition-transform transform hover:scale-105 ${
                            isRunning 
                                ? (confirmingStopBot ? 'bg-orange-600 hover:bg-orange-700' : 'bg-red-600 hover:bg-red-700') 
                                : (confirmingStartBot || isStartingBot ? 'bg-green-700 hover:bg-green-800' : 'bg-green-600 hover:bg-green-700')
                        } disabled:bg-gray-500 disabled:cursor-not-allowed disabled:scale-100`}
                     >
                        {isRunning 
                            ? (isStoppingBot ? 'Stopping...' : (confirmingStopBot ? 'Confirm Stop?' : 'Stop Bot')) 
                            : (isStartingBot ? 'Starting...' : (confirmingStartBot ? 'Confirm Start?' : 'Start Bot'))
                        }
                     </button>
                </div>
            </div>

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