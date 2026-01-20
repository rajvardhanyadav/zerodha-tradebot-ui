
import { Instrument, StrategyType, StrategyPosition } from '../types';
import * as api from './kiteConnect';

interface ExecuteStrategyParams {
  strategyType: string;
  instrumentType: Instrument;
  expiry: string; // e.g., "WEEKLY", "MONTHLY", or "2024-11-28"
  strikeGap?: number;
  lots: number;
  maxLossLimit: number;
  // SL/Target mode: 'points' or 'percentage'
  slTargetMode: 'points' | 'percentage';
  // Point-based SL/Target (optional - used when point mode is selected)
  stopLossPoints?: number;
  targetPoints?: number;
  // Percentage-based SL/Target (optional - used when percentage mode is selected)
  targetDecayPct?: number;
  stopLossExpansionPct?: number;
}

export const runStrategy = async (params: ExecuteStrategyParams): Promise<any> => {
    const apiParams: any = {
        strategyType: params.strategyType,
        instrumentType: params.instrumentType,
        expiry: params.expiry,
        lots: params.lots,
        maxLossLimit: params.maxLossLimit,
        slTargetMode: params.slTargetMode,
    };

    // Add SL/Target params based on which mode was used
    // Point-based mode
    if (params.stopLossPoints !== undefined) {
        apiParams.stopLossPoints = params.stopLossPoints;
    }
    if (params.targetPoints !== undefined) {
        apiParams.targetPoints = params.targetPoints;
    }
    // Percentage-based mode
    if (params.targetDecayPct !== undefined) {
        apiParams.targetDecayPct = params.targetDecayPct;
    }
    if (params.stopLossExpansionPct !== undefined) {
        apiParams.stopLossExpansionPct = params.stopLossExpansionPct;
    }

    // FIX: Corrected typo from OTM_STRANGLE to ATM_STRANGLE to match the StrategyType enum.
    if (params.strategyType === StrategyType.ATM_STRANGLE && params.strikeGap) {
        apiParams.strikeGap = params.strikeGap;
    }
    
    return api.executeStrategy(apiParams);
};

export const getActiveStrategies = (): Promise<StrategyPosition[]> => {
    return api.getActiveStrategies();
};

export const stopAllStrategies = (): Promise<{ message: string }> => {
    return api.stopAllStrategies();
};