import React, { useState, useMemo, useEffect } from 'react';
import { StockItem, Customer } from '../types';
import { Plus, Trash2, Search, Package, ArrowRight, User, ShoppingCart, Truck, AlertTriangle, CheckCircle2, X, Minus, ChevronRight, Zap, FileText, Download, Building2, MapPin } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// --- BULK ADD COMPONENT ---
interface BulkAddProps {
  items: StockItem[];
  onConfirmNew: (items: any[]) => void;
  onConfirmRestock: (updates: { id: string, qty: number }[]) => void;
}

export const BulkAdd: React.FC<BulkAddProps> = ({ items, onConfirmNew, onConfirmRestock }) => {
  const [mode, setMode] = useState<'new' | 'existing'>('new');
  
  // State for New Items
  const [newRows, setNewRows] = useState([{ name: '', category: 'General', quantity: '', price: '', minThreshold: '5', source: '' }]);

  // State for Existing Restock
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRestock, setSelectedRestock] = useState<{ item: StockItem, addQty: string }[]>([]);

  // --- Handlers for NEW Items ---
  const handleAddRow = () => setNewRows([...newRows, { name: '', category: 'General', quantity: '', price: '', minThreshold: '5', source: '' }]);
  const handleRemoveRow = (idx: number) => setNewRows(newRows.filter((_, i) => i !== idx));
  const handleNewChange = (idx: number, field: string, val: string) => {
    const updated = [...newRows];
    (updated[idx] as any)[field] = val;
    setNewRows(updated);
  };
  const submitNew = () => {
    const valid = newRows.filter(r => r.name && r.quantity && r.price);
    if(valid.length === 0) return alert("Please fill at least one row completely.");
    onConfirmNew(valid);
    setNewRows([{ name: '', category: 'General', quantity: '', price: '', minThreshold: '5', source: '' }]);
  };

  // --- Handlers for EXISTING Items ---
  const filteredItems = useMemo(() => items.filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase())), [items, searchTerm]);
  
  const addToRestockList = (item: StockItem) => {
    if(selectedRestock.find(x => x.item.id === item.id)) return;
    setSelectedRestock([...selectedRestock, { item, addQty: '' }]);
    setSearchTerm('');
  };

  const updateRestockQty = (id: string, qty: string) => {
     setSelectedRestock(selectedRestock.map(x => x.item.id === id ? { ...x, addQty: qty } : x));
  };

  const submitRestock = () => {
     const valid = selectedRestock.filter(x => Number(x.addQty) > 0).map(x => ({ id: x.item.id, qty: Number(x.addQty) }));
     if(valid.length === 0) return alert("Please enter quantities.");
     onConfirmRestock(valid);
     setSelectedRestock([]);
  };

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden h-full flex flex-col">
       <div className="flex border-b border-gray-100 flex-none">
          <button onClick={() => setMode('new')} className={`flex-1 py-4 text-sm font-bold tracking-wide uppercase transition ${mode === 'new' ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}>Add New Items</button>
          <button onClick={() => setMode('existing')} className={`flex-1 py-4 text-sm font-bold tracking-wide uppercase transition ${mode === 'existing' ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}>Restock Existing</button>
       </div>

       <div className="p-6 md:p-8 flex-1 overflow-y-auto">
          {mode === 'new' ? (
             <div className="space-y-6">
                 <div className="flex justify-between items-center">
                    <h3 className="text-lg font-bold text-gray-900">Bulk Entry</h3>
                    <button onClick={handleAddRow} className="flex items-center gap-2 text-indigo-600 font-bold text-sm bg-indigo-50 px-4 py-2 rounded-xl hover:bg-indigo-100 transition"><Plus size={16}/> Add Row</button>
                 </div>
                 
                 <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                       <thead>
                          <tr className="text-left text-gray-400 text-xs uppercase">
                             <th className="pb-3 min-w-[150px]">Item Name</th>
                             <th className="pb-3 w-32">Category</th>
                             <th className="pb-3 w-24">Qty</th>
                             <th className="pb-3 w-24">Price (₹)</th>
                             <th className="pb-3 w-32">Supplier</th>
                             <th className="pb-3 w-10"></th>
                          </tr>
                       </thead>
                       <tbody className="space-y-2">
                          {newRows.map((row, i) => (
                             <tr key={i} className="group">
                                <td className="p-1"><input className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-gray-900" placeholder="Item Name" value={row.name} onChange={e => handleNewChange(i, 'name', e.target.value)} /></td>
                                <td className="p-1">
                                   <select className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-gray-900" value={row.category} onChange={e => handleNewChange(i, 'category', e.target.value)}>
                                      <option>General</option><option>Electronics</option><option>Furniture</option><option>Raw Material</option>
                                   </select>
                                </td>
                                <td className="p-1"><input type="number" className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-gray-900 font-bold" placeholder="0" value={row.quantity} onChange={e => handleNewChange(i, 'quantity', e.target.value)} /></td>
                                <td className="p-1"><input type="number" className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-gray-900" placeholder="0.00" value={row.price} onChange={e => handleNewChange(i, 'price', e.target.value)} /></td>
                                <td className="p-1"><input className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-gray-900" placeholder="Source" value={row.source} onChange={e => handleNewChange(i, 'source', e.target.value)} /></td>
                                <td className="p-1 text-center"><button onClick={() => handleRemoveRow(i)} className="text-gray-300 hover:text-rose-500 transition"><Trash2 size={16}/></button></td>
                             </tr>
                          ))}
                       </tbody>
                    </table>
                 </div>
                 <button onClick={submitNew} className="w-full py-4 bg-gray-900 text-white font-bold rounded-xl hover:bg-black transition shadow-lg flex justify-center gap-2"><CheckCircle2/> Save to Inventory</button>
             </div>
          ) : (
             <div className="space-y-6">
                <div className="relative z-20">
                   <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20}/>
                   <input className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-gray-900 transition text-lg" placeholder="Search item to restock..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                   {searchTerm && (
                      <div className="absolute top-full left-0 right-0 bg-white border border-gray-100 rounded-xl shadow-xl mt-2 max-h-60 overflow-y-auto z-30">
                         {filteredItems.map(item => (
                            <div key={item.id} onClick={() => addToRestockList(item)} className="p-4 hover:bg-gray-50 cursor-pointer flex justify-between items-center border-b border-gray-50 last:border-0">
                               <div><p className="font-bold text-gray-900">{item.name}</p><p className="text-xs text-gray-500">Current: {item.quantity}</p></div>
                               <Plus size={16} className="text-indigo-600"/>
                            </div>
                         ))}
                         {filteredItems.length === 0 && <div className="p-4 text-center text-gray-400 text-sm">No items found</div>}
                      </div>
                   )}
                </div>

                <div className="space-y-3">
                   {selectedRestock.map((entry) => (
                      <div key={entry.item.id} className="flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-2xl shadow-sm animate-in slide-in-from-bottom-2">
                          <div className="p-3 bg-gray-100 rounded-xl"><Package size={20} className="text-gray-600"/></div>
                          <div className="flex-1">
                             <h4 className="font-bold text-gray-900">{entry.item.name}</h4>
                             <p className="text-xs text-gray-500">Current Stock: {entry.item.quantity}</p>
                          </div>
                          <div className="w-32">
                             <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Add Qty</label>
                             <input autoFocus type="number" className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 font-bold text-center outline-none focus:border-indigo-500" value={entry.addQty} onChange={e => updateRestockQty(entry.item.id, e.target.value)} placeholder="+0" />
                          </div>
                          <button onClick={() => setSelectedRestock(selectedRestock.filter(x => x.item.id !== entry.item.id))} className="p-2 text-gray-300 hover:text-rose-500"><X size={20}/></button>
                      </div>
                   ))}
                   {selectedRestock.length === 0 && (
                      <div className="text-center py-10 border-2 border-dashed border-gray-100 rounded-2xl">
                         <Package size={40} className="mx-auto text-gray-200 mb-2"/>
                         <p className="text-gray-400 text-sm">Search and select items to restock</p>
                      </div>
                   )}
                </div>

                {selectedRestock.length > 0 && (
                   <button onClick={submitRestock} className="w-full py-4 bg-gray-900 text-white font-bold rounded-xl hover:bg-black transition shadow-lg flex justify-center gap-2"><CheckCircle2/> Update Stock Levels</button>
                )}
             </div>
          )}
       </div>
    </div>
  );
};

// --- BULK SELL COMPONENT (High-End POS Style) ---
interface BulkSellProps {
  items: StockItem[];
  customers: Customer[];
  currentUserEmail: string;
  onConfirmSell: (data: { customerName: string, sellerName: string, sellerGstin?: string, sellerAddress?: string, taxPercent: number, items: { id: string, qty: number, price: number }[], gstin?: string, address?: string }) => void;
}

export const BulkSell: React.FC<BulkSellProps> = ({ items, customers, currentUserEmail, onConfirmSell }) => {
   // Customer (Buyer) Selection
   const [customerNameInput, setCustomerNameInput] = useState('');
   const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
   const [showCustomerList, setShowCustomerList] = useState(false);
   
   // Seller (User) Selection
   const [sellerNameInput, setSellerNameInput] = useState(currentUserEmail?.split('@')[0] || 'Admin');
   const [selectedSeller, setSelectedSeller] = useState<Customer | null>(null);
   const [showSellerList, setShowSellerList] = useState(false);

   const [searchTerm, setSearchTerm] = useState('');
   const [taxRate, setTaxRate] = useState('0');
   const [cart, setCart] = useState<{ item: StockItem, qty: number, sellPrice: number }[]>([]);

   const filteredItems = useMemo(() => items.filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase())), [items, searchTerm]);
   
   const searchParties = (input: string) => {
     if (!input) return [];
     return customers.filter(c => c.name.toLowerCase().includes(input.toLowerCase()));
   };

   const filteredCustomers = useMemo(() => searchParties(customerNameInput), [customers, customerNameInput]);
   const filteredSellers = useMemo(() => searchParties(sellerNameInput), [customers, sellerNameInput]);

   const selectCustomer = (c: Customer) => {
     setSelectedCustomer(c);
     setCustomerNameInput(c.name);
     setShowCustomerList(false);
   };

   const selectSeller = (c: Customer) => {
     setSelectedSeller(c);
     setSellerNameInput(c.name);
     setShowSellerList(false);
   };

   // Clear selections if input changes manually
   useEffect(() => {
     if(selectedCustomer && customerNameInput !== selectedCustomer.name) setSelectedCustomer(null);
   }, [customerNameInput]);

   useEffect(() => {
     if(selectedSeller && sellerNameInput !== selectedSeller.name) setSelectedSeller(null);
   }, [sellerNameInput]);

   const addToCart = (item: StockItem) => {
      const existing = cart.find(x => x.item.id === item.id);
      if (existing) {
         setCart(cart.map(x => x.item.id === item.id ? { ...x, qty: x.qty + 1 } : x));
      } else {
         setCart([...cart, { item, qty: 1, sellPrice: item.price }]);
      }
   };

   const updateQty = (id: string, delta: number) => {
      setCart(cart.map(x => {
         if (x.item.id === id) {
            const newQty = Math.max(1, x.qty + delta);
            if (newQty > x.item.quantity) return x; // Cap at max stock
            return { ...x, qty: newQty };
         }
         return x;
      }));
   };

   const updatePrice = (id: string, newPrice: number) => {
      setCart(cart.map(x => x.item.id === id ? { ...x, sellPrice: newPrice } : x));
   };

   const removeFromCart = (id: string) => setCart(cart.filter(x => x.item.id !== id));

   const subTotal = cart.reduce((acc, curr) => acc + (curr.qty * curr.sellPrice), 0);
   const taxAmount = subTotal * (Number(taxRate) / 100);
   const grandTotal = subTotal + taxAmount;
   const totalQty = cart.reduce((acc, curr) => acc + curr.qty, 0);

   const handleDownloadInvoice = () => {
       if (!customerNameInput) return alert("Please enter Customer Name.");
       if (cart.length === 0) return alert("Cart is empty.");

       const doc = new jsPDF();
       const now = new Date();
       const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }); // 24 Oct 2024
       
       const sellerName = selectedSeller ? selectedSeller.name : sellerNameInput || 'StockMaster User';
       const sellerAddress = selectedSeller?.address || '';
       const sellerGstin = selectedSeller?.gstin || '';
       const sellerMobile = selectedSeller?.mobile || '';

       const buyerName = customerNameInput;
       const buyerAddress = selectedCustomer?.address || '';
       const buyerGstin = selectedCustomer?.gstin || '';
       const buyerMobile = selectedCustomer?.mobile || '';

       // --- Design Start ---
       
       // Header Background
       doc.setFillColor(248, 250, 252); // Slate-50
       doc.rect(0, 0, 210, 50, 'F');

       // Seller Details (Left)
       doc.setFont("helvetica", "bold");
       doc.setFontSize(18);
       doc.setTextColor(15, 23, 42); // Slate 900
       doc.text(sellerName, 14, 20);

       doc.setFont("helvetica", "normal");
       doc.setFontSize(10);
       doc.setTextColor(71, 85, 105); // Slate 600
       
       let y = 26;
       if (sellerAddress) {
           const splitAddr = doc.splitTextToSize(sellerAddress, 90);
           doc.text(splitAddr, 14, y);
           y += (splitAddr.length * 4) + 1;
       }
       if (sellerGstin) {
           doc.setFont("helvetica", "bold");
           doc.text(`GSTIN: ${sellerGstin}`, 14, y);
           doc.setFont("helvetica", "normal");
           y += 5;
       }
       if (sellerMobile) {
           doc.text(`Contact: ${sellerMobile}`, 14, y);
       }

       // Invoice Details (Right)
       doc.setFont("helvetica", "bold");
       doc.setFontSize(22);
       doc.setTextColor(148, 163, 184); // Slate 400
       doc.text("INVOICE", 196, 20, { align: 'right' });

       doc.setFontSize(10);
       doc.setTextColor(15, 23, 42); // Dark
       doc.text(`Invoice #: POS-${Date.now().toString().slice(-6)}`, 196, 30, { align: 'right' });
       doc.text(`Date: ${dateStr}`, 196, 35, { align: 'right' });

       // Divider
       doc.setDrawColor(226, 232, 240);
       doc.line(14, 55, 196, 55);

       // Bill To Section
       let sectionY = 65;
       doc.setFont("helvetica", "bold");
       doc.setFontSize(10);
       doc.setTextColor(100, 116, 139); // Slate 500
       doc.text("BILL TO", 14, sectionY);

       sectionY += 6;
       doc.setFont("helvetica", "bold");
       doc.setFontSize(12);
       doc.setTextColor(15, 23, 42);
       doc.text(buyerName, 14, sectionY);

       doc.setFont("helvetica", "normal");
       doc.setFontSize(10);
       doc.setTextColor(51, 65, 85);
       
       sectionY += 5;
       if (buyerAddress) {
           const splitAddr = doc.splitTextToSize(buyerAddress, 100);
           doc.text(splitAddr, 14, sectionY);
           sectionY += (splitAddr.length * 4) + 1;
       }
       if (buyerGstin) {
           doc.setFont("helvetica", "bold");
           doc.text(`GSTIN: ${buyerGstin}`, 14, sectionY);
           doc.setFont("helvetica", "normal");
           sectionY += 5;
       }
       if (buyerMobile) {
           doc.text(`Contact: ${buyerMobile}`, 14, sectionY);
           sectionY += 5;
       }

       // Table
       autoTable(doc, {
           startY: Math.max(sectionY + 5, 90),
           head: [['ITEM', 'QTY', 'RATE', 'TAX', 'AMOUNT']],
           body: cart.map(item => [
               item.item.name,
               item.qty,
               item.sellPrice.toLocaleString('en-IN'),
               taxRate + '%',
               (item.qty * item.sellPrice).toLocaleString('en-IN')
           ]),
           theme: 'grid',
           headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: 'bold' },
           columnStyles: {
               0: { cellWidth: 'auto' },
               1: { halign: 'center' },
               2: { halign: 'right' },
               3: { halign: 'center' },
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
       doc.text(`${subTotal.toLocaleString('en-IN', {minimumFractionDigits: 2})}`, rightAlign, finalY, { align: 'right' });
       
       doc.text(`Tax Amount (${taxRate}%):`, 140, finalY + 6);
       doc.text(`${taxAmount.toLocaleString('en-IN', {minimumFractionDigits: 2})}`, rightAlign, finalY + 6, { align: 'right' });
       
       // Grand Total Line
       doc.setDrawColor(226, 232, 240);
       doc.line(140, finalY + 10, 196, finalY + 10);

       doc.setFontSize(14);
       doc.setFont("helvetica", "bold");
       doc.setTextColor(15, 23, 42);
       doc.text("Total:", 140, finalY + 18);
       doc.text(`Rs. ${grandTotal.toLocaleString('en-IN', {minimumFractionDigits: 2})}`, rightAlign, finalY + 18, { align: 'right' });

       // Footer / Signatory
       const footerY = 250;
       doc.setFontSize(10);
       doc.setFont("helvetica", "normal");
       doc.setTextColor(100, 116, 139);
       
       doc.text("Authorized Signatory", 196, footerY, { align: 'right' });
       doc.text("For " + sellerName, 196, footerY + 5, { align: 'right' });
       
       doc.setFontSize(8);
       doc.text("This is a computer generated invoice.", 14, 280);

       doc.save(`Invoice_${customerNameInput.replace(/\s+/g, '_')}_${now.getTime()}.pdf`);
   };

   const submitTransaction = () => {
      if(!customerNameInput.trim()) return alert("Please enter Customer name.");
      if(cart.length === 0) return alert("Cart is empty.");
      
      const invalid = cart.find(x => x.qty > x.item.quantity);
      if(invalid) return alert(`Insufficient stock for ${invalid.item.name}. Available: ${invalid.item.quantity}`);

      const payload = {
         customerName: customerNameInput,
         sellerName: sellerNameInput,
         sellerGstin: selectedSeller?.gstin,
         sellerAddress: selectedSeller?.address,
         taxPercent: Number(taxRate),
         items: cart.map(x => ({ id: x.item.id, qty: x.qty, price: x.sellPrice })),
         gstin: selectedCustomer?.gstin,
         address: selectedCustomer?.address
      };
      onConfirmSell(payload);
   };

   return (
      <div className="flex flex-col lg:flex-row h-full w-full bg-gray-50 overflow-hidden absolute inset-0 z-10">
         {/* Left: Product Catalog */}
         <div className="flex-1 flex flex-col min-h-0 bg-gray-50 lg:pr-4">
             {/* Header / Search */}
             <div className="bg-white p-4 border-b border-gray-200 flex flex-col md:flex-row gap-4 items-center flex-none px-6 py-5">
                <div className="flex-1 w-full relative">
                   <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20}/>
                   <input 
                       className="w-full pl-12 pr-4 py-3 bg-gray-100 border-none rounded-2xl outline-none focus:ring-2 focus:ring-gray-900 transition font-medium" 
                       placeholder="Search products..." 
                       value={searchTerm} 
                       onChange={e => setSearchTerm(e.target.value)} 
                       autoFocus
                   />
                </div>
             </div>

             {/* Grid */}
             <div className="flex-1 overflow-y-auto p-4 lg:p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                   {filteredItems.map(item => {
                      const inCart = cart.find(x => x.item.id === item.id);
                      const stockLow = item.quantity < item.minThreshold;
                      return (
                         <button 
                             key={item.id} 
                             onClick={() => addToCart(item)} 
                             disabled={item.quantity <= 0}
                             className={`text-left p-5 rounded-2xl border transition-all relative overflow-hidden group
                                ${inCart ? 'bg-indigo-50 border-indigo-200 ring-1 ring-indigo-500' : 'bg-white border-gray-200 hover:shadow-lg hover:border-gray-300'}
                                ${item.quantity <= 0 ? 'opacity-60 grayscale cursor-not-allowed' : ''}
                             `}
                         >
                            <div className="flex justify-between items-start mb-2">
                               <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 bg-gray-100 px-2 py-0.5 rounded-md">{item.category}</span>
                               {inCart && <span className="bg-indigo-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">{inCart.qty} in cart</span>}
                            </div>
                            <h3 className="font-bold text-gray-900 text-lg mb-1 truncate">{item.name}</h3>
                            <div className="flex justify-between items-end mt-4">
                               <div>
                                  <p className="text-2xl font-black text-gray-900">₹{item.price}</p>
                                  <p className={`text-xs font-bold mt-1 flex items-center gap-1 ${stockLow ? 'text-rose-600' : 'text-emerald-600'}`}>
                                     {stockLow ? <AlertTriangle size={10}/> : <CheckCircle2 size={10}/>} {item.quantity} available
                                  </p>
                                </div>
                               <div className={`p-2 rounded-xl transition ${inCart ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-400 group-hover:bg-gray-900 group-hover:text-white'}`}>
                                  <Plus size={20}/>
                               </div>
                            </div>
                         </button>
                      );
                   })}
                   {filteredItems.length === 0 && (
                      <div className="col-span-full text-center py-20 text-gray-400">
                         <Search size={48} className="mx-auto mb-4 opacity-20"/>
                         <p>No products found</p>
                      </div>
                   )}
                </div>
             </div>
         </div>

         {/* Right: Cart Panel */}
         <div className="w-full lg:w-[420px] bg-white border-l border-gray-200 flex flex-col h-[40vh] lg:h-full shadow-2xl lg:shadow-none relative z-20">
             {/* Cart Header */}
             <div className="p-6 bg-white border-b border-gray-100 flex-none space-y-4">
                <h2 className="text-xl font-bold flex items-center gap-2"><ShoppingCart size={20}/> Current Order</h2>
                <div className="space-y-3">
                    
                    {/* Seller Selection - Searchable */}
                    <div className="relative">
                       <Truck size={16} className="absolute left-3 top-3.5 text-gray-400"/>
                       <input 
                         className="w-full pl-9 p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-gray-900 text-sm font-bold transition" 
                         placeholder="Seller Name / GSTIN..." 
                         value={sellerNameInput} 
                         onChange={e => { setSellerNameInput(e.target.value); setShowSellerList(true); }}
                         onFocus={() => setShowSellerList(true)}
                         onBlur={() => setTimeout(() => setShowSellerList(false), 200)}
                       />
                       {showSellerList && filteredSellers.length > 0 && (
                         <div className="absolute top-full left-0 right-0 bg-white border border-gray-100 rounded-xl shadow-xl mt-1 max-h-48 overflow-y-auto z-50">
                           {filteredSellers.map(c => (
                             <div key={c.id} onClick={() => selectSeller(c)} className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-50 last:border-0">
                               <p className="text-sm font-bold text-gray-900">{c.name}</p>
                               <p className="text-xs text-gray-500">GST: {c.gstin}</p>
                             </div>
                           ))}
                         </div>
                       )}
                    </div>
                    {selectedSeller && (
                       <div className="p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[10px] text-gray-500 animate-in slide-in-from-top-2">
                           <span className="font-bold">GSTIN:</span> {selectedSeller.gstin}
                       </div>
                    )}

                    {/* Customer Selection - Searchable */}
                    <div className="relative">
                       <User size={16} className="absolute left-3 top-3.5 text-gray-400"/>
                       <input 
                         className="w-full pl-9 p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-gray-900 text-sm font-bold transition" 
                         placeholder="Billed To / Buyer Name..." 
                         value={customerNameInput} 
                         onChange={e => { setCustomerNameInput(e.target.value); setShowCustomerList(true); }}
                         onFocus={() => setShowCustomerList(true)}
                         onBlur={() => setTimeout(() => setShowCustomerList(false), 200)}
                       />
                       {showCustomerList && filteredCustomers.length > 0 && (
                         <div className="absolute top-full left-0 right-0 bg-white border border-gray-100 rounded-xl shadow-xl mt-1 max-h-48 overflow-y-auto z-50">
                           {filteredCustomers.map(c => (
                             <div key={c.id} onClick={() => selectCustomer(c)} className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-50 last:border-0">
                               <p className="text-sm font-bold text-gray-900">{c.name}</p>
                               <p className="text-xs text-gray-500">GST: {c.gstin}</p>
                             </div>
                           ))}
                         </div>
                       )}
                    </div>
                    
                    {/* Auto-filled Customer Details */}
                    {selectedCustomer && (
                       <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-xs space-y-1 animate-in slide-in-from-top-2">
                           <p className="font-bold text-indigo-800 flex items-center gap-2"><FileText size={12}/> {selectedCustomer.gstin}</p>
                           <p className="text-indigo-600 flex items-center gap-2"><MapPin size={12}/> {selectedCustomer.address}</p>
                       </div>
                    )}

                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs">%</span>
                        <input type="number" className="w-full pl-8 p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-gray-900 text-sm font-bold transition" placeholder="Tax %" value={taxRate} onChange={e => setTaxRate(e.target.value)} />
                    </div>
                </div>
             </div>

             {/* Cart Items List */}
             <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/50">
                {cart.map((line) => (
                   <div key={line.item.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 group">
                      <div className="flex justify-between items-start mb-3">
                         <div>
                            <h4 className="font-bold text-gray-900 leading-tight">{line.item.name}</h4>
                            <p className="text-xs text-gray-500 mt-1">₹{line.item.price} / unit</p>
                         </div>
                         <button onClick={() => removeFromCart(line.item.id)} className="text-gray-300 hover:text-rose-500 p-1 rounded-md hover:bg-rose-50 transition"><X size={16}/></button>
                      </div>
                      
                      <div className="flex items-center justify-between gap-4">
                         <div className="flex items-center bg-gray-100 rounded-xl p-1">
                            <button onClick={() => updateQty(line.item.id, -1)} className="p-2 bg-white rounded-lg shadow-sm text-gray-600 hover:text-gray-900"><Minus size={14}/></button>
                            <span className="w-10 text-center font-bold text-sm">{line.qty}</span>
                            <button onClick={() => updateQty(line.item.id, 1)} className="p-2 bg-white rounded-lg shadow-sm text-gray-600 hover:text-gray-900"><Plus size={14}/></button>
                         </div>
                         <div className="flex-1 text-right">
                            <input 
                               type="number" 
                               className="w-20 p-1 text-right font-bold text-gray-900 border-b border-gray-300 focus:border-indigo-600 outline-none bg-transparent"
                               value={line.sellPrice}
                               onChange={e => updatePrice(line.item.id, Number(e.target.value))}
                            />
                            <p className="text-[10px] text-gray-400 uppercase font-bold">Price</p>
                         </div>
                      </div>
                   </div>
                ))}
                {cart.length === 0 && (
                   <div className="h-full flex flex-col items-center justify-center text-gray-400 opacity-60">
                      <ShoppingCart size={48} className="mb-4"/>
                      <p className="font-medium">Cart is empty</p>
                   </div>
                )}
             </div>

             {/* Footer Totals */}
             <div className="p-6 bg-white border-t border-gray-100 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] z-30 flex-none">
                <div className="space-y-2 mb-4">
                   <div className="flex justify-between text-sm text-gray-500">
                      <span>Subtotal ({totalQty} items)</span>
                      <span>₹{subTotal.toLocaleString()}</span>
                   </div>
                   <div className="flex justify-between text-sm text-gray-500">
                      <span>Tax ({taxRate}%)</span>
                      <span>₹{taxAmount.toLocaleString()}</span>
                   </div>
                   <div className="flex justify-between text-xl font-black text-gray-900 pt-2 border-t border-gray-100">
                      <span>Total</span>
                      <span>₹{grandTotal.toLocaleString()}</span>
                   </div>
                </div>
                <div className="flex gap-3">
                   <button 
                      onClick={handleDownloadInvoice}
                      disabled={cart.length === 0}
                      className="p-4 bg-gray-100 text-gray-900 font-bold rounded-xl hover:bg-gray-200 transition disabled:opacity-50"
                      title="Download Invoice"
                   >
                      <Download size={20}/>
                   </button>
                   <button 
                      onClick={submitTransaction} 
                      disabled={cart.length === 0}
                      className="flex-1 py-4 bg-gray-900 text-white font-bold rounded-xl hover:bg-black transition shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 group"
                   >
                      Complete Order <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform"/>
                   </button>
                </div>
             </div>
         </div>
      </div>
   );
};
