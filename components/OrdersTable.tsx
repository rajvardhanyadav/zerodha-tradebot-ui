
import React from 'react';
import { Order } from '../types';

interface OrdersTableProps {
  orders: Order[];
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
      return 'text-dark-text-secondary';
  }
};

const OrdersTable: React.FC<OrdersTableProps> = ({ orders }) => {
  if (orders.length === 0) {
    return <div className="text-center py-10 text-dark-text-secondary">No orders for the day.</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead className="border-b border-dark-border">
          <tr>
            <th className="p-2 text-sm text-dark-text-secondary">Time</th>
            <th className="p-2 text-sm text-dark-text-secondary">Symbol</th>
            <th className="p-2 text-sm text-dark-text-secondary">Type</th>
            <th className="p-2 text-sm text-dark-text-secondary">Product</th>
            <th className="p-2 text-sm text-dark-text-secondary text-right">Qty</th>
            <th className="p-2 text-sm text-dark-text-secondary text-right">Avg. Price</th>
            <th className="p-2 text-sm text-dark-text-secondary">Status</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order.orderId} className="border-b border-dark-border last:border-b-0">
              <td className="p-2 font-mono text-xs">{new Date(order.orderTimestamp).toLocaleTimeString()}</td>
              <td className="p-2 font-mono">{order.tradingSymbol}</td>
              <td className={`p-2 font-mono font-semibold ${order.transactionType === 'BUY' ? 'text-profit' : 'text-loss'}`}>
                {order.transactionType}
              </td>
              <td className="p-2 font-mono">{order.product}</td>
              <td className="p-2 font-mono text-right">{order.filledQuantity}/{order.quantity}</td>
              <td className="p-2 font-mono text-right">{order.averagePrice.toFixed(2)}</td>
              <td className={`p-2 font-mono font-semibold ${getStatusColor(order.status)}`}>
                {order.status}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default OrdersTable;
