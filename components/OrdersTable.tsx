
import React, { useState, useMemo } from 'react';
import { Order } from '../types';

interface OrdersTableProps {
  orders: Order[];
  isLoading?: boolean;
}

const getStatusColor = (status: string) => {
  switch (status.toUpperCase()) {
    case 'COMPLETE':
      return 'text-profit';
    case 'REJECTED':
    case 'CANCELLED':
      return 'text-loss';
    case 'OPEN':
    case 'PENDING':
      return 'text-yellow-500';
    default:
      return 'text-slate-400';
  }
};

const OrdersTable: React.FC<OrdersTableProps> = ({ orders, isLoading }) => {
  const [sortConfig, setSortConfig] = useState<{ key: keyof Order; direction: 'ascending' | 'descending' } | null>({ key: 'orderTimestamp', direction: 'descending' });

  const sortedOrders = useMemo(() => {
    let sortableItems = [...orders];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];
        
        if (sortConfig.key === 'orderTimestamp') {
            const dateA = new Date(aValue as string).getTime();
            const dateB = new Date(bValue as string).getTime();
            if (dateA < dateB) return sortConfig.direction === 'ascending' ? -1 : 1;
            if (dateA > dateB) return sortConfig.direction === 'ascending' ? 1 : -1;
            return 0;
        }

        if (aValue < bValue) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [orders, sortConfig]);

  const requestSort = (key: keyof Order) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };
  
  const getSortIndicator = (key: keyof Order) => {
    if (!sortConfig || sortConfig.key !== key) return null;
    return sortConfig.direction === 'ascending' ? ' ▲' : ' ▼';
  };
  
  if (isLoading) {
      return <div className="text-center py-10 text-slate-400">Loading orders...</div>;
  }
    
  if (orders.length === 0) {
    return <div className="text-center py-10 text-slate-400">No orders for the day.</div>;
  }

  return (
    <div className="overflow-x-auto">
      <h3 className="text-md font-semibold mb-2 text-slate-200">Orders ({orders.length})</h3>
       <div className="max-h-[30rem] overflow-y-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-700 sticky top-0 bg-slate-800/80 backdrop-blur-sm">
            <tr>
              <th className="p-2 font-medium text-slate-400 cursor-pointer hover:text-slate-200" onClick={() => requestSort('orderTimestamp')}>Time{getSortIndicator('orderTimestamp')}</th>
              <th className="p-2 font-medium text-slate-400 cursor-pointer hover:text-slate-200" onClick={() => requestSort('tradingSymbol')}>Symbol{getSortIndicator('tradingSymbol')}</th>
              <th className="p-2 font-medium text-slate-400 cursor-pointer hover:text-slate-200" onClick={() => requestSort('transactionType')}>Type{getSortIndicator('transactionType')}</th>
              <th className="p-2 font-medium text-slate-400 cursor-pointer hover:text-slate-200" onClick={() => requestSort('product')}>Product{getSortIndicator('product')}</th>
              <th className="p-2 font-medium text-slate-400 text-right cursor-pointer hover:text-slate-200" onClick={() => requestSort('quantity')}>Qty{getSortIndicator('quantity')}</th>
              <th className="p-2 font-medium text-slate-400 text-right cursor-pointer hover:text-slate-200" onClick={() => requestSort('averagePrice')}>Avg. Price{getSortIndicator('averagePrice')}</th>
              <th className="p-2 font-medium text-slate-400 cursor-pointer hover:text-slate-200" onClick={() => requestSort('status')}>Status{getSortIndicator('status')}</th>
            </tr>
          </thead>
          <tbody>
            {sortedOrders.map((order) => (
              <tr key={order.orderId} className="border-b border-slate-700 last:border-b-0 text-slate-200">
                <td className="p-2 font-mono">{new Date(order.orderTimestamp).toLocaleTimeString()}</td>
                <td className="p-2 font-mono">{order.tradingSymbol}</td>
                <td className={`p-2 font-mono font-semibold ${order.transactionType === 'BUY' ? 'text-profit' : 'text-loss'}`}>
                  {order.transactionType}
                </td>
                <td className="p-2 font-mono">{order.product}</td>
                <td className="p-2 font-mono text-right">{order.filledQuantity}/{order.quantity}</td>
                <td className="p-2 font-mono text-right">{(Number(order.averagePrice) || 0).toFixed(2)}</td>
                <td className={`p-2 font-mono font-semibold ${getStatusColor(order.status)}`}>
                  {order.status}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default OrdersTable;