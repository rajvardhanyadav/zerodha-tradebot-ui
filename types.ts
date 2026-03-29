



export enum Instrument {
  NIFTY = 'NIFTY',
  BANKNIFTY = 'BANKNIFTY',
  FINNIFTY = 'FINNIFTY',
}

export enum BotStatus {
  RUNNING = 'RUNNING',
  STOPPED = 'STOPPED',
  INACTIVE = 'INACTIVE',
  MAX_LOSS_REACHED = 'MAX_LOSS_REACHED',
}

export const StrategyType = {
  ATM_STRADDLE: 'ATM_STRADDLE',
  ATM_STRANGLE: 'ATM_STRANGLE',
} as const;

export type StrategyType = string;

export interface ApiStrategyType {
  name: string;
  description: string;
  implemented: boolean;
}

export interface ApiInstrument {
  code: string;
  name: string;
  lotSize: number;
  strikeInterval: number;
}

export interface OrderLeg {
    orderId: string;
    tradingSymbol: string;
    optionType: string;
    quantity: number;
    entryPrice: number;
    entryTransactionType: string;
    entryTimestamp: number;
    lifecycleState: string;
    exitOrderId?: string;
    exitTransactionType?: string;
    exitQuantity?: number;
    exitPrice?: number;
    exitTimestamp?: number;
    exitStatus?: string;
    realizedPnl?: number;
}

// New type for active strategies from the /api/strategies/active endpoint
export interface StrategyPosition {
  executionId: string;
  strategyType: string;
  instrumentType: string;
  expiry: string;
  status: string;
  message: string;
  entryPrice: number | null;
  currentPrice: number | null;
  profitLoss: number | null;
  timestamp: number;
  entryTimestamp?: number;
  exitTimestamp?: number;
  orderLegs?: OrderLeg[];
}


export interface TradeLog {
  timestamp: string;
  message: string;
  type: 'info' | 'success' | 'error' | 'warning';
}

export interface UserProfile {
  userName: string;
  userId: string;
}

export interface MonitoringStatus {
  connected: boolean;
  activeMonitors: number;
}

export interface Order {
  orderId: string;
  status: string;
  tradingSymbol: string;
  exchange: string;
  transactionType: "BUY" | "SELL";
  orderType: string;
  product: string;
  quantity: number;
  averagePrice: number;
  filledQuantity: number;
  orderTimestamp: string;
}

export interface Position {
  tradingSymbol: string;
  exchange: string;
  product: string;
  netQuantity: number;
  averagePrice: number;
  lastPrice: number;
  pnl: number;
  buyValue: number;
  sellValue: number;
}

export interface HistoricalPnlPoint {
  timestamp: string; // e.g., "09:15:00"
  pnl: number;
}

export interface HistoricalRunResult {
  executionId: string;
  finalPnL: number;
  pnlData: HistoricalPnlPoint[];
  message: string;
}

export interface TradingModeStatus {
  paperTradingEnabled: boolean;
  mode: 'PAPER_TRADING' | 'LIVE_TRADING';
  description: string;
  message?: string;
}

export interface OrderCharge {
    transactionType: "BUY" | "SELL";
    tradingsymbol: string;
    exchange: string;
    variety: string;
    product: string;
    orderType: string;
    quantity: number;
    price: number;
    charges: {
        transactionTax: number;
        transactionTaxType: string;
        exchangeTurnoverCharge: number;
        sebiTurnoverCharge: number;
        brokerage: number;
        stampDuty: number;
        gst: {
            igst: number;
            cgst: number;
            sgst: number;
            total: number;
        };
        total: number;
    };
}

export interface BotStatusResponse {
    status: 'RUNNING' | 'STOPPED';
    lastUpdated: string;
}

// ============================================================
// Backtest API Types
// ============================================================

export interface BacktestApiResponse<T> {
  success: boolean;
  message: string;
  data: T | null;
}

export interface BacktestRequest {
  backtestDate: string;
  strategyType: "SELL_ATM_STRADDLE" | "ATM_STRADDLE";
  instrumentType: "NIFTY" | "BANKNIFTY";
  expiryDate: string;
  lots?: number;
  slTargetMode?: "points" | "premium" | "percentage";
  stopLossPoints?: number;
  targetPoints?: number;
  targetDecayPct?: number;
  stopLossExpansionPct?: number;
  startTime?: string;
  endTime?: string;
  autoSquareOffTime?: string;
  candleInterval?: string;
  autoRestartEnabled?: boolean;
  maxAutoRestarts?: number;
  trailingStopEnabled?: boolean;
  trailingActivationPoints?: number;
  trailingDistancePoints?: number;
}

export interface BacktestResult {
  backtestId: string;
  backtestDate: string;
  strategyType: string;
  instrumentType: string;
  status: "COMPLETED" | "FAILED" | "RUNNING";
  errorMessage: string | null;
  spotPriceAtEntry: number;
  atmStrike: number;
  trades: BacktestTrade[];
  totalPnLPoints: number;
  totalPnLAmount: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  maxDrawdownPct: number;
  maxProfitPct: number;
  avgWinAmount: number;
  avgLossAmount: number;
  profitFactor: number;
  restartCount: number;
  executionDurationMs: number;
}

export interface BacktestTrade {
  tradeNumber: number;
  ceSymbol: string;
  peSymbol: string;
  strikePrice: number;
  entryTime: string;
  ceEntryPrice: number;
  peEntryPrice: number;
  combinedEntryPremium: number;
  exitTime: string;
  ceExitPrice: number;
  peExitPrice: number;
  combinedExitPremium: number;
  quantity: number;
  pnlPoints: number;
  pnlAmount: number;
  exitReason: string;
  wasRestarted: boolean;
}

export interface BacktestStrategyInfo {
  name: string;
  description: string;
  backtestSupported: boolean;
}

// ============================================================
// Market Analysis API Types
// ============================================================

export type MarketRegime = 'STRONG_NEUTRAL' | 'WEAK_NEUTRAL' | 'TRENDING';
export type BreakoutRisk = 'LOW' | 'MEDIUM' | 'HIGH';
export type VetoReason = 'BREAKOUT_HIGH' | 'EXCESSIVE_RANGE' | null;

export interface NeutralMarketLog {
  id: number;
  instrument: string;
  evaluatedAt: string;
  tradingDate: string;
  spotPrice: number;
  vwapValue: number | null;

  tradable: boolean;
  regime: MarketRegime;
  breakoutRisk: BreakoutRisk;
  vetoReason: string | null;

  regimeScore: number;
  microScore: number;
  finalScore: number;
  confidence: number;
  timeAdjustment: number | null;
  microTradable: boolean;

  vwapProximityPassed: boolean;
  vwapDeviation: number | null;
  rangeCompressionPassed: boolean;
  rangeFraction: number | null;
  oscillationPassed: boolean;
  oscillationReversals: number | null;
  adxPassed: boolean;
  adxValue: number | null;
  gammaPinPassed: boolean;
  expiryDay: boolean;

  microVwapPullbackPassed: boolean;
  microHfOscillationPassed: boolean;
  microRangeStabilityPassed: boolean;

  breakoutRiskLow: boolean;
  excessiveRangeSafe: boolean;

  summary: string | null;
  evaluationDurationMs: number | null;
  createdAt: string;
}

export interface NeutralMarketSummary {
  date: string;
  totalEvaluations: number;
  tradableCount: number;
  skippedCount: number;
  tradablePercentage: number;

  avgRegimeScore: number | null;
  avgMicroScore: number | null;
  avgConfidence: number | null;
  avgEvaluationDurationMs: number | null;

  regimeDistribution: Record<string, number>;
  vetoReasonDistribution: Record<string, number>;
  signalPassRates: Record<string, string>;
}