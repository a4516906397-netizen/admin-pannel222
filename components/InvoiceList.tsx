import React, { useState, useMemo } from 'react';
import { StockTransaction, StockItem } from '../types';
import { FileText, Download, Search, User, Calendar, ChevronDown, ChevronUp, Package, Percent } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface InvoiceListProps {
  transactions: StockTransaction[];
  items: StockItem[];
}

interface InvoiceGroup {
  id: string;
  date: string;
  customerName: string;
  sellerName: string;
  sellerGstin?: string;
  sellerAddress?: string;
  totalAmount: number;
  taxAmount: number;
  taxPercent: number;
  itemCount: number;
  customerGstin?: string;
  customerAddress?: string;
  transactions: StockTransaction[];
}

export const InvoiceList: React.FC<InvoiceListProps> = ({ transactions, items }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Group transactions into invoices based on timestamp and customer
  const invoices = useMemo(() => {
    const groups: { [key: string]: InvoiceGroup } = {};

    // Filter only OUT transactions
    const sales = transactions.filter(t => t.type === 'OUT');

    sales.forEach(t => {
      // Create a unique key based on time and party name
      const key = `${t.date}_${t.partyName}`;
      
      if (!groups[key]) {
        groups[key] = {
          id: key,
          date: t.date,
          customerName: t.partyName,
          sellerName: t.sellerName || 'StockMaster Admin',
          sellerGstin: t.sellerGstin,
          sellerAddress: t.sellerAddress,
          totalAmount: 0,
          taxAmount: 0,
          taxPercent: t.taxPercent || 0,
          itemCount: 0,
          customerGstin: t.customerGstin,
          customerAddress: t.customerAddress,
          transactions: []
        };
      }

      const lineTotal = t.quantity * t.price;
      const tax = lineTotal * ((t.taxPercent || 0) / 100);

      groups[key].transactions.push(t);
      groups[key].totalAmount += (lineTotal + tax); // Grand total inc tax
      groups[key].taxAmount += tax;
      groups[key].itemCount += 1;
    });

    return Object.values(groups).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions]);

  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => 
      inv.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.sellerName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [invoices, searchTerm]);

  const getItemName = (id: string) => items.find(i => i.id === id)?.name || 'Unknown Item';

  const downloadInvoice = (inv: InvoiceGroup) => {
    const doc = new jsPDF();
    const dateObj = new Date(inv.date);
    const dateStr = dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

    // --- Header ---
    doc.setFillColor(248, 250, 252); // Slate-50 background
    doc.rect(0, 0, 210, 50, 'F');

    // Seller Info (Left)
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(15, 23, 42); // Slate 900
    doc.text(inv.sellerName, 14, 20);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105); // Slate 600
    
    let y = 26;
    if(inv.sellerAddress) {
        const addr = doc.splitTextToSize(inv.sellerAddress, 90);
        doc.text(addr, 14, y);
        y += (addr.length * 4) + 1;
    }
    if(inv.sellerGstin) {
        doc.setFont("helvetica", "bold");
        doc.text(`GSTIN: ${inv.sellerGstin}`, 14, y);
        doc.setFont("helvetica", "normal");
        y += 5;
    }

    // Invoice Meta (Right)
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(148, 163, 184); // Slate 400
    doc.text("INVOICE", 196, 20, { align: 'right' });

    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text(`Invoice No: INV-${dateObj.getTime().toString().slice(-6)}`, 196, 30, { align: 'right' });
    doc.text(`Date: ${dateStr}`, 196, 35, { align: 'right' });

    // Divider
    doc.setDrawColor(226, 232, 240);
    doc.line(14, 55, 196, 55);
    
    // Bill To Section
    let sectionY = 65;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text("BILL TO", 14, sectionY);

    sectionY += 6;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text(inv.customerName.toUpperCase(), 14, sectionY);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(51, 65, 85);
    
    sectionY += 5;
    if(inv.customerAddress) {
        const splitAddress = doc.splitTextToSize(inv.customerAddress, 100);
        doc.text(splitAddress, 14, sectionY);
        sectionY += (splitAddress.length * 4) + 1;
    }
    if(inv.customerGstin) {
        doc.setFont("helvetica", "bold");
        doc.text(`GSTIN: ${inv.customerGstin}`, 14, sectionY);
        doc.setFont("helvetica", "normal");
        sectionY += 5;
    }

    // Table
    autoTable(doc, {
        startY: Math.max(sectionY + 5, 90),
        head: [['ITEM', 'QTY', 'RATE', 'AMOUNT']],
        body: inv.transactions.map(t => [
            getItemName(t.itemId),
            t.quantity,
            t.price.toLocaleString('en-IN'),
            (t.quantity * t.price).toLocaleString('en-IN')
        ]),
        theme: 'grid',
        headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: 'bold' },
        columnStyles: {
            0: { cellWidth: 'auto' },
            1: { halign: 'center' },
            2: { halign: 'right' },
            3: { halign: 'right', fontStyle: 'bold' }
        },
        styles: { cellPadding: 4, fontSize: 10 }
    });

    // Totals
    const subTotal = inv.totalAmount - inv.taxAmount;
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    const rightAlign = 196;
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("Subtotal:", 140, finalY);
    doc.text(`${subTotal.toLocaleString('en-IN', {minimumFractionDigits: 2})}`, rightAlign, finalY, { align: 'right' });
    
    doc.text(`Tax (${inv.taxPercent}%):`, 140, finalY + 6);
    doc.text(`${inv.taxAmount.toLocaleString('en-IN', {minimumFractionDigits: 2})}`, rightAlign, finalY + 6, { align: 'right' });
    
    // Grand Total
    doc.setDrawColor(226, 232, 240);
    doc.line(140, finalY + 10, 196, finalY + 10);

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text("Total:", 140, finalY + 18);
    doc.text(`Rs. ${inv.totalAmount.toLocaleString('en-IN', {minimumFractionDigits: 2})}`, rightAlign, finalY + 18, { align: 'right' });

    // Footer
    const footerY = 250;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.text("Authorized Signatory", 196, footerY, { align: 'right' });
    doc.text("For " + inv.sellerName, 196, footerY + 5, { align: 'right' });

    doc.save(`Invoice_${inv.customerName.replace(/\s+/g, '_')}_${dateStr}.pdf`);
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
           <h2 className="text-2xl font-bold text-gray-900">Invoices & Bills</h2>
           <p className="text-sm text-gray-500">History of all generated sales invoices.</p>
        </div>
        <div className="relative w-full md:w-64">
           <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
           <input 
             type="text" 
             placeholder="Search customer..." 
             className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-900 outline-none text-sm transition shadow-sm"
             value={searchTerm}
             onChange={(e) => setSearchTerm(e.target.value)}
           />
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        {filteredInvoices.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
             <FileText size={48} className="mx-auto mb-4 opacity-20"/>
             <p>No invoices found matching your criteria.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
             {filteredInvoices.map((inv) => (
                <div key={inv.id} className="group hover:bg-gray-50 transition">
                   {/* Main Row */}
                   <div className="p-5 flex flex-col md:flex-row md:items-center gap-4 cursor-pointer" onClick={() => setExpandedId(expandedId === inv.id ? null : inv.id)}>
                      <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl hidden md:block">
                         <FileText size={24}/>
                      </div>
                      
                      <div className="flex-1">
                         <div className="flex justify-between items-start mb-1">
                            <h3 className="font-bold text-gray-900 text-lg">{inv.customerName}</h3>
                            <span className="font-mono font-bold text-gray-900 md:hidden">₹{inv.totalAmount.toLocaleString()}</span>
                         </div>
                         <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 font-medium">
                            <span className="flex items-center gap-1"><Calendar size={12}/> {new Date(inv.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                            <span className="flex items-center gap-1"><Package size={12}/> {inv.itemCount} Items</span>
                            {inv.customerGstin && <span className="flex items-center gap-1 text-indigo-600 bg-indigo-50 px-1 rounded">GST: {inv.customerGstin}</span>}
                         </div>
                      </div>

                      <div className="hidden md:block text-right pr-4 border-r border-gray-100">
                         <p className="text-xl font-bold text-gray-900">₹{inv.totalAmount.toLocaleString()}</p>
                         <p className="text-xs text-gray-400 uppercase font-bold">Total Paid</p>
                      </div>

                      <div className="flex items-center gap-2 mt-2 md:mt-0">
                         <button 
                            onClick={(e) => { e.stopPropagation(); downloadInvoice(inv); }}
                            className="flex-1 md:flex-none py-2 px-4 bg-gray-900 text-white rounded-lg text-sm font-bold shadow-sm hover:bg-black transition flex items-center justify-center gap-2"
                         >
                            <Download size={16}/> Download
                         </button>
                         <button className="p-2 text-gray-400 hover:text-gray-600 md:hidden">
                            {expandedId === inv.id ? <ChevronUp size={20}/> : <ChevronDown size={20}/>}
                         </button>
                      </div>
                   </div>

                   {/* Expanded Details */}
                   {expandedId === inv.id && (
                      <div className="bg-gray-50 p-4 md:p-6 border-t border-gray-100 animate-in slide-in-from-top-2">
                         <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Transaction Details</h4>
                         <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                            <table className="w-full text-sm text-left">
                               <thead className="bg-gray-100 text-xs text-gray-500 uppercase font-bold">
                                  <tr>
                                     <th className="px-4 py-3">Item</th>
                                     <th className="px-4 py-3 text-right">Qty</th>
                                     <th className="px-4 py-3 text-right">Price</th>
                                     <th className="px-4 py-3 text-right">Total</th>
                                  </tr>
                               </thead>
                               <tbody className="divide-y divide-gray-100">
                                  {inv.transactions.map((t, idx) => (
                                     <tr key={idx}>
                                        <td className="px-4 py-3 font-medium text-gray-900">{getItemName(t.itemId)}</td>
                                        <td className="px-4 py-3 text-right text-gray-600">{t.quantity}</td>
                                        <td className="px-4 py-3 text-right text-gray-600">₹{t.price}</td>
                                        <td className="px-4 py-3 text-right font-bold text-gray-900">₹{(t.quantity * t.price).toLocaleString()}</td>
                                     </tr>
                                  ))}
                                  {inv.taxAmount > 0 && (
                                     <tr className="bg-indigo-50/50">
                                        <td colSpan={3} className="px-4 py-3 text-right font-bold text-indigo-900">Tax ({inv.taxPercent}%)</td>
                                        <td className="px-4 py-3 text-right font-bold text-indigo-900">₹{inv.taxAmount.toLocaleString()}</td>
                                     </tr>
                                  )}
                               </tbody>
                            </table>
                         </div>
                      </div>
                   )}
                </div>
             ))}
          </div>
        )}
      </div>
    </div>
  );
};