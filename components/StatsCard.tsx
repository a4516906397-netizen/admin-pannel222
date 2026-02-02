import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  color: 'blue' | 'green' | 'red' | 'purple' | 'orange';
}

const colorStyles = {
  blue: { bg: 'bg-blue-50', text: 'text-blue-600', iconBg: 'bg-blue-100' },
  green: { bg: 'bg-emerald-50', text: 'text-emerald-600', iconBg: 'bg-emerald-100' },
  red: { bg: 'bg-rose-50', text: 'text-rose-600', iconBg: 'bg-rose-100' },
  purple: { bg: 'bg-violet-50', text: 'text-violet-600', iconBg: 'bg-violet-100' },
  orange: { bg: 'bg-orange-50', text: 'text-orange-600', iconBg: 'bg-orange-100' },
};

export const StatsCard: React.FC<StatsCardProps> = ({ title, value, icon: Icon, trend, color }) => {
  const style = colorStyles[color];

  return (
    <div className="bg-white p-5 rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-gray-100 flex items-start justify-between transition-all hover:shadow-[0_4px_20px_rgba(0,0,0,0.06)]">
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">{title}</p>
        <h3 className="text-2xl font-bold text-gray-900">{value}</h3>
        {trend && <p className={`text-xs font-medium mt-2 ${style.text}`}>{trend}</p>}
      </div>
      <div className={`p-3 rounded-xl ${style.bg} ${style.text}`}>
        <Icon size={22} />
      </div>
    </div>
  );
};
