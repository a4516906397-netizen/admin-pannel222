import React, { useState } from 'react';
import { Customer } from '../types';
import { Plus, Trash2, Search, User, MapPin, FileText, Phone, Building2, Save } from 'lucide-react';

interface CustomerManagerProps {
  customers: Customer[];
  onAdd: (c: Omit<Customer, 'id'>) => void;
  onDelete: (id: string) => void;
}

export const CustomerManager: React.FC<CustomerManagerProps> = ({ customers, onAdd, onDelete }) => {
  const [searchTerm, setSearchTerm] = useState('');
  
  // Form State
  const [name, setName] = useState('');
  const [gstin, setGstin] = useState('');
  const [address, setAddress] = useState('');
  const [mobile, setMobile] = useState('');

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.gstin.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !gstin) return alert("Name and GSTIN are required");
    
    onAdd({ name, gstin, address, mobile });
    setName(''); setGstin(''); setAddress(''); setMobile('');
  };

  return (
    <div className="flex flex-col md:flex-row gap-6 h-full pb-20">
      {/* Left: Add New Customer */}
      <div className="w-full md:w-1/3 space-y-6">
         <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h2 className="text-xl font-bold mb-1 flex items-center gap-2"><Building2 size={20}/> Add Party / GSTIN</h2>
            <p className="text-sm text-gray-500 mb-6">Save customer details for quick invoicing.</p>
            
            <form onSubmit={handleSubmit} className="space-y-4">
               <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5 ml-1">Party Name</label>
                  <input className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-900 outline-none transition font-medium" placeholder="e.g. Acme Traders" value={name} onChange={e => setName(e.target.value)} required />
               </div>
               <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5 ml-1">GSTIN Number</label>
                  <input className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-900 outline-none transition font-bold uppercase" placeholder="27ABCDE1234F1Z5" value={gstin} onChange={e => setGstin(e.target.value)} required />
               </div>
               <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5 ml-1">Billing Address</label>
                  <textarea className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-900 outline-none transition font-medium" placeholder="Shop No, Area, City..." value={address} onChange={e => setAddress(e.target.value)} rows={3} />
               </div>
               <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5 ml-1">Mobile Number</label>
                  <input className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-900 outline-none transition font-medium" placeholder="+91 98765 43210" value={mobile} onChange={e => setMobile(e.target.value)} />
               </div>
               <button type="submit" className="w-full bg-gray-900 text-white font-bold py-3.5 rounded-xl hover:bg-black transition shadow-lg mt-2 flex justify-center items-center gap-2">
                 <Save size={18}/> Save Party Details
               </button>
            </form>
         </div>
      </div>

      {/* Right: List Customers */}
      <div className="flex-1 flex flex-col min-h-0">
         <div className="bg-white p-4 rounded-2xl border border-gray-100 mb-4 flex items-center gap-3">
             <Search className="text-gray-400" size={20}/>
             <input className="flex-1 outline-none text-sm font-medium" placeholder="Search by Name or GSTIN..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
         </div>

         <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 overflow-y-auto pr-2 pb-4">
            {filteredCustomers.map(c => (
               <div key={c.id} className="bg-white p-5 rounded-2xl border border-gray-200 hover:shadow-md transition relative group">
                  <div className="flex justify-between items-start mb-2">
                     <h3 className="font-bold text-gray-900 text-lg">{c.name}</h3>
                     <span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 px-2 py-1 rounded-md uppercase tracking-wider">GST Party</span>
                  </div>
                  <div className="space-y-2 text-sm text-gray-600">
                     <p className="flex items-center gap-2"><FileText size={14} className="text-gray-400"/> <span className="font-mono font-bold">{c.gstin}</span></p>
                     <p className="flex items-center gap-2"><MapPin size={14} className="text-gray-400"/> {c.address || 'No Address'}</p>
                     <p className="flex items-center gap-2"><Phone size={14} className="text-gray-400"/> {c.mobile || 'No Mobile'}</p>
                  </div>
                  <button onClick={() => { if(confirm('Delete customer?')) onDelete(c.id); }} className="absolute top-4 right-4 p-2 text-gray-300 hover:text-rose-500 transition"><Trash2 size={18}/></button>
               </div>
            ))}
            {filteredCustomers.length === 0 && (
               <div className="col-span-full text-center py-20 text-gray-400">
                  <User size={48} className="mx-auto mb-4 opacity-20"/>
                  <p>No parties found.</p>
               </div>
            )}
         </div>
      </div>
    </div>
  );
};