import React, { useState, useMemo } from 'react';
import { StockItem, Warehouse } from '../types';
import { Trash2, AlertTriangle, Package, Building2, ShoppingCart, ArrowDownLeft, History, Zap, MoreHorizontal, CalendarClock, Search, Filter, X } from 'lucide-react';

interface StockListProps {
  items: StockItem[];
  warehouses?: Warehouse[]; 
  onDelete: (id: string) => void;
  onSell: (item: StockItem) => void;
  onHistory: (item: StockItem) => void;
  onDamage: (item: StockItem) => void;
  isMobile: boolean;
  showWarehouseName?: boolean;
}

export const StockList: React.FC<StockListProps> = ({ items, onDelete, onSell, onHistory, onDamage, isMobile, showWarehouseName, warehouses }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');

  const getWarehouseName = (id: string) => {
    return warehouses?.find(w => w.id === id)?.name || 'Unknown';
  };

  const formatDate = (isoString: string) => {
    if (!isoString) return '-';
    return new Date(isoString).toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
    });
  };

  // --- Search & Filter Logic ---
  const categories = useMemo(() => {
    const cats = new Set(items.map(i => i.category).filter(Boolean));
    return ['All', ...Array.from(cats)];
  }, [items]);

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesSearch = 
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        item.source?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.category.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = categoryFilter === 'All' || item.category === categoryFilter;

      return matchesSearch && matchesCategory;
    });
  }, [items, searchTerm, categoryFilter]);

  // --- Empty State ---
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400 bg-white rounded-2xl border border-dashed border-gray-300">
        <div className="p-4 bg-gray-50 rounded-full mb-4">
            <Package size={32} className="opacity-40" />
        </div>
        <p className="font-medium text-lg text-gray-500">No stock items found.</p>
        <p className="text-sm mt-1 text-gray-400">Add an item to get started.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search & Filter Bar */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="flex-1 relative">
           <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
           <input 
             type="text" 
             placeholder="Search items, suppliers..." 
             className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-900 outline-none text-sm transition shadow-sm"
             value={searchTerm}
             onChange={(e) => setSearchTerm(e.target.value)}
           />
           {searchTerm && (
             <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
               <X size={14} />
             </button>
           )}
        </div>
        <div className="relative min-w-[180px]">
           <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
           <select 
              className="w-full pl-9 pr-8 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-900 outline-none text-sm appearance-none shadow-sm cursor-pointer"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
           >
              {categories.map(c => <option key={c} value={c}>{c === 'All' ? 'All Categories' : c}</option>)}
           </select>
           <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none border-l border-gray-200 pl-2">
             <ArrowDownLeft size={12} className="text-gray-400 -rotate-45" />
           </div>
        </div>
      </div>

      {filteredItems.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
           <p className="text-gray-500 font-medium">No results found for "{searchTerm}"</p>
           <button onClick={() => {setSearchTerm(''); setCategoryFilter('All');}} className="mt-2 text-indigo-600 text-sm font-bold hover:underline">Clear filters</button>
        </div>
      ) : isMobile ? (
        // Mobile View: Modern Cards
        <div className="space-y-4 pb-24 p-1">
          {filteredItems.map((item) => (
            <div key={item.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 relative overflow-hidden group">
              {/* Status Bar */}
              <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${item.quantity < item.minThreshold ? 'bg-rose-500' : 'bg-emerald-500'}`}></div>

              <div className="flex justify-between items-start mb-3 pl-3">
                <div>
                  <h3 className="font-bold text-gray-900 text-lg leading-tight">{item.name}</h3>
                  <p className="text-xs text-gray-500 mt-1 font-medium">{item.category} &bull; {item.source || 'No Source'}</p>
                  {showWarehouseName && (
                      <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full mt-2 inline-block font-medium border border-gray-200">
                         {getWarehouseName(item.warehouseId)}
                      </span>
                  )}
                </div>
                <div className="text-right">
                   <span className="block font-bold text-gray-900 text-lg">₹{(item.quantity * item.price).toLocaleString('en-IN')}</span>
                   <span className="text-[10px] text-gray-400 uppercase tracking-wide">Value</span>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3 pl-3 mb-4">
                <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-200">
                  <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Available</p>
                  <p className={`text-xl font-bold ${item.quantity < item.minThreshold ? 'text-rose-600' : 'text-gray-800'}`}>
                    {item.quantity} <span className="text-xs font-normal text-gray-500">units</span>
                  </p>
                </div>
                <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-200">
                  <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Unit Cost</p>
                  <p className="text-xl font-bold text-gray-800">₹{item.price}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 pl-3 mb-3 text-[10px] text-gray-500 font-medium">
                  <CalendarClock size={12}/> Updated: {formatDate(item.lastUpdated)}
              </div>

              {/* Action Bar */}
              <div className="flex items-center gap-2 pl-3 border-t border-gray-100 pt-3 mt-2">
                   <button onClick={(e) => { e.stopPropagation(); onSell(item); }} className="flex-1 bg-gray-900 text-white py-3 rounded-xl text-xs font-bold shadow-sm active:scale-95 transition-transform flex items-center justify-center gap-2">
                      <ShoppingCart size={14}/> Dispatch
                   </button>
                   <button onClick={(e) => { e.stopPropagation(); onHistory(item); }} className="p-3 bg-white border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 active:scale-95 transition">
                      <History size={16}/>
                   </button>
                   <button onClick={(e) => { e.stopPropagation(); onDamage(item); }} className="p-3 bg-orange-50 text-orange-600 border border-orange-200 rounded-xl active:scale-95 transition">
                      <AlertTriangle size={16}/>
                   </button>
                   <button onClick={(e) => { e.stopPropagation(); onDelete(item.id); }} className="p-3 bg-rose-50 text-rose-600 border border-rose-200 rounded-xl active:scale-95 transition">
                      <Trash2 size={16}/>
                   </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        // Desktop View: High-Visibility Table
        <div className="rounded-xl border border-gray-300 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-300 border-collapse">
              <thead>
                <tr className="bg-gray-900 text-white">
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider border-r border-gray-700">Product Details</th>
                  {showWarehouseName && <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider border-r border-gray-700">Location</th>}
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider border-r border-gray-700">Stock Status</th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider border-r border-gray-700">Value (INR)</th>
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider border-r border-gray-700">Last Updated</th>
                  <th className="px-6 py-4 text-center text-xs font-bold uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-blue-50/50 transition-colors even:bg-gray-50">
                    <td className="px-6 py-4 border-r border-gray-200">
                      <div className="flex items-center">
                        <div className={`w-1.5 h-10 mr-4 ${item.quantity < item.minThreshold ? 'bg-rose-500' : 'bg-emerald-500'}`}></div>
                        <div>
                          <div className="text-sm font-bold text-gray-900">{item.name}</div>
                          <div className="text-xs font-medium text-gray-500 mt-0.5">{item.category} &bull; {item.source || 'N/A'}</div>
                        </div>
                      </div>
                    </td>
                    {showWarehouseName && (
                      <td className="px-6 py-4 whitespace-nowrap border-r border-gray-200">
                         <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-white border border-gray-200 text-gray-700 shadow-sm">
                           <Building2 size={12} className="mr-1.5 text-gray-400"/> {getWarehouseName(item.warehouseId)}
                         </span>
                      </td>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap border-r border-gray-200">
                      <div className="text-sm font-bold text-gray-900">{item.quantity} Units</div>
                      {item.quantity < item.minThreshold ? (
                        <span className="inline-flex items-center mt-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-200">
                          <Zap size={10} className="mr-1 fill-rose-700"/> LOW STOCK
                        </span>
                      ) : (
                        <span className="inline-flex items-center mt-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
                          IN STOCK
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap border-r border-gray-200">
                      <div className="text-sm font-bold text-gray-900">₹{(item.quantity * item.price).toLocaleString('en-IN')}</div>
                      <div className="text-xs text-gray-500 font-medium">@ ₹{item.price.toLocaleString('en-IN')} / unit</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-600 font-medium font-mono border-r border-gray-200">
                      {formatDate(item.lastUpdated)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex justify-center gap-2">
                          <button onClick={(e) => { e.stopPropagation(); onHistory(item); }} className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 border border-transparent hover:border-blue-200 rounded-lg transition-all" title="View History">
                            <History size={18} />
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); onSell(item); }} className="p-2 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 border border-transparent hover:border-emerald-200 rounded-lg transition-all" title="Dispatch / Sell">
                            <ShoppingCart size={18} />
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); onDamage(item); }} className="p-2 text-gray-500 hover:text-orange-600 hover:bg-orange-50 border border-transparent hover:border-orange-200 rounded-lg transition-all" title="Report Damage">
                            <AlertTriangle size={18} />
                          </button>
                          <div className="w-px h-8 bg-gray-200 mx-1"></div>
                          <button onClick={(e) => { e.stopPropagation(); onDelete(item.id); }} className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 rounded-lg transition-all" title="Delete Item">
                            <Trash2 size={18} />
                          </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
