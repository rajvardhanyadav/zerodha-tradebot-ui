import { Instrument, StrategyType, StrategyPosition } from '../types';
import * as api from './kiteConnect';

interface ExecuteStrategyParams {
  strategyType: StrategyType;
  instrumentType: Instrument;
  expiry: string; // e.g., "WEEKLY", "MONTHLY", or "2024-11-28"
  strikeGap?: number;
  lots: number;
  stopLossPoints: number;
  targetPoints: number;
  maxLossLimit: number;
}

export const runStrategy = async (params: ExecuteStrategyParams): Promise<any> => {
    const apiParams: any = {
        strategyType: params.strategyType,
        instrumentType: params.instrumentType,
        expiry: params.expiry,
        lots: params.lots,
        stopLossPoints: params.stopLossPoints,
        targetPoints: params.targetPoints,
        maxLossLimit: params.maxLossLimit,
    };

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