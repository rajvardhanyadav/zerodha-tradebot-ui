
import React, { useState, useEffect, useCallback } from 'react';
import { Instrument, BotStatus, TradeLog, StrategyType, ApiStrategyType, ApiInstrument, StrategyPosition, UserProfile, MonitoringStatus, Order, Position } from '../types';
import * as tradingService from '../services/tradingService';
import * as api from '../services/kiteConnect';
import StatCard from './StatCard';
import ActiveStrategiesTable from './ActiveStrategiesTable';
import PositionsTable from './PositionsTable';
import OrdersTable from './OrdersTable';
import TradeLogView from './TradeLogView';

const MAX_LOSS = -3000;

const TabButton: React.FC<{ title: string; isActive: boolean; onClick: () => void }> = ({ title, isActive, onClick }) => (
    <button
        onClick={onClick}
        className={`px-4 py-2 text-sm font-medium transition-colors focus:outline-none ${
            isActive
                ? 'border-b-2 border-kite-blue text-dark-text'
                : 'text-dark-text-secondary hover:text-dark-text'
        }`}
    >
        {title}
    </button>
);

const Dashboard: React.FC<{ onLogout: () => void }> = ({ onLogout }) => {
    const [botStatus, setBotStatus] = useState<BotStatus>(BotStatus.STOPPED);
    const [instrument, setInstrument] = useState<Instrument | ''>('');
    const [strategy, setStrategy] = useState<StrategyType | ''>('');
    const [strangleDistance, setStrangleDistance] = useState<number>(100);
    const [expiries, setExpiries] = useState<string[]>([]);
    const [selectedExpiry, setSelectedExpiry] = useState<string>('');
    const [totalPL, setTotalPL] = useState<number>(0);
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
    const [activeTab, setActiveTab] = useState<'strategies' | 'positions' | 'orders'>('strategies');


    const addLog = useCallback((message: string, type: TradeLog['type']) => {
        setTradeLog(prev => [{ timestamp: new Date().toLocaleTimeString(), message, type }, ...prev].slice(0, 100));
    }, []);

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

    const executeStrategy = useCallback(async () => {
        if (totalPL <= MAX_LOSS) {
            setBotStatus(BotStatus.MAX_LOSS_REACHED);
            addLog(`Max daily loss of ${MAX_LOSS} reached. Stopping trade for the day.`, 'error');
            return;
        }
        
        if (!selectedExpiry || !strategy || !instrument) {
            addLog('Strategy, instrument, or expiry not selected. Cannot place trade.', 'error');
            return;
        }
        
        addLog('Note: New API does not support auto-closing positions. A new strategy will be opened.', 'warning');

        const params: {
            strategyType: StrategyType;
            instrumentType: Instrument;
            expiry: string;
            strikeGap?: number;
        } = {
            strategyType: strategy,
            instrumentType: instrument,
            expiry: selectedExpiry,
        };

        if (strategy === StrategyType.OTM_STRANGLE) {
            if (strangleDistance <= 0) {
                addLog(`Strangle distance must be positive.`, 'error');
                return;
            }
            params.strikeGap = strangleDistance;
        }

        const strategyDesc = strategy.replace(/_/g, ' ');
        const fullDesc = strategy === StrategyType.OTM_STRANGLE ? `${strategyDesc} (${strangleDistance} pts)` : strategyDesc;
        addLog(`Executing: ${fullDesc} on ${instrument} for ${selectedExpiry} expiry.`, 'info');

        try {
            const result = await tradingService.runStrategy(params);
            addLog(`Strategy execution request sent successfully. Message: ${result.message}`, 'success');
        } catch (error) {
            addLog(`Failed to execute strategy: ${(error as Error).message}`, 'error');
        }
    }, [instrument, addLog, totalPL, selectedExpiry, strategy, strangleDistance]);

    // Main background loop for fetching data silently
    useEffect(() => {
        if (!instrument || instruments.length === 0) return;
        
        const timer = setInterval(async () => {
            try {
                const selectedInstrumentObject = instruments.find(i => i.code === instrument);
                if (!selectedInstrumentObject) return;

                const [fetchedStrategies, currentLtp, monitorStatus, fetchedOrders, fetchedPositions] = await Promise.all([
                    tradingService.getActiveStrategies(),
                    api.getLTP(selectedInstrumentObject.name),
                    api.getMonitoringStatus(),
                    api.getOrders(),
                    api.getPositions(),
                ]);
                
                setLtp(prevLtp => (currentLtp !== prevLtp ? currentLtp : prevLtp));
                setActiveStrategies(prev => JSON.stringify(prev) !== JSON.stringify(fetchedStrategies) ? fetchedStrategies : prev);
                setMonitoringStatus(prev => JSON.stringify(prev) !== JSON.stringify(monitorStatus) ? monitorStatus : prev);
                setOrders(prev => JSON.stringify(prev) !== JSON.stringify(fetchedOrders) ? fetchedOrders : prev);
                setPositions(prev => JSON.stringify(prev) !== JSON.stringify(fetchedPositions) ? fetchedPositions : prev);

                const currentPL = fetchedPositions.reduce((acc, s) => acc + (s.pnl ?? 0), 0);
                setTotalPL(prevPL => prevPL !== currentPL ? currentPL : prevPL);
                
                if (botStatus !== BotStatus.RUNNING) return;
                 
                if (currentPL <= MAX_LOSS) {
                    setBotStatus(BotStatus.MAX_LOSS_REACHED);
                    addLog(`Max daily loss of ${MAX_LOSS} reached. Bot stopped.`, 'error');
                    addLog('Note: Positions must be closed manually.', 'warning');
                    return;
                }
            } catch(e) {
                addLog(`Error in main loop: ${(e as Error).message}`, 'error');
                if ((e as Error).message.includes('Unauthorized')) {
                    addLog('Session expired. Please log in again.', 'error');
                    onLogout();
                }
            }
        }, 10000); 

        return () => clearInterval(timer);
    }, [botStatus, instrument, instruments, addLog, onLogout]);
    
    const handleStopMonitoring = async (executionId: string) => {
        if (!window.confirm('Are you sure you want to stop monitoring this strategy? You will have to manage the position manually.')) {
            return;
        }
        addLog(`Requesting to stop monitoring for ${executionId}...`, 'info');
        setStoppingMonitorId(executionId);
        try {
            const message = await api.stopMonitoringExecution(executionId);
            addLog(message, 'success');
            // Manually refresh active strategies to reflect change immediately
            const strategies = await tradingService.getActiveStrategies();
            setActiveStrategies(strategies);
        } catch (e) {
            addLog(`Failed to stop monitoring: ${(e as Error).message}`, 'error');
        } finally {
            setStoppingMonitorId(null);
        }
    };

    const handleStartStop = async () => {
        if (botStatus === BotStatus.RUNNING) {
            setBotStatus(BotStatus.STOPPED);
            addLog('Bot stopped manually. Active strategies will NOT be closed automatically.', 'warning');
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
    
    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
             <header className="flex flex-col md:flex-row justify-between items-start mb-6">
                <div className="flex items-center space-x-4">
                    <img src="https://kite.zerodha.com/static/images/kite-logo.svg" alt="Kite" className="h-8 w-auto bg-white p-1 rounded-sm" />
                    <div>
                        <h1 className="text-2xl font-bold text-dark-text">TradeBot Dashboard</h1>
                        {userProfile && <p className="text-sm text-dark-text-secondary">Welcome, {userProfile.userName}</p>}
                    </div>
                </div>
                <div className="flex flex-col items-stretch md:items-end space-y-4 mt-4 md:mt-0 w-full md:w-auto">
                    <div className="flex flex-wrap justify-start md:justify-end gap-4">
                         <select 
                            value={strategy}
                            onChange={(e) => setStrategy(e.target.value as StrategyType)}
                            disabled={isRunning}
                            className="bg-dark-card border border-dark-border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-kite-blue"
                            aria-label="Select strategy"
                         >
                            {strategyTypes.map(s => (
                                <option key={s.name} value={s.name}>
                                    {s.name.replace(/_/g, ' ')}
                                </option>
                            ))}
                         </select>

                         {strategy === StrategyType.OTM_STRANGLE && (
                            <div className="relative">
                                 <input
                                    type="number"
                                    step={instrument === Instrument.NIFTY ? 50 : 100}
                                    value={strangleDistance}
                                    onChange={(e) => setStrangleDistance(Number(e.target.value))}
                                    disabled={isRunning}
                                    className="bg-dark-card border border-dark-border rounded-md pl-3 pr-12 py-2 w-32 focus:outline-none focus:ring-2 focus:ring-kite-blue"
                                    aria-label="Strangle distance"
                                 />
                                <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-dark-text-secondary text-sm">
                                    pts
                                </span>
                            </div>
                         )}

                         <select 
                            value={instrument}
                            onChange={(e) => setInstrument(e.target.value as Instrument)}
                            disabled={isRunning}
                            className="bg-dark-card border border-dark-border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-kite-blue"
                         >
                            {instruments.map(i => <option key={i.code} value={i.code}>{i.name}</option>)}
                         </select>
                         <select
                            value={selectedExpiry}
                            onChange={(e) => setSelectedExpiry(e.target.value)}
                            disabled={isRunning || expiries.length === 0}
                            className="bg-dark-card border border-dark-border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-kite-blue disabled:opacity-50"
                            aria-label="Select expiry date"
                         >
                            {expiries.length === 0 && <option>{instrument ? 'Loading...' : 'Select Instrument'}</option>}
                            {expiries.map((expiry) => (
                                <option key={expiry} value={expiry}>
                                    {expiry.charAt(0).toUpperCase() + expiry.slice(1).toLowerCase()}
                                </option>
                            ))}
                         </select>
                    </div>
                    <div className="flex gap-4 self-start md:self-end">
                         <button 
                            onClick={handleStartStop}
                            disabled={botStatus === BotStatus.MAX_LOSS_REACHED || !instrument || !strategy || !selectedExpiry}
                            className={`px-6 py-2 rounded-md font-semibold text-white transition-colors ${
                                isRunning ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'
                            } disabled:bg-gray-500 disabled:cursor-not-allowed`}
                         >
                            {isRunning ? 'Stop Bot' : 'Start Bot'}
                         </button>
                          <button onClick={onLogout} className="px-4 py-2 rounded-md font-semibold text-white bg-gray-600 hover:bg-gray-700">
                            Logout
                         </button>
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                <StatCard title="Bot Status" value={botStatus} status={botStatus} />
                <StatCard 
                    title="Monitoring Service" 
                    value={monitoringStatus ? (monitoringStatus.connected ? 'Connected' : 'Disconnected') : '...'}
                    status={monitoringStatus ? (monitoringStatus.connected ? BotStatus.RUNNING : BotStatus.STOPPED) : undefined}
                    subtitle={monitoringStatus ? `${monitoringStatus.activeMonitors} active` : ''}
                />
                <StatCard title={`${instrument || 'Index'} LTP`} value={isLtpLoading ? ltpLoadingDots : (ltp > 0 ? ltp.toFixed(2) : '...')} />
                <StatCard title="Total P/L" value={totalPL.toFixed(2)} isCurrency={true} isPL={true} />
                <StatCard title="Max Loss Limit" value={MAX_LOSS.toFixed(2)} isCurrency={true} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-dark-card p-4 rounded-lg border border-dark-border">
                    <div className="flex border-b border-dark-border">
                        <TabButton title="Active Strategies" isActive={activeTab === 'strategies'} onClick={() => setActiveTab('strategies')} />
                        <TabButton title="Positions" isActive={activeTab === 'positions'} onClick={() => setActiveTab('positions')} />
                        <TabButton title="Orders" isActive={activeTab === 'orders'} onClick={() => setActiveTab('orders')} />
                    </div>
                    <div className="mt-4">
                        {activeTab === 'strategies' && (
                            <ActiveStrategiesTable 
                                strategies={activeStrategies} 
                                onStopMonitoring={handleStopMonitoring} 
                                stoppingMonitorId={stoppingMonitorId}
                            />
                        )}
                        {activeTab === 'positions' && <PositionsTable positions={positions} />}
                        {activeTab === 'orders' && <OrdersTable orders={orders} />}
                    </div>
                </div>
                <div className="bg-dark-card p-4 rounded-lg border border-dark-border">
                   <h2 className="text-xl font-semibold mb-4 text-dark-text">Logs</h2>
                   <TradeLogView logs={tradeLog} />
                </div>
            </div>
             <footer className="text-center text-dark-text-secondary mt-8 text-sm">
                <p>Current Time: {currentTime.toLocaleTimeString()}</p>
                <p className="mt-2">This application interacts with a live backend. Not financial advice.</p>
            </footer>
        </div>
    );
};

export default Dashboard;
