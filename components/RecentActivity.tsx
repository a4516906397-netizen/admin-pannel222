import React, { useState, useMemo } from 'react';
import { StockTransaction, StockItem } from '../types';
import { ArrowDownLeft, ArrowUpRight, AlertTriangle, Calendar, Filter, Download, X, CheckCircle2, TrendingUp, TrendingDown, Package } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface RecentActivityProps {
  transactions: StockTransaction[];
  items: StockItem[];
}

type DateFilter = 'today' | 'yesterday' | '3days' | '1week' | '1month' | 'custom' | 'all';

export const RecentActivity: React.FC<RecentActivityProps> = ({ transactions, items }) => {
  const [filter, setFilter] = useState<DateFilter>('today');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const getItemName = (id: string) => items.find(i => i.id === id)?.name || 'Unknown Item';

  const filteredTransactions = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    return transactions.filter(t => {
      const tDate = new Date(t.date);
      const tDateOnly = new Date(tDate.getFullYear(), tDate.getMonth(), tDate.getDate());

      switch (filter) {
        case 'today':
          return tDateOnly.getTime() === today.getTime();
        case 'yesterday':
          const yesterday = new Date(today);
          yesterday.setDate(yesterday.getDate() - 1);
          return tDateOnly.getTime() === yesterday.getTime();
        case '3days':
          const threeDaysAgo = new Date(today);
          threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
          return tDate >= threeDaysAgo;
        case '1week':
          const oneWeekAgo = new Date(today);
          oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
          return tDate >= oneWeekAgo;
        case '1month':
          const oneMonthAgo = new Date(today);
          oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
          return tDate >= oneMonthAgo;
        case 'custom':
          if (!customStart || !customEnd) return true;
          const start = new Date(customStart);
          const end = new Date(customEnd);
          end.setHours(23, 59, 59, 999); // Include the end date fully
          return tDate >= start && tDate <= end;
        default:
          return true;
      }
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, filter, customStart, customEnd]);

  // Summary Calculations
  const summary = useMemo(() => {
    return filteredTransactions.reduce((acc, t) => {
      const val = t.quantity * t.price;
      if (t.type === 'IN') {
        acc.inQty += t.quantity;
        acc.inVal += val;
      } else if (t.type === 'OUT') {
        acc.outQty += t.quantity;
        acc.outVal += val;
      } else if (t.type === 'DAMAGE') {
        acc.dmgQty += t.quantity;
        acc.dmgVal += val;
      }
      return acc;
    }, { inQty: 0, inVal: 0, outQty: 0, outVal: 0, dmgQty: 0, dmgVal: 0 });
  }, [filteredTransactions]);

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.text(`Activity Report (${filter === 'custom' ? `${customStart} to ${customEnd}` : filter.toUpperCase()})`, 14, 20);
    
    // Add Summary to PDF
    doc.setFontSize(10);
    doc.text(`Total In: ${summary.inQty} (Rs. ${summary.inVal.toLocaleString()})`, 14, 28);
    doc.text(`Total Out: ${summary.outQty} (Rs. ${summary.outVal.toLocaleString()})`, 80, 28);
    doc.text(`Damage: ${summary.dmgQty} (Rs. ${summary.dmgVal.toLocaleString()})`, 150, 28);

    autoTable(doc, {
      startY: 35,
      head: [['Date', 'Item', 'Type', 'Qty', 'Price/Cost', 'Party']],
      body: filteredTransactions.map(t => [
        new Date(t.date).toLocaleString('en-IN'),
        getItemName(t.itemId),
        t.type,
        t.quantity,
        t.price,
        t.partyName
      ]),
    });
    doc.save(`Activity_${filter}.pdf`);
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Filters and Controls */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 animate-in fade-in">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Calendar size={20} className="text-indigo-600"/> Activity Log
          </h2>
          <p className="text-sm text-gray-500">
            {filteredTransactions.length} transactions found
          </p>
        </div>
        
        <div className="flex flex-col gap-3 items-end w-full md:w-auto">
          <div className="flex flex-wrap items-center gap-2 bg-gray-50 p-1.5 rounded-xl border border-gray-200">
            {(['today', 'yesterday', '3days', '1week', 'custom'] as DateFilter[]).map((f) => (
              <button 
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition capitalize ${filter === f ? 'bg-white text-indigo-600 shadow-sm border border-gray-100' : 'text-gray-500 hover:text-gray-900'}`}
              >
                {f === '3days' ? '3 Days' : f}
              </button>
            ))}
          </div>
          
          {filter === 'custom' && (
             <div className="flex items-center gap-2 bg-white p-2 border border-gray-200 rounded-xl shadow-sm animate-in slide-in-from-top-2 w-full md:w-auto">
                <div className="relative flex-1 md:flex-none">
                   <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-400">FROM</span>
                   <input type="date" className="w-full md:w-auto pl-10 pr-2 py-1 bg-gray-50 rounded-lg text-xs font-bold outline-none border border-transparent focus:border-indigo-500" value={customStart} onChange={e => setCustomStart(e.target.value)} />
                </div>
                <div className="relative flex-1 md:flex-none">
                   <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-400">TO</span>
                   <input type="date" className="w-full md:w-auto pl-6 pr-2 py-1 bg-gray-50 rounded-lg text-xs font-bold outline-none border border-transparent focus:border-indigo-500" value={customEnd} onChange={e => setCustomEnd(e.target.value)} />
                </div>
             </div>
          )}
        </div>
        
        <button onClick={exportPDF} className="p-2.5 bg-gray-900 text-white rounded-xl hover:bg-black transition shadow-lg flex items-center gap-2 text-xs font-bold">
           <Download size={16}/> PDF Report
        </button>
      </div>

      {/* Summary Cards for Selected Period */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-in fade-in slide-in-from-bottom-4">
          <div className="bg-white p-4 rounded-2xl border border-emerald-100 shadow-[0_2px_8px_rgba(16,185,129,0.05)]">
             <div className="flex justify-between items-start">
               <div><p className="text-[10px] font-bold text-emerald-600 uppercase">Received</p><h3 className="text-xl font-bold text-gray-900">{summary.inQty}</h3></div>
               <div className="p-1.5 bg-emerald-50 rounded-lg text-emerald-600"><ArrowDownLeft size={16}/></div>
             </div>
             <p className="text-xs text-gray-400 mt-1 font-mono">₹{summary.inVal.toLocaleString()}</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-blue-100 shadow-[0_2px_8px_rgba(59,130,246,0.05)]">
             <div className="flex justify-between items-start">
               <div><p className="text-[10px] font-bold text-blue-600 uppercase">Dispatched</p><h3 className="text-xl font-bold text-gray-900">{summary.outQty}</h3></div>
               <div className="p-1.5 bg-blue-50 rounded-lg text-blue-600"><ArrowUpRight size={16}/></div>
             </div>
             <p className="text-xs text-gray-400 mt-1 font-mono">₹{summary.outVal.toLocaleString()}</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-orange-100 shadow-[0_2px_8px_rgba(249,115,22,0.05)]">
             <div className="flex justify-between items-start">
               <div><p className="text-[10px] font-bold text-orange-600 uppercase">Damaged</p><h3 className="text-xl font-bold text-gray-900">{summary.dmgQty}</h3></div>
               <div className="p-1.5 bg-orange-50 rounded-lg text-orange-600"><AlertTriangle size={16}/></div>
             </div>
             <p className="text-xs text-gray-400 mt-1 font-mono">₹{summary.dmgVal.toLocaleString()}</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
             <div className="flex justify-between items-start">
               <div><p className="text-[10px] font-bold text-gray-500 uppercase">Net Volume</p><h3 className="text-xl font-bold text-gray-900">{summary.inQty - summary.outQty - summary.dmgQty}</h3></div>
               <div className="p-1.5 bg-gray-50 rounded-lg text-gray-600"><Package size={16}/></div>
             </div>
             <p className="text-xs text-gray-400 mt-1 font-medium">Movement Balance</p>
          </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 font-bold">Time</th>
                <th className="px-6 py-4 font-bold">Item Detail</th>
                <th className="px-6 py-4 font-bold">Status</th>
                <th className="px-6 py-4 font-bold">Qty</th>
                <th className="px-6 py-4 font-bold">Value</th>
                <th className="px-6 py-4 font-bold">Party / Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredTransactions.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-400">No activity found for this period.</td></tr>
              ) : filteredTransactions.map((t) => (
                <tr key={t.id} className="hover:bg-gray-50 transition">
                  <td className="px-6 py-4 whitespace-nowrap text-gray-500 font-mono text-xs">
                    {new Date(t.date).toLocaleString('en-IN', { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' })}
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-bold text-gray-900">{getItemName(t.itemId)}</p>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wide">ID: {t.itemId.slice(-6)}</p>
                  </td>
                  <td className="px-6 py-4">
                     <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase border ${
                         t.type === 'IN' ? 'bg-blue-50 text-blue-700 border-blue-100' : 
                         t.type === 'DAMAGE' ? 'bg-orange-50 text-orange-700 border-orange-100' : 
                         'bg-emerald-50 text-emerald-700 border-emerald-100'
                     }`}>
                         {t.type === 'IN' ? <ArrowDownLeft size={10}/> : t.type === 'DAMAGE' ? <AlertTriangle size={10}/> : <ArrowUpRight size={10}/>}
                         {t.type === 'IN' ? 'Recv' : t.type === 'DAMAGE' ? 'Loss' : 'Sale'}
                     </span>
                  </td>
                  <td className={`px-6 py-4 font-bold ${t.type === 'IN' ? 'text-emerald-600' : 'text-gray-900'}`}>
                    {t.type !== 'IN' ? '-' : '+'}{t.quantity}
                  </td>
                  <td className="px-6 py-4 text-gray-600 font-mono">
                     ₹{(t.quantity * t.price).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-gray-600 truncate max-w-[150px]">
                    {t.partyName}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
