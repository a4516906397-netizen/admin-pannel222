import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ref, onValue, push, remove, set, serverTimestamp, get, update, query, orderByChild, equalTo } from "firebase/database";
import { 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  User 
} from "firebase/auth";
import { db, auth, googleProvider } from './firebaseConfig';
import { StockItem, ViewMode, ChatMessage, Warehouse, StockTransaction, Customer } from './types';
import { StockList } from './components/StockList';
import { StatsCard } from './components/StatsCard';
import { RecentActivity } from './components/RecentActivity';
import { BulkAdd, BulkSell } from './components/BulkOperations';
import { InvoiceList } from './components/InvoiceList';
import { CustomerManager } from './components/CustomerManager';
import { sendMessageToAI } from './services/aiService';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  LayoutDashboard, 
  Package, 
  PlusCircle, 
  Bot, 
  DollarSign, 
  AlertOctagon, 
  Box, 
  Send, 
  Sparkles, 
  LogOut, 
  Building2, 
  MapPin, 
  ArrowLeft, 
  Users, 
  Globe, 
  Trash2, 
  Download, 
  Truck, 
  X, 
  History, 
  ArrowDownLeft, 
  ArrowUpRight, 
  FileText, 
  AlertTriangle, 
  Search, 
  CheckCircle2, 
  BarChart3, 
  PieChart as PieChartIcon, 
  Loader2, 
  Clock, 
  MessageCircle, 
  Activity, 
  Settings, 
  Plus,
  Calendar,
  TrendingUp,
  TrendingDown,
  Minimize2,
  Maximize2,
  ShoppingCart,
  Briefcase
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';

// --- Helper Functions ---

const formatIST = (dateStr?: string | number | Date) => {
  const d = dateStr ? new Date(dateStr) : new Date();
  return d.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' });
};

const getISODateIST = () => new Date().toISOString();

// --- Professional Invoice Generator (Global/Single Item) ---
const generateInvoice = (
  itemName: string, 
  category: string, 
  qtySold: number, 
  sellPrice: number, 
  taxPercent: number, 
  customerName: string, 
  sellerName: string,
  dateStr: string
) => {
  const doc = new jsPDF();
  const dateObj = new Date(dateStr);
  const formattedDate = dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const subTotal = qtySold * sellPrice;
  const taxAmount = subTotal * (taxPercent / 100);
  const grandTotal = subTotal + taxAmount;

  // Header Background
  doc.setFillColor(248, 250, 252); // Slate-50
  doc.rect(0, 0, 210, 50, 'F');

  // Seller Details
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(15, 23, 42); // Slate 900
  doc.text(sellerName || "StockMaster User", 14, 20);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(71, 85, 105);
  doc.text("Premium Inventory Solutions", 14, 26);

  // Invoice Details
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(148, 163, 184); // Slate 400
  doc.text("INVOICE", 196, 20, { align: 'right' });

  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(`Invoice No: INV-${Date.now().toString().slice(-6)}`, 196, 30, { align: 'right' });
  doc.text(`Date: ${formattedDate}`, 196, 35, { align: 'right' });

  doc.setDrawColor(226, 232, 240);
  doc.line(14, 55, 196, 55);

  // Bill To
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text("BILL TO", 14, 65);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text(customerName.toUpperCase(), 14, 71);

  // Table
  autoTable(doc, {
    startY: 85,
    head: [['DESCRIPTION', 'CATEGORY', 'QTY', 'RATE', 'AMOUNT']],
    body: [
      [
        itemName, 
        category,
        qtySold.toString(), 
        sellPrice.toLocaleString('en-IN'), 
        subTotal.toLocaleString('en-IN')
      ]
    ],
    theme: 'grid',
    headStyles: { 
      fillColor: [30, 41, 59],
      textColor: 255, 
      fontStyle: 'bold'
    },
    columnStyles: {
      0: { cellWidth: 'auto' },
      2: { halign: 'center'},
      3: { halign: 'right'},
      4: { halign: 'right', fontStyle: 'bold' }
    },
    styles: { cellPadding: 4, fontSize: 10 }
  });

  // Totals
  const finalY = (doc as any).lastAutoTable.finalY + 10;
  const rightAlign = 196;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Subtotal:", 140, finalY);
  doc.text(`${subTotal.toLocaleString('en-IN', {minimumFractionDigits: 2})}`, rightAlign, finalY, { align: "right" });
  
  doc.text(`Tax (${taxPercent}%):`, 140, finalY + 6);
  doc.text(`${taxAmount.toLocaleString('en-IN', {minimumFractionDigits: 2})}`, rightAlign, finalY + 6, { align: "right" });

  doc.setDrawColor(226, 232, 240);
  doc.line(140, finalY + 10, 196, finalY + 10);

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text("Total:", 140, finalY + 18);
  doc.text(`Rs. ${grandTotal.toLocaleString('en-IN', {minimumFractionDigits: 2})}`, rightAlign, finalY + 18, { align: "right" });

  doc.save(`Invoice_${customerName.replace(/\s+/g, '_')}.pdf`);
};

// --- Updated Dashboard Content with Advanced Analytics ---
const DashboardContent = ({ items, transactions, setView, isMobile, warehouseName, onSell, onDelete, onHistory, onDamage, isGlobal, warehouses }: any) => {
  const [dateFilter, setDateFilter] = useState('month'); // today, week, month, year

  // Calculate Analytics based on filter
  const analytics = useMemo(() => {
    const now = new Date();
    const rangeStart = new Date();
    
    if (dateFilter === 'today') rangeStart.setHours(0,0,0,0);
    else if (dateFilter === 'week') rangeStart.setDate(now.getDate() - 7);
    else if (dateFilter === 'month') rangeStart.setMonth(now.getMonth() - 1);
    else if (dateFilter === 'year') rangeStart.setFullYear(now.getFullYear() - 1);

    const filteredTx = transactions.filter((t: StockTransaction) => new Date(t.date) >= rangeStart);

    let salesRevenue = 0;
    let costOfGoodsSold = 0;
    let damageLoss = 0;

    filteredTx.forEach((t: StockTransaction) => {
      if (t.type === 'OUT') {
        salesRevenue += (t.quantity * t.price); // Price here is Selling Price
        // If costPrice was stored, use it, else approximation (risky but needed if data missing)
        const cost = t.costPrice || (items.find((i:StockItem) => i.id === t.itemId)?.price || 0); 
        costOfGoodsSold += (t.quantity * cost);
      } else if (t.type === 'DAMAGE') {
        // For damage, t.price is usually Cost Price (based on handleDamage)
        damageLoss += (t.quantity * t.price);
      }
    });

    const netEarnings = salesRevenue - costOfGoodsSold;
    
    // Total Inventory Value (Snapshot, not filtered by date)
    const currentStockValue = items.reduce((acc: number, i: StockItem) => acc + (i.price * i.quantity), 0);

    return { salesRevenue, netEarnings, damageLoss, currentStockValue };
  }, [transactions, items, dateFilter]);

  // Chart Data
  const topValueItems = [...items].sort((a: any,b: any) => (b.price * b.quantity) - (a.price * a.quantity)).slice(0, 5);
  const topItemsChart = topValueItems.map((i: any) => ({ name: i.name.length > 10 ? i.name.substring(0,10)+'...' : i.name, value: i.price * i.quantity }));
  
  const catMap = items.reduce((acc: any, item: StockItem) => {
    acc[item.category] = (acc[item.category] || 0) + 1;
    return acc;
  }, {});
  const pieData = Object.keys(catMap).map(k => ({ name: k, value: catMap[k] }));
  const COLORS = ['#18181b', '#3f3f46', '#71717a', '#a1a1aa', '#d4d4d8'];

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Performance Overview</h2>
            <p className="text-sm text-gray-500">Key metrics for {isGlobal ? 'all warehouses' : warehouseName}</p>
          </div>
          <div className="flex bg-white p-1 rounded-xl border border-gray-200 shadow-sm">
             {['today', 'week', 'month'].map((f) => (
               <button key={f} onClick={() => setDateFilter(f)} className={`px-4 py-1.5 text-xs font-bold rounded-lg capitalize transition ${dateFilter === f ? 'bg-gray-900 text-white shadow-md' : 'text-gray-500 hover:text-gray-900'}`}>{f}</button>
             ))}
          </div>
      </div>

      {/* Financial Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatsCard title="Total Stock Value" value={`₹${analytics.currentStockValue.toLocaleString('en-IN')}`} icon={Box} color="blue" />
        <StatsCard title="Total Sales" value={`₹${analytics.salesRevenue.toLocaleString('en-IN')}`} icon={TrendingUp} color="green" trend="Selected Period" />
        <StatsCard title="Net Earnings" value={`₹${analytics.netEarnings.toLocaleString('en-IN')}`} icon={DollarSign} color="purple" trend="Profit Margin" />
        <StatsCard title="Loss / Damage" value={`₹${analytics.damageLoss.toLocaleString('en-IN')}`} icon={TrendingDown} color="red" trend="Lost Value" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
          <div className="flex justify-between items-center mb-6">
             <h3 className="font-bold text-gray-900 flex items-center gap-2"><BarChart3 size={18} className="text-gray-400"/> Top Value Stock</h3>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topItemsChart}>
                <XAxis dataKey="name" stroke="#a1a1aa" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#a1a1aa" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => `₹${val}`} />
                <Tooltip cursor={{fill: '#f4f4f5'}} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}} />
                <Bar dataKey="value" fill="#18181b" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Secondary Panel / Pie Chart */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex flex-col">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2"><PieChartIcon size={18} className="text-gray-400"/> Category Split</h3>
            <div className="h-48 w-full flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                    {pieData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{borderRadius: '8px', border: 'none'}} />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" iconSize={8} wrapperStyle={{fontSize: '11px'}}/>
                </PieChart>
              </ResponsiveContainer>
            </div>
        </div>
      </div>
      
      {/* Activity Preview */}
      <RecentActivity transactions={transactions.slice(0, 10)} items={items} />

    </div>
  );
};

// --- Dispatch/Modal Components (Styling Updated) ---
const DispatchModal = ({ item, onClose, onConfirm }: { item: StockItem, onClose: () => void, onConfirm: (qty: number, customer: string, price: number, tax: number) => void }) => {
  const [qty, setQty] = useState('');
  const [customer, setCustomer] = useState('');
  const [sellPrice, setSellPrice] = useState(item.price.toString());
  const [tax, setTax] = useState('0');
  const [error, setError] = useState('');

  const q = Number(qty);
  const p = Number(sellPrice);
  const t = Number(tax);
  const total = q * p * (1 + t/100);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (q <= 0) return setError('Quantity must be > 0');
    if (q > item.quantity) return setError(`Only ${item.quantity} available.`);
    if (!customer.trim()) return setError('Customer name is required.');
    onConfirm(q, customer, p, t);
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
       <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 relative animate-in fade-in zoom-in duration-200">
          <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-900"><X size={20}/></button>
          <div className="flex items-center gap-3 mb-6"><div className="p-3 bg-gray-900 text-white rounded-xl"><Truck size={24}/></div><div><h3 className="text-lg font-bold text-gray-900">Dispatch Stock</h3><p className="text-sm text-gray-500">{item.name}</p></div></div>
          <form onSubmit={handleSubmit} className="space-y-4">
             <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Customer / Project</label><input autoFocus className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-gray-900 transition" placeholder="e.g. Acme Corp" value={customer} onChange={e => setCustomer(e.target.value)} /></div>
             <div className="flex gap-3">
                <div className="flex-1"><label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Qty</label><input type="number" className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-gray-900 font-bold transition" value={qty} onChange={e => setQty(e.target.value)} /></div>
                <div className="flex-1"><label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Price (₹)</label><input type="number" className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-gray-900 transition" value={sellPrice} onChange={e => setSellPrice(e.target.value)} /></div>
             </div>
             <div className="flex gap-3 items-center bg-gray-50 p-3 rounded-xl border border-gray-100">
                 <div className="w-20"><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tax %</label><input type="number" className="w-full bg-white border border-gray-200 rounded-lg p-1.5 text-center outline-none" value={tax} onChange={e => setTax(e.target.value)} /></div>
                 <div className="flex-1 text-right"><span className="text-xs text-gray-400 block uppercase font-bold">Total</span><span className="font-bold text-xl text-gray-900">₹{total.toFixed(2)}</span></div>
             </div>
             {error && <p className="text-xs text-rose-500 font-medium">{error}</p>}
             <button type="submit" className="w-full bg-gray-900 text-white font-bold py-3.5 rounded-xl hover:bg-black transition shadow-lg mt-2">Confirm Dispatch</button>
          </form>
       </div>
    </div>
  );
};

const DamageModal = ({ item, onClose, onConfirm }: { item: StockItem, onClose: () => void, onConfirm: (qty: number, reason: string) => void }) => {
  const [qty, setQty] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  const q = Number(qty);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (q <= 0) return setError('Quantity must be > 0');
    if (q > item.quantity) return setError(`Only ${item.quantity} available.`);
    if (!reason.trim()) return setError('Reason is required.');
    onConfirm(q, reason);
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
       <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 relative animate-in fade-in zoom-in duration-200">
          <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-900"><X size={20}/></button>
          <div className="flex items-center gap-3 mb-6"><div className="p-3 bg-orange-50 text-orange-600 rounded-xl"><AlertTriangle size={24}/></div><div><h3 className="text-lg font-bold text-gray-900">Report Damage</h3><p className="text-sm text-gray-500">{item.name}</p></div></div>
          <form onSubmit={handleSubmit} className="space-y-4">
             <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Reason / Cause</label><input autoFocus className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-gray-900 transition" placeholder="e.g. Broken in transit" value={reason} onChange={e => setReason(e.target.value)} /></div>
             <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Quantity Damaged</label><input type="number" className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-gray-900 font-bold transition" value={qty} onChange={e => setQty(e.target.value)} /></div>
             {error && <p className="text-xs text-rose-500 font-medium">{error}</p>}
             <button type="submit" className="w-full bg-gray-900 text-white font-bold py-3.5 rounded-xl hover:bg-black transition shadow-lg mt-2">Confirm Report</button>
          </form>
       </div>
    </div>
  );
};

const HistoryModal = ({ item, transactions, onClose, userName }: any) => {
  return (
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl h-[80vh] flex flex-col animate-in fade-in zoom-in duration-200">
              <div className="p-5 border-b border-gray-100 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                       <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl"><History size={20}/></div>
                       <div><h3 className="font-bold text-lg">Transaction History</h3><p className="text-sm text-gray-500">{item.name}</p></div>
                  </div>
                  <button onClick={onClose} className="text-gray-400 hover:text-gray-900 bg-gray-50 p-2 rounded-lg hover:bg-gray-100 transition"><X size={20}/></button>
              </div>
              <div className="flex-1 overflow-auto p-0">
                  <table className="w-full text-sm text-left">
                      <thead className="text-xs text-gray-500 uppercase bg-gray-50 sticky top-0">
                          <tr>
                              <th className="px-6 py-3">Date</th>
                              <th className="px-6 py-3">Type</th>
                              <th className="px-6 py-3">Qty</th>
                              <th className="px-6 py-3">Details</th>
                              <th className="px-6 py-3">User</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                          {transactions.length === 0 ? (
                              <tr><td colSpan={5} className="text-center py-10 text-gray-400">No history available</td></tr>
                          ) : (
                              [...transactions].sort((a:any,b:any) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((t: any) => (
                                  <tr key={t.id} className="hover:bg-gray-50">
                                      <td className="px-6 py-4 whitespace-nowrap text-gray-500">{new Date(t.date).toLocaleString()}</td>
                                      <td className="px-6 py-4">
                                          <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${t.type === 'IN' ? 'bg-emerald-100 text-emerald-700' : t.type === 'OUT' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'}`}>
                                              {t.type}
                                          </span>
                                      </td>
                                      <td className="px-6 py-4 font-bold">{t.type === 'IN' ? '+' : '-'}{t.quantity}</td>
                                      <td className="px-6 py-4 text-gray-600 truncate max-w-[150px]">{t.partyName}</td>
                                      <td className="px-6 py-4 text-gray-400 text-xs">{(t.userEmail || 'Unknown').split('@')[0]}</td>
                                  </tr>
                              ))
                          )}
                      </tbody>
                  </table>
              </div>
              <div className="p-4 border-t border-gray-100 bg-gray-50 text-center text-xs text-gray-400 rounded-b-2xl">
                  Report generated for {userName}
              </div>
          </div>
      </div>
  );
};

const WarehouseManager = ({ warehouses, onAdd, onDelete }: any) => {
    const [name, setName] = useState('');
    const [location, setLocation] = useState('');
  
    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if(name && location) {
          onAdd(name, location);
          setName(''); setLocation('');
      }
    };
  
    return (
      <div className="max-w-4xl mx-auto space-y-8 pb-20">
          <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
             <h2 className="text-xl font-bold mb-6">Add New Location</h2>
             <form onSubmit={handleSubmit} className="flex gap-4 items-end">
                <div className="flex-1">
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Warehouse Name</label>
                    <input className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-gray-900" value={name} onChange={e => setName(e.target.value)} placeholder="Main Warehouse" />
                </div>
                <div className="flex-1">
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Location / City</label>
                    <input className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-gray-900" value={location} onChange={e => setLocation(e.target.value)} placeholder="Mumbai" />
                </div>
                <button type="submit" className="bg-gray-900 text-white font-bold px-6 py-3.5 rounded-xl hover:bg-black transition">Add</button>
             </form>
          </div>
  
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {warehouses.map((w: any) => (
                  <div key={w.id} className="bg-white p-6 rounded-2xl border border-gray-200 flex justify-between items-center group hover:shadow-lg transition">
                      <div>
                          <h3 className="font-bold text-gray-900">{w.name}</h3>
                          <p className="text-sm text-gray-500 flex items-center gap-1.5 mt-1"><MapPin size={12}/> {w.location}</p>
                      </div>
                      <button onClick={() => { if(confirm('Delete warehouse?')) onDelete(w.id); }} className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"><Trash2 size={18}/></button>
                  </div>
              ))}
          </div>
      </div>
    );
};

const TeamChat = ({ user, messages, onSend, isMobile }: any) => {
    const [input, setInput] = useState('');
    const bottomRef = useRef<HTMLDivElement>(null);
  
    useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);
  
    const handleSend = (e: React.FormEvent) => {
      e.preventDefault();
      onSend(input);
      setInput('');
    };
  
    return (
      <div className="flex flex-col h-full bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm relative">
          <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center flex-shrink-0">
             <h3 className="font-bold flex items-center gap-2"><Users size={18}/> Team Chat</h3>
             <span className="text-xs font-medium text-gray-500">{user.email}</span>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((m: any, i: number) => {
                  const isMe = m.sender === user.email;
                  return (
                      <div key={i} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${isMe ? 'bg-gray-900 text-white rounded-tr-none' : 'bg-gray-100 text-gray-800 rounded-tl-none'}`}>
                              {!isMe && <p className="text-[10px] opacity-50 font-bold mb-1">{m.sender?.split('@')[0] || 'Unknown'}</p>}
                              <p>{m.content}</p>
                              <p className={`text-[10px] mt-1 text-right ${isMe ? 'text-gray-400' : 'text-gray-400'}`}>{new Date(m.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                          </div>
                      </div>
                  );
              })}
              <div ref={bottomRef} />
          </div>
          <form onSubmit={handleSend} className="p-3 border-t border-gray-100 flex gap-2 flex-shrink-0 bg-white">
              <input className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-gray-900 transition" placeholder="Type a message..." value={input} onChange={e => setInput(e.target.value)} />
              <button type="submit" className="bg-gray-900 text-white p-2.5 rounded-xl hover:bg-black transition"><Send size={18}/></button>
          </form>
      </div>
    );
};

// --- New Floating AI Chat Widget (Optimized for Mobile) ---
const AIChatWidget = ({ user, aiContext }: any) => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([
        { role: 'assistant', content: 'Hello! I am StockMaster AI. How can I help you with your inventory today?', timestamp: Date.now() }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, isOpen]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if(!input.trim()) return;

        const newMsg: ChatMessage = { role: 'user', content: input, timestamp: Date.now() };
        setMessages(prev => [...prev, newMsg]);
        setInput('');
        setLoading(true);

        try {
            const responseText = await sendMessageToAI([...messages, newMsg], aiContext);
            setMessages(prev => [...prev, { role: 'assistant', content: responseText, timestamp: Date.now() }]);
        } catch (err) {
            setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error.', timestamp: Date.now() }]);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) {
        return (
            <button 
                onClick={() => setIsOpen(true)} 
                className="fixed bottom-24 md:bottom-10 right-6 z-50 bg-indigo-600 text-white p-4 rounded-full shadow-2xl hover:bg-indigo-700 transition-all hover:scale-105 active:scale-95 animate-in fade-in zoom-in"
                title="AI Assistant"
            >
                <Sparkles size={24} />
            </button>
        );
    }

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-end sm:justify-end sm:inset-auto sm:bottom-24 md:bottom-10 sm:right-6">
             {/* Backdrop for mobile */}
             <div className="absolute inset-0 bg-black/40 sm:hidden backdrop-blur-sm" onClick={() => setIsOpen(false)}></div>
             
             {/* Chat Window */}
             <div className="bg-white w-full h-[80dvh] max-h-[600px] sm:w-[400px] sm:h-[600px] rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden relative animate-in slide-in-from-bottom-10 fade-in border border-gray-100 z-50 pb-safe">
                {/* Header */}
                <div className="p-4 border-b border-gray-100 bg-indigo-600 text-white flex justify-between items-center shadow-md z-10">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-500 rounded-xl"><Bot size={20} className="text-white"/></div>
                        <div><h3 className="font-bold">AI Assistant</h3><p className="text-xs text-indigo-200">Online</p></div>
                    </div>
                    <div className="flex gap-1">
                         <button onClick={() => setMessages([{ role: 'assistant', content: 'Chat cleared.', timestamp: Date.now() }])} className="p-2 hover:bg-indigo-500 rounded-lg transition"><Trash2 size={18}/></button>
                         <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-indigo-500 rounded-lg transition"><X size={20}/></button>
                    </div>
                </div>

                {/* Chat Area */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
                    {messages.map((m, i) => (
                        <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[85%] p-3.5 rounded-2xl text-sm leading-relaxed shadow-sm ${m.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-white text-gray-800 rounded-tl-none border border-gray-100'}`}>
                                <p className="whitespace-pre-wrap">{m.content}</p>
                            </div>
                        </div>
                    ))}
                    {loading && (
                        <div className="flex justify-start">
                            <div className="bg-white p-4 rounded-2xl rounded-tl-none border border-gray-100 flex gap-2 shadow-sm">
                                <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"></span>
                                <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce delay-100"></span>
                                <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce delay-200"></span>
                            </div>
                        </div>
                    )}
                    <div ref={bottomRef} />
                </div>

                {/* Input Area */}
                <form onSubmit={handleSend} className="p-3 border-t border-gray-100 bg-white flex gap-2 flex-shrink-0">
                    <input 
                        className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 transition" 
                        placeholder="Type a message..." 
                        value={input} 
                        onChange={e => setInput(e.target.value)} 
                        disabled={loading}
                    />
                    <button type="submit" disabled={loading || !input.trim()} className="bg-indigo-600 text-white p-3 rounded-xl hover:bg-indigo-700 transition disabled:opacity-50 shadow-md">
                        <Send size={20}/>
                    </button>
                </form>
             </div>
        </div>
    );
};

// --- Auth Component (Restored & Redesigned) ---
const AuthScreen = ({ onLogin }: { onLogin: (user: User) => void }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleGoogleLogin = async () => { 
    try { await signInWithPopup(auth, googleProvider); } 
    catch (err: any) { setError(err.message); } 
  };

  const handleSubmit = async (e: React.FormEvent) => { 
    e.preventDefault(); 
    setError(''); 
    setIsSubmitting(true);
    try { 
      if (isLogin) await signInWithEmailAndPassword(auth, email, password); 
      else await createUserWithEmailAndPassword(auth, email, password); 
    } catch (err: any) { 
      const msg = err.message.includes('auth/invalid-email') ? 'Invalid email address.' 
        : err.message.includes('auth/wrong-password') ? 'Incorrect password.'
        : err.message.includes('auth/user-not-found') ? 'No account found with this email.'
        : err.message.includes('auth/email-already-in-use') ? 'Email already in use.'
        : err.message;
      setError(msg); 
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 font-inter">
      <div className="bg-white p-8 md:p-10 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-gray-100 max-w-md w-full">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-gray-900 rounded-2xl flex items-center justify-center text-white text-2xl font-black mx-auto mb-4 shadow-lg shadow-gray-200">S</div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">StockMaster</h1>
          <p className="text-gray-500 mt-2 font-medium">Professional Inventory Management</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-100 rounded-xl flex items-start gap-3 text-rose-600 text-sm font-medium animate-in slide-in-from-top-2">
            <AlertTriangle size={18} className="mt-0.5 flex-shrink-0"/>
            <p>{error}</p>
          </div>
        )}

        <button onClick={handleGoogleLogin} className="w-full bg-white border border-gray-200 text-gray-700 font-bold py-3.5 rounded-xl hover:bg-gray-50 transition flex items-center justify-center gap-3 mb-6">
          <Globe size={18} /> Continue with Google
        </button>

        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100"></div></div>
          <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-gray-400 font-bold tracking-wider">Or with email</span></div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5 ml-1">Email Address</label>
            <input type="email" required className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-900 outline-none transition font-medium" placeholder="name@company.com" value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5 ml-1">Password</label>
            <input type="password" required className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-900 outline-none transition font-medium" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} />
          </div>
          <button type="submit" disabled={isSubmitting} className="w-full bg-gray-900 text-white font-bold py-3.5 rounded-xl hover:bg-black transition shadow-xl shadow-gray-200 mt-2 flex justify-center items-center">
            {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : (isLogin ? 'Sign In' : 'Create Account')}
          </button>
        </form>

        <div className="text-center mt-8">
          <p className="text-sm text-gray-500 font-medium">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button onClick={() => { setIsLogin(!isLogin); setError(''); }} className="text-gray-900 font-bold hover:underline">
              {isLogin ? 'Sign Up' : 'Log In'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

// --- Main App Logic ---
const AuthenticatedApp = ({ user, logout }: { user: User, logout: () => void }) => {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [currentWarehouse, setCurrentWarehouse] = useState<Warehouse | null>(null);
  const [items, setItems] = useState<StockItem[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [allItems, setAllItems] = useState<StockItem[]>([]);
  const [transactions, setTransactions] = useState<StockTransaction[]>([]);
  const [view, setView] = useState<ViewMode>('warehouses');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [teamMessages, setTeamMessages] = useState<ChatMessage[]>([]);
  
  // Modal States
  const [sellItem, setSellItem] = useState<StockItem | null>(null);
  const [damageItem, setDamageItem] = useState<StockItem | null>(null);
  const [historyItem, setHistoryItem] = useState<StockItem | null>(null);
  const [historyData, setHistoryData] = useState<StockTransaction[]>([]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const whRef = ref(db, 'warehouses');
    const itemsRef = ref(db, 'inventory');
    const chatRef = ref(db, 'team_chat');
    const histRef = ref(db, 'stock_history');
    const custRef = ref(db, 'customers');

    const unsubWh = onValue(whRef, (s) => setWarehouses(s.val() ? Object.entries(s.val()).map(([k, v]: [string, any]) => ({ id: k, ...v })) : []));
    const unsubItems = onValue(itemsRef, (s) => setAllItems(s.val() ? Object.entries(s.val()).map(([k, v]: [string, any]) => ({ id: k, ...v })) : []));
    const unsubChat = onValue(chatRef, (s) => s.val() && setTeamMessages(Object.values(s.val() as any).sort((a:any,b:any) => a.timestamp - b.timestamp)));
    const unsubHist = onValue(histRef, (s) => setTransactions(s.val() ? Object.values(s.val()) : []));
    const unsubCust = onValue(custRef, (s) => setCustomers(s.val() ? Object.entries(s.val()).map(([k, v]: [string, any]) => ({ id: k, ...v })) : []));

    return () => { unsubWh(); unsubItems(); unsubChat(); unsubHist(); unsubCust(); };
  }, []);

  useEffect(() => {
    if (currentWarehouse) setItems(allItems.filter(i => i.warehouseId === currentWarehouse.id));
    else if (view === 'dashboard' || view === 'recent' || view === 'inventory') setItems(allItems); // Global view allowed
    else setItems([]);
  }, [currentWarehouse, allItems, view]);

  // Filter transactions based on current warehouse (if selected)
  const filteredTransactions = useMemo(() => {
      if (!currentWarehouse) return transactions;
      // Get all item IDs belonging to this warehouse
      const warehouseItemIds = new Set(allItems.filter(i => i.warehouseId === currentWarehouse.id).map(i => i.id));
      return transactions.filter(t => warehouseItemIds.has(t.itemId));
  }, [transactions, currentWarehouse, allItems]);

  // Load Individual History for Modal
  useEffect(() => {
    if (historyItem) {
      setHistoryData(transactions.filter(t => t.itemId === historyItem.id));
    }
  }, [historyItem, transactions]);

  // --- Bulk Operation Handlers ---
  const handleBulkAddNew = async (newItems: any[]) => {
     if (!currentWarehouse) return alert("Select warehouse");
     const updates: any = {};
     const timeNow = getISODateIST();
     
     newItems.forEach(item => {
        const newItemRef = push(ref(db, 'inventory'));
        const newItemId = newItemRef.key!;
        
        updates[`inventory/${newItemId}`] = {
           ...item,
           warehouseId: currentWarehouse.id,
           quantity: Number(item.quantity),
           price: Number(item.price),
           minThreshold: Number(item.minThreshold),
           lastUpdated: timeNow,
           userId: user.uid
        };

        const histKey = push(ref(db, 'stock_history')).key!;
        updates[`stock_history/${histKey}`] = {
           id: Date.now().toString() + Math.random(),
           itemId: newItemId,
           type: 'IN',
           quantity: Number(item.quantity),
           price: Number(item.price),
           costPrice: Number(item.price),
           date: timeNow,
           partyName: item.source || 'Bulk Add',
           userEmail: user.email
        };
     });

     try {
        await update(ref(db), updates);
        if (!isMobile) setView('inventory'); else setView('dashboard');
     } catch(e: any) { alert(e.message); }
  };

  const handleBulkRestock = async (restockItems: {id: string, qty: number}[]) => {
     const updates: any = {};
     const timeNow = getISODateIST();
     
     restockItems.forEach(req => {
         const item = items.find(i => i.id === req.id);
         if(item) {
             updates[`inventory/${req.id}/quantity`] = item.quantity + req.qty;
             updates[`inventory/${req.id}/lastUpdated`] = timeNow;

             const histKey = push(ref(db, 'stock_history')).key!;
             updates[`stock_history/${histKey}`] = {
                id: Date.now().toString() + Math.random(),
                itemId: req.id,
                type: 'IN',
                quantity: req.qty,
                price: item.price,
                costPrice: item.price,
                date: timeNow,
                partyName: 'Bulk Restock',
                userEmail: user.email
             };
         }
     });

     try {
        await update(ref(db), updates);
        if (!isMobile) setView('inventory'); else setView('dashboard');
     } catch(e: any) { alert(e.message); }
  };

  // --- Legacy Single Item Handlers ---
  const handleAddItem = async (item: any) => {
    if (!currentWarehouse) {
       alert("Please select a warehouse first.");
       return;
    }
    try {
      const timeNow = getISODateIST();
      const newItemRef = await push(ref(db, 'inventory'), { ...item, warehouseId: currentWarehouse.id, quantity: Number(item.quantity), price: Number(item.price), minThreshold: Number(item.minThreshold) || 5, lastUpdated: timeNow, userId: user.uid });
      await push(ref(db, 'stock_history'), { id: Date.now().toString(), itemId: newItemRef.key, type: 'IN', quantity: Number(item.quantity), price: Number(item.price), costPrice: Number(item.price), date: timeNow, partyName: item.source || 'Unknown', userEmail: user.email });
      if (!isMobile) setView('inventory'); else setView('dashboard');
    } catch (e: any) { alert("Error: " + e.message); }
  };

  const handleUpdateExisting = async (id: string, addQty: number) => {
     const item = items.find(i => i.id === id);
     if(!item) return;
     const newQty = item.quantity + addQty;
     const timeNow = getISODateIST();
     await update(ref(db, `inventory/${id}`), { quantity: newQty, lastUpdated: timeNow });
     await push(ref(db, 'stock_history'), { id: Date.now().toString(), itemId: id, type: 'IN', quantity: addQty, price: item.price, costPrice: item.price, date: timeNow, partyName: 'Stock Update', userEmail: user.email });
     if (!isMobile) setView('inventory'); else setView('dashboard');
  };

  const handleDeleteItem = async (id: string) => { 
      if (window.confirm('Are you sure you want to delete this item permanently?')) {
        await remove(ref(db, `inventory/${id}`));
      }
  };

  const handleSellItem = async (qty: number, customer: string, price: number, tax: number) => {
    if (!sellItem) return;
    const timeNow = getISODateIST();
    await update(ref(db, `inventory/${sellItem.id}`), { quantity: sellItem.quantity - qty, lastUpdated: timeNow });
    // Note: Storing original cost price (sellItem.price) in history for accurate profit calculation later
    await push(ref(db, 'stock_history'), { id: Date.now().toString(), itemId: sellItem.id, type: 'OUT', quantity: qty, price: price, costPrice: sellItem.price, taxPercent: tax, date: timeNow, partyName: customer, userEmail: user.email });
    setSellItem(null);
  }

  const handleDamageItem = async (qty: number, reason: string) => {
    if (!damageItem) return;
    const timeNow = getISODateIST();
    await update(ref(db, `inventory/${damageItem.id}`), { quantity: damageItem.quantity - qty, lastUpdated: timeNow });
    await push(ref(db, 'stock_history'), { id: Date.now().toString(), itemId: damageItem.id, type: 'DAMAGE', quantity: qty, price: damageItem.price, costPrice: damageItem.price, date: timeNow, partyName: reason, userEmail: user.email });
    setDamageItem(null);
  }

  const handleTeamSend = async (text: string) => {
    if (!text.trim()) return;
    const msg: ChatMessage = { sender: user.email || 'User', role: 'user', content: text, timestamp: Date.now() };
    await push(ref(db, 'team_chat'), msg);
  };

  const handleAddWarehouse = async (name: string, location: string) => {
    await push(ref(db, 'warehouses'), { name, location, type: 'General' });
    if (warehouses.length === 0) setView('warehouses');
  };

  const handleDeleteWarehouse = async (id: string) => {
      await remove(ref(db, `warehouses/${id}`));
      if (currentWarehouse?.id === id) {
        setCurrentWarehouse(null);
        setView('warehouses');
      }
  };

  const handleAddCustomer = async (cust: Omit<Customer, 'id'>) => {
      await push(ref(db, 'customers'), cust);
  };

  const handleDeleteCustomer = async (id: string) => {
      await remove(ref(db, `customers/${id}`));
  };

  const handleBulkSell = async (data: { customerName: string, sellerName: string, sellerGstin?: string, sellerAddress?: string, taxPercent: number, items: { id: string, qty: number, price: number }[], gstin?: string, address?: string }) => {
     const updates: any = {};
     const timeNow = getISODateIST();

     data.items.forEach(req => {
        const item = items.find(i => i.id === req.id);
        if(item) {
           updates[`inventory/${req.id}/quantity`] = item.quantity - req.qty;
           updates[`inventory/${req.id}/lastUpdated`] = timeNow;

           const histKey = push(ref(db, 'stock_history')).key!;
           updates[`stock_history/${histKey}`] = {
              id: Date.now().toString() + Math.random(),
              itemId: req.id,
              type: 'OUT',
              quantity: req.qty,
              price: req.price,
              costPrice: item.price,
              taxPercent: data.taxPercent,
              date: timeNow,
              partyName: data.customerName,
              userEmail: user.email,
              sellerName: data.sellerName,
              sellerGstin: data.sellerGstin,
              sellerAddress: data.sellerAddress,
              customerGstin: data.gstin,
              customerAddress: data.address
           };
        }
     });

     try {
        await update(ref(db), updates);
        if (!isMobile) setView('inventory'); else setView('dashboard');
     } catch(e: any) { alert(e.message); }
  };

  const exportToCSV = (items: StockItem[], warehouses: Warehouse[]) => {
      const headers = ["ID", "Name", "Category", "Quantity", "Cost Price", "Total Value", "Low Stock Threshold", "Warehouse", "Source", "Last Updated"];
      const rows = items.map(item => {
        const warehouseName = warehouses.find(w => w.id === item.warehouseId)?.name || 'Unknown';
        return [
          item.id,
          `"${item.name.replace(/"/g, '""')}"`,
          `"${item.category.replace(/"/g, '""')}"`,
          item.quantity,
          item.price,
          item.quantity * item.price,
          item.minThreshold,
          `"${warehouseName.replace(/"/g, '""')}"`,
          `"${(item.source || '').replace(/"/g, '""')}"`,
          new Date(item.lastUpdated).toLocaleString()
        ];
      });
      const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `stock_export_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  // Determine if we need to disable scrolling on the main container
  // For views that handle their own full-height layout (chat, bulk sell)
  const isFixedLayout = view === 'team_chat' || view === 'bulk_sell';

  return (
    <div className="flex h-[100dvh] bg-gray-50 font-inter text-gray-900 overflow-hidden fixed inset-0">
        {/* Sidebar */}
        {!isMobile && (
          <aside className="w-72 bg-white border-r border-gray-200 flex-shrink-0 flex flex-col z-20 h-full">
             <div className="p-8 border-b border-gray-100"><h1 className="text-2xl font-black flex items-center gap-2 tracking-tight text-gray-900"><div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center text-white text-lg">S</div> StockMaster</h1>
             {currentWarehouse ? <div className="mt-6 p-4 bg-gray-50 rounded-xl border border-gray-100 cursor-pointer hover:bg-gray-100 transition" onClick={() => setView('warehouses')}><p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Current Warehouse</p><p className="font-bold text-sm text-gray-900 flex items-center gap-2"><MapPin size={14}/>{currentWarehouse.name}</p></div> : (view !== 'warehouses' && view !== 'manage_warehouses' && <div className="mt-6 p-4 bg-gray-900 rounded-xl text-white cursor-pointer hover:bg-gray-800 transition" onClick={() => setView('warehouses')}><p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">View Mode</p><p className="font-bold text-sm flex items-center gap-2"><Globe size={14}/> Global Overview</p></div>)}
             </div>
             <nav className="p-6 space-y-2 flex-1 overflow-y-auto">
                {(currentWarehouse || (view !== 'warehouses' && view !== 'manage_warehouses')) ? <>
                  <button onClick={() => setView('dashboard')} className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl text-sm font-semibold transition-all ${view === 'dashboard' ? 'bg-gray-900 text-white shadow-lg shadow-gray-200' : 'text-gray-500 hover:bg-gray-50'}`}><LayoutDashboard size={20}/> Dashboard</button>
                  <button onClick={() => setView('recent')} className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl text-sm font-semibold transition-all ${view === 'recent' ? 'bg-gray-900 text-white shadow-lg shadow-gray-200' : 'text-gray-500 hover:bg-gray-50'}`}><Calendar size={20}/> Recent Activity</button>
                  <button onClick={() => setView('invoices')} className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl text-sm font-semibold transition-all ${view === 'invoices' ? 'bg-gray-900 text-white shadow-lg shadow-gray-200' : 'text-gray-500 hover:bg-gray-50'}`}><FileText size={20}/> Invoices</button>
                  <button onClick={() => setView('inventory')} className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl text-sm font-semibold transition-all ${view === 'inventory' ? 'bg-gray-900 text-white shadow-lg shadow-gray-200' : 'text-gray-500 hover:bg-gray-50'}`}><Package size={20}/> Inventory</button>
                  <button onClick={() => setView('manage_gst')} className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl text-sm font-semibold transition-all ${view === 'manage_gst' ? 'bg-gray-900 text-white shadow-lg shadow-gray-200' : 'text-gray-500 hover:bg-gray-50'}`}><Briefcase size={20}/> GST / Parties</button>

                  {view !== 'inventory' && view !== 'recent' && view !== 'dashboard' && view !== 'ai' && view !== 'team_chat' && view !== 'add' && view !== 'bulk_sell' && view !== 'invoices' && view !== 'manage_gst' ? null : (
                      <>
                        <button onClick={() => setView('add')} className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl text-sm font-semibold transition-all ${view === 'add' ? 'bg-gray-900 text-white shadow-lg shadow-gray-200' : 'text-gray-500 hover:bg-gray-50'}`}><PlusCircle size={20}/> Bulk Add</button>
                        <button onClick={() => setView('bulk_sell')} className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl text-sm font-semibold transition-all ${view === 'bulk_sell' ? 'bg-gray-900 text-white shadow-lg shadow-gray-200' : 'text-gray-500 hover:bg-gray-50'}`}><ShoppingCart size={20}/> Bulk Sell</button>
                      </>
                  )}
                  <button onClick={() => setView('team_chat')} className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl text-sm font-semibold transition-all ${view === 'team_chat' ? 'bg-gray-900 text-white shadow-lg shadow-gray-200' : 'text-gray-500 hover:bg-gray-50'}`}><Users size={20}/> Team Chat</button>
                </> : (
                  <div className="text-center py-10 px-4">
                     <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3"><Building2 size={32} className="text-gray-300"/></div>
                     <p className="text-sm text-gray-400">Select a warehouse or create one to begin.</p>
                  </div>
                )}
                 
                 <div className="pt-4 mt-2 border-t border-gray-50">
                     <button onClick={() => setView('manage_warehouses')} className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl text-sm font-semibold transition-all ${view === 'manage_warehouses' ? 'bg-gray-900 text-white shadow-lg shadow-gray-200' : 'text-gray-500 hover:bg-gray-50'}`}><Settings size={20}/> Manage Locations</button>
                 </div>
             </nav>
             <div className="p-6 border-t border-gray-100 flex-shrink-0"><button onClick={logout} className="w-full flex items-center justify-center gap-2 text-gray-500 hover:text-rose-600 font-semibold transition"><LogOut size={16}/> Sign Out</button></div>
          </aside>
        )}

        {/* Main Content */}
        <div className="flex-1 flex flex-col h-full relative overflow-hidden bg-gray-50/50">
            {isMobile && (
              <header className="bg-white p-4 shadow-sm z-30 flex-none flex justify-between items-center border-b border-gray-100">
                 <h1 className="text-lg font-black text-gray-900 flex items-center gap-2"><div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center text-white">S</div> StockMaster</h1>
                 {currentWarehouse && <button onClick={() => setView('warehouses')} className="text-xs font-bold bg-gray-100 px-3 py-1.5 rounded-full text-gray-600">{currentWarehouse.name.substring(0,8)}...</button>}
                 <button onClick={logout} className="text-gray-400"><LogOut size={20} /></button>
              </header>
            )}

            <main className={`flex-1 relative ${isFixedLayout ? 'overflow-hidden' : 'overflow-y-auto p-4 md:p-10 scroll-smooth'}`}>
                <div className={`${isMobile && !isFixedLayout ? 'pb-24' : ''} ${isFixedLayout ? 'h-full' : 'max-w-7xl mx-auto pb-10'} flex flex-col`}>
                    {/* Warehouse Selection logic */}
                    {view === 'warehouses' && (
                        <div>
                             <div className="flex justify-between items-center mb-8">
                                <h2 className="text-3xl font-black text-gray-900">Select Location</h2>
                                <button onClick={() => setView('manage_warehouses')} className="bg-white border border-gray-200 text-gray-700 font-bold py-2.5 px-4 rounded-xl hover:bg-gray-50 transition flex items-center gap-2 shadow-sm"><Plus size={18}/> New Location</button>
                             </div>
                             
                             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div onClick={() => { setCurrentWarehouse(null); setView('dashboard'); }} className="group bg-gray-900 p-8 rounded-3xl text-white cursor-pointer hover:shadow-2xl hover:shadow-gray-200 transition-all relative overflow-hidden">
                                    <Globe className="absolute -right-4 -bottom-4 text-white opacity-5 w-40 h-40 group-hover:scale-110 transition-transform"/>
                                    <h3 className="text-2xl font-bold mb-2">Global View</h3><p className="text-gray-400">Consolidated analytics across all {warehouses.length} warehouses.</p>
                                </div>
                                {warehouses.map(w => (
                                    <div key={w.id} onClick={() => {setCurrentWarehouse(w); setView('dashboard');}} className="bg-white p-8 rounded-3xl border border-gray-100 cursor-pointer hover:shadow-xl hover:shadow-gray-100 hover:border-gray-200 transition-all group">
                                        <div className="flex justify-between items-start mb-4"><div className="p-4 bg-gray-50 rounded-2xl group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors"><Building2 size={24}/></div></div>
                                        <h3 className="text-xl font-bold text-gray-900">{w.name}</h3>
                                        <p className="text-sm text-gray-500 mt-2 flex items-center gap-2"><MapPin size={12}/> {w.location}</p>
                                    </div>
                                ))}
                             </div>
                        </div>
                    )}

                    {(currentWarehouse || (view !== 'warehouses' && view !== 'manage_warehouses')) && (
                        <>
                           {view === 'dashboard' && <DashboardContent items={items} transactions={filteredTransactions} setView={setView} isMobile={isMobile} warehouseName={currentWarehouse?.name} onSell={setSellItem} onDelete={handleDeleteItem} onHistory={setHistoryItem} onDamage={setDamageItem} isGlobal={!currentWarehouse} warehouses={warehouses} />}
                           {view === 'recent' && <RecentActivity transactions={filteredTransactions} items={items} />}
                           {view === 'invoices' && <InvoiceList transactions={filteredTransactions} items={items} />}
                           {view === 'manage_gst' && <CustomerManager customers={customers} onAdd={handleAddCustomer} onDelete={handleDeleteCustomer} />}
                           {view === 'inventory' && (
                               <div className="space-y-6">
                                   <div className="flex justify-between items-center">
                                       <h2 className="text-2xl font-bold">Inventory</h2>
                                       <div className="flex gap-2">
                                           <button onClick={() => exportToCSV(items, warehouses)} className="bg-white border border-gray-200 text-gray-700 px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-gray-50 transition shadow-sm flex items-center gap-2"><Download size={16}/> Export</button>
                                           <button onClick={() => setView('add')} className="bg-gray-900 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-black transition shadow-lg flex items-center gap-2"><PlusCircle size={16}/> Add Stock</button>
                                       </div>
                                   </div>
                                   <StockList items={items} onDelete={handleDeleteItem} onSell={setSellItem} onHistory={setHistoryItem} onDamage={setDamageItem} isMobile={isMobile} />
                               </div>
                           )}
                           
                           {/* Updated Views */}
                           {view === 'add' && <BulkAdd items={items} onConfirmNew={handleBulkAddNew} onConfirmRestock={handleBulkRestock} />}
                           {view === 'bulk_sell' && <BulkSell items={items} customers={customers} currentUserEmail={user.email || ''} onConfirmSell={handleBulkSell} />}
                           
                           {view === 'team_chat' && <TeamChat user={user} messages={teamMessages} onSend={handleTeamSend} isMobile={isMobile} />}
                        </>
                    )}

                    {view === 'manage_warehouses' && (
                       <WarehouseManager warehouses={warehouses} onAdd={handleAddWarehouse} onDelete={handleDeleteWarehouse} />
                    )}
                </div>
            </main>
        </div>
        
        {/* Floating AI Widget - Always visible */}
        <AIChatWidget user={user} aiContext={{ inventory: items, warehouses, currentWarehouseId: currentWarehouse?.id }} />

        {/* Mobile Nav */}
        {isMobile && (currentWarehouse || (view !== 'warehouses' && view !== 'manage_warehouses')) && (
            <nav className="fixed bottom-0 w-full bg-white/90 backdrop-blur-md border-t border-gray-100 z-40 px-6 py-4 flex justify-between items-center pb-safe">
              <button onClick={() => setView('dashboard')} className={`${view === 'dashboard' ? 'text-gray-900' : 'text-gray-400'}`}><LayoutDashboard size={24} /></button>
              <button onClick={() => setView('invoices')} className={`${view === 'invoices' ? 'text-gray-900' : 'text-gray-400'}`}><FileText size={24} /></button>
              <div className="relative -top-8"><button onClick={() => setView('add')} className="w-16 h-16 bg-gray-900 rounded-full flex items-center justify-center text-white shadow-xl shadow-gray-400/50 hover:scale-105 transition-transform"><PlusCircle size={32} /></button></div>
              <button onClick={() => setView('inventory')} className={`${view === 'inventory' ? 'text-gray-900' : 'text-gray-400'}`}><Package size={24} /></button>
              <button onClick={() => setView('bulk_sell')} className={`${view === 'bulk_sell' ? 'text-gray-900' : 'text-gray-400'}`}><ShoppingCart size={24} /></button>
            </nav>
        )}

        {/* Modals */}
        {sellItem && <DispatchModal item={sellItem} onClose={() => setSellItem(null)} onConfirm={handleSellItem} />}
        {damageItem && <DamageModal item={damageItem} onClose={() => setDamageItem(null)} onConfirm={handleDamageItem} />}
        {historyItem && <HistoryModal item={historyItem} transactions={historyData} onClose={() => setHistoryItem(null)} userName={user.email || 'Admin'} />}
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => { setUser(currentUser); setLoading(false); });
    return () => unsubscribe();
  }, []);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><Loader2 className="animate-spin text-gray-900" size={48} /></div>;
  if (!user) return <AuthScreen onLogin={setUser} />;
  return <AuthenticatedApp user={user} logout={() => signOut(auth)} />;
}