
/**
 * This service acts as the API client for the trading bot backend.
 * It implements the API specification provided, handling authentication and data fetching.
 */
import { StrategyPosition, ApiStrategyType, ApiInstrument, UserProfile, MonitoringStatus, Order, Position, TradingModeStatus, OrderCharge, BotStatusResponse, HistoricalRunResult } from '../types';

//const BASE_URL = 'http://localhost:8080/api';
const BASE_URL = 'https://zerodhabot-genai-3-874874921792.asia-south2.run.app/api';

// --- API Logger ---
export type ApiLogType = 'info' | 'success' | 'error' | 'warning';
export interface ApiLogEntry {
    timestamp: string;
    message: string;
    type: ApiLogType;
    endpoint?: string;
    method?: string;
    data?: any;
}

type ApiLogListener = (log: ApiLogEntry) => void;
const apiLogListeners: Set<ApiLogListener> = new Set();

export const subscribeToApiLogs = (listener: ApiLogListener): (() => void) => {
    apiLogListeners.add(listener);
    return () => apiLogListeners.delete(listener);
};

const emitApiLog = (log: Omit<ApiLogEntry, 'timestamp'>) => {
    const entry: ApiLogEntry = {
        ...log,
        timestamp: new Date().toLocaleTimeString(),
    };
    apiLogListeners.forEach(listener => listener(entry));
};

// --- Helper Functions ---
const getEndpointDescription = (endpoint: string, method: string): string => {
    const descriptions: Record<string, string> = {
        'GET /auth/login-url': 'Fetching login URL',
        'POST /auth/session': 'Exchanging token for session',
        'POST /auth/logout': 'Logging out',
        'GET /auth/profile': 'Fetching user profile',
        'GET /market/ltp': 'Fetching LTP',
        'GET /strategies/types': 'Loading strategy types',
        'GET /strategies/instruments': 'Loading tradeable instruments',
        'GET /strategies/expiries': 'Fetching expiries',
        'POST /strategies/execute': 'Executing strategy',
        'GET /strategies/active': 'Fetching active strategies',
        'GET /strategies/bot-status': 'Checking bot status',
        'DELETE /strategies/stop-all': 'Stopping all strategies',
        'GET /orders': 'Fetching orders',
        'GET /orders/charges': 'Fetching order charges',
        'GET /portfolio/positions': 'Fetching positions',
        'GET /monitoring/status': 'Checking monitoring status',
        'DELETE /monitoring': 'Stopping monitor',
        'GET /paper-trading/status': 'Checking trading mode',
        'POST /paper-trading/mode': 'Switching trading mode',
    };
    
    // Find matching description
    const key = `${method} ${endpoint.split('?')[0]}`;
    for (const [pattern, desc] of Object.entries(descriptions)) {
        if (key.startsWith(pattern.replace(/\/\{.*\}/, ''))) {
            return desc;
        }
    }
    return `API call to ${endpoint}`;
};

async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = localStorage.getItem('jwtToken');
    const userId = localStorage.getItem('userId');
    const headers: Record<string, string> = {};
    const method = options.method || 'GET';
    const description = getEndpointDescription(endpoint, method);

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    if (userId) {
        headers['X-User-Id'] = userId;
    }
    
    // Add Content-Type header only if there is a body.
    // This prevents sending Content-Type on GET requests, which can cause 400 errors.
    if (options.body) {
         headers['Content-Type'] = 'application/json';
    }

    // Log request
    const requestBody = options.body ? JSON.parse(options.body as string) : undefined;
    emitApiLog({
        type: 'info',
        message: `${description}...`,
        endpoint,
        method,
        data: requestBody,
    });

    try {
        const response = await fetch(`${BASE_URL}${endpoint}`, { 
            ...options, 
            headers: {...headers, ...options.headers} 
        });

        // Handle cases with no content in response body
        if (response.status === 204 || response.headers.get('content-length') === '0') {
            if (!response.ok) {
                emitApiLog({
                    type: 'error',
                    message: `${description} failed: HTTP ${response.status}`,
                    endpoint,
                    method,
                });
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            emitApiLog({
                type: 'success',
                message: `${description} completed`,
                endpoint,
                method,
            });
            return null as T;
        }
        
        const data = await response.json();

        if (!response.ok || (data.hasOwnProperty('success') && !data.success)) {
            const errorMessage = data.message || `HTTP error! status: ${response.status}`;
            console.error(`API Error on ${endpoint}:`, errorMessage, data);
            emitApiLog({
                type: 'error',
                message: `${description} failed: ${errorMessage}`,
                endpoint,
                method,
                data: data,
            });
            if (response.status === 401) {
                throw new Error('Unauthorized');
            }
            throw new Error(errorMessage);
        }

        // Log success with relevant response summary
        const responseData = data.data;
        let successMessage = `${description} completed`;
        
        // Add context-specific details to success message
        if (Array.isArray(responseData)) {
            successMessage += ` (${responseData.length} items)`;
        } else if (responseData && typeof responseData === 'object') {
            if (responseData.message) {
                successMessage += `: ${responseData.message}`;
            }
        }
        
        emitApiLog({
            type: 'success',
            message: successMessage,
            endpoint,
            method,
        });

        // The new API nests the actual data inside a 'data' property
        return responseData;
    } catch (error) {
        // Log network or parsing errors
        const errorMessage = (error as Error).message;
        if (!errorMessage.includes('failed:')) { // Avoid duplicate logging
            emitApiLog({
                type: 'error',
                message: `${description} failed: ${errorMessage}`,
                endpoint,
                method,
            });
        }
        throw error;
    }
}

// --- Authentication ---
// Corresponds to /api/auth/login-url
export const getLoginUrl = (): Promise<string> => {
    return apiFetch<string>('/auth/login-url');
};

interface SessionData {
    userId: string;
    accessToken: string;
    publicToken: string;
}
// Corresponds to /api/auth/session
export const exchangeToken = async (requestToken: string): Promise<{ jwtToken: string; userId: string; }> => {
    const sessionData = await apiFetch<SessionData>('/auth/session', {
        method: 'POST',
        body: JSON.stringify({ requestToken }),
    });
    // Map accessToken from new API to jwtToken for compatibility with the app
    return { jwtToken: sessionData.accessToken, userId: sessionData.userId };
};

// Corresponds to /api/auth/profile
export const getUserProfile = (): Promise<UserProfile> => apiFetch('/auth/profile');

// Corresponds to /api/auth/logout
export const logout = (): Promise<void> => apiFetch('/auth/logout', {
    method: 'POST',
});

// --- Strategy & Instrument APIs ---

// Updated to use the new /api/market/ltp endpoint
export const getLTP = async (instrumentName: string): Promise<number> => {
    // Note: The new API uses instrument names like "NIFTY 50".
    // We are assuming NSE as the exchange for these index instruments.
    const instrumentIdentifier = `NSE:${instrumentName}`;
    const response = await apiFetch<{ [key: string]: { lastPrice: number } }>(`/market/ltp?symbols=${encodeURIComponent(instrumentIdentifier)}`);

    if (response && response[instrumentIdentifier] && typeof response[instrumentIdentifier].lastPrice === 'number') {
        return response[instrumentIdentifier].lastPrice;
    }
    
    console.error(`Unexpected LTP response structure for ${instrumentIdentifier}:`, response);
    return 0;
};

export const getStrategyTypes = (): Promise<ApiStrategyType[]> => apiFetch('/strategies/types');

export const getTradeableInstruments = (): Promise<ApiInstrument[]> => apiFetch('/strategies/instruments');

export const getStrategyExpiries = (instrumentType: string): Promise<string[]> => apiFetch(`/strategies/expiries/${instrumentType}`);

export const executeStrategy = (params: any): Promise<any> => apiFetch('/strategies/execute', {
    method: 'POST',
    body: JSON.stringify(params),
});

export const getActiveStrategies = (): Promise<StrategyPosition[]> => apiFetch('/strategies/active');

// GET /api/strategies/bot-status
export const getBotStatus = (): Promise<BotStatusResponse> => apiFetch('/strategies/bot-status');


// --- Historical Replay API ---
export const executeHistoricalStrategy = (params: any): Promise<HistoricalRunResult> => apiFetch('/historical/execute', {
    method: 'POST',
    body: JSON.stringify(params),
});


// --- Portfolio & Order APIs ---
export const getOrders = (): Promise<Order[]> => apiFetch('/orders');

export const getPositions = async (): Promise<Position[]> => {
    const response = await apiFetch<{ net: Position[], day: Position[] }>('/portfolio/positions');
    // The API provides 'day' and 'net' positions. 'day' includes squared-off positions.
    // Some modes (like paper trading) might only populate 'net' and leave 'day' empty.
    // To handle this, we prioritize 'day' but fallback to 'net' if 'day' is empty.
    if (response && response.day && response.day.length > 0) {
        return response.day;
    }
    // If 'day' is empty or doesn't exist, use 'net'. If response is null, return empty array.
    return response?.net ?? [];
};

// GET /api/orders/charges
export const getOrderCharges = (): Promise<OrderCharge[]> => apiFetch('/orders/charges');


// --- Position Monitoring APIs ---

// GET /api/monitoring/status
export const getMonitoringStatus = (): Promise<MonitoringStatus> => apiFetch('/monitoring/status');

// DELETE /api/monitoring/{executionId}
export const stopMonitoringExecution = (executionId: string): Promise<string> => apiFetch(`/monitoring/${executionId}`, {
    method: 'DELETE',
});

// DELETE /api/strategies/stop-all
export const stopAllStrategies = (): Promise<{ message: string }> => apiFetch('/strategies/stop-all', {
    method: 'DELETE',
});


// --- Trading Mode APIs ---

// GET /api/paper-trading/status
export const getTradingModeStatus = (): Promise<TradingModeStatus> => apiFetch('/paper-trading/status');

// POST /api/paper-trading/mode
export const setTradingMode = (paperTradingEnabled: boolean): Promise<TradingModeStatus> => apiFetch(`/paper-trading/mode?paperTradingEnabled=${paperTradingEnabled}`, {
    method: 'POST',
});