
import { BacktestRequest, BacktestResult, BacktestStrategyInfo, BacktestApiResponse } from '../types';

// Keep in sync with services/kiteConnect.ts BASE_URL
const BASE_URL = 'http://localhost:8080/api/backtest';
//const BASE_URL = 'https://zerodhabot-genai-3-874874921792.asia-south2.run.app/api/backtest';

// --- Fetch Helper ---

async function backtestFetch<T>(
    endpoint: string,
    options: RequestInit = {}
): Promise<BacktestApiResponse<T>> {
    const token = localStorage.getItem('jwtToken');
    const userId = localStorage.getItem('userId');
    const headers: Record<string, string> = {};

    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (userId) headers['X-User-Id'] = userId;
    if (options.body) headers['Content-Type'] = 'application/json';

    const response = await fetch(`${BASE_URL}${endpoint}`, {
        ...options,
        headers: { ...headers, ...(options.headers as Record<string, string>) },
    });

    if (response.status === 404) {
        return { success: false, message: 'Not found', data: null };
    }

    const body: BacktestApiResponse<T> = await response.json();

    if (response.status === 400) {
        throw new Error(body.message || 'Validation error');
    }

    return body;
}

// --- API Client ---

export const backtestApi = {
    /** Run single-day backtest (synchronous) */
    run: (request: BacktestRequest): Promise<BacktestApiResponse<BacktestResult>> =>
        backtestFetch<BacktestResult>('/run', {
            method: 'POST',
            body: JSON.stringify(request),
        }),

    /** Run batch backtest over date range */
    batch: (fromDate: string, toDate: string, request: BacktestRequest): Promise<BacktestApiResponse<BacktestResult[]>> =>
        backtestFetch<BacktestResult[]>(
            `/batch?fromDate=${fromDate}&toDate=${toDate}`,
            {
                method: 'POST',
                body: JSON.stringify(request),
            }
        ),

    /** Start async backtest, returns backtestId */
    runAsync: (request: BacktestRequest): Promise<BacktestApiResponse<string>> =>
        backtestFetch<string>('/run-async', {
            method: 'POST',
            body: JSON.stringify(request),
        }),

    /** Get result by ID (for polling) */
    getResult: (backtestId: string): Promise<BacktestApiResponse<BacktestResult>> =>
        backtestFetch<BacktestResult>(`/result/${backtestId}`),

    /** Get all cached results */
    getAllResults: (): Promise<BacktestApiResponse<BacktestResult[]>> =>
        backtestFetch<BacktestResult[]>('/results'),

    /** Get supported strategies */
    getStrategies: (): Promise<BacktestApiResponse<BacktestStrategyInfo[]>> =>
        backtestFetch<BacktestStrategyInfo[]>('/strategies'),

    /** Clear result cache */
    clearCache: (): Promise<BacktestApiResponse<null>> =>
        backtestFetch<null>('/cache', { method: 'DELETE' }),
};

// --- Exit Reason Parser ---

export function getExitLabel(exitReason: string): { label: string; colorClass: string; bgClass: string } {
    if (exitReason.includes('TARGET_HIT'))
        return { label: 'Target Hit', colorClass: 'text-green-400', bgClass: 'bg-green-500/20 text-green-400' };
    if (exitReason.includes('STOPLOSS_HIT'))
        return { label: 'Stop Loss', colorClass: 'text-red-400', bgClass: 'bg-red-500/20 text-red-400' };
    if (exitReason.includes('PREMIUM_DECAY'))
        return { label: 'Premium Target', colorClass: 'text-green-400', bgClass: 'bg-green-500/20 text-green-400' };
    if (exitReason.includes('PREMIUM_EXPANSION'))
        return { label: 'Premium SL', colorClass: 'text-red-400', bgClass: 'bg-red-500/20 text-red-400' };
    if (exitReason.includes('TRAILING'))
        return { label: 'Trailing SL', colorClass: 'text-amber-400', bgClass: 'bg-amber-500/20 text-amber-400' };
    if (exitReason.includes('TIME_BASED_FORCED_EXIT'))
        return { label: 'Auto Square Off', colorClass: 'text-blue-400', bgClass: 'bg-blue-500/20 text-blue-400' };
    if (exitReason.includes('END_OF_DATA'))
        return { label: 'End of Data', colorClass: 'text-slate-400', bgClass: 'bg-slate-500/20 text-slate-400' };
    return { label: exitReason, colorClass: 'text-slate-400', bgClass: 'bg-slate-500/20 text-slate-400' };
}

// --- Async Polling Helper ---

export async function pollBacktestResult(
    backtestId: string,
    onProgress?: (result: BacktestResult) => void,
    intervalMs = 2000,
    maxAttempts = 150
): Promise<BacktestResult> {
    for (let i = 0; i < maxAttempts; i++) {
        await new Promise(resolve => setTimeout(resolve, intervalMs));
        const res = await backtestApi.getResult(backtestId);

        if (!res.success || !res.data) continue;

        if (onProgress) onProgress(res.data);

        if (res.data.status === 'COMPLETED' || res.data.status === 'FAILED') {
            return res.data;
        }
    }
    throw new Error('Backtest polling timed out after 5 minutes');
}

// --- Formatting Helpers ---

export const formatCurrency = (value: number): string =>
    `₹${value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const formatPoints = (value: number): string =>
    `${value >= 0 ? '+' : ''}${value.toFixed(2)} pts`;

export const formatTimeFromISO = (isoDateTime: string): string => {
    const timePart = isoDateTime.split('T')[1];
    return timePart ? timePart.substring(0, 8) : isoDateTime;
};

export const formatPct = (value: number): string => `${value.toFixed(2)}%`;
