import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';

const StatCard = ({ title, value, icon: Icon, color, trend, subtext }) => {
  // Verifica se é uma cor hex personalizada
  const isHexColor = (c) => /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(c);
  const isCustomColor = isHexColor(color);

  // Função para escurecer uma cor hex
  const darkenColor = (hex, percent = 10) => {
    const num = parseInt(hex.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.max((num >> 16) - amt, 0);
    const G = Math.max((num >> 8 & 0x00FF) - amt, 0);
    const B = Math.max((num & 0x0000FF) - amt, 0);
    return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
  };

  const colorClasses = {
    green: 'from-green-500 to-green-600 dark:from-green-600 dark:to-green-700',
    blue: 'from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700',
    orange: 'from-orange-500 to-orange-600 dark:from-orange-600 dark:to-orange-700',
    red: 'from-red-500 to-red-600 dark:from-red-600 dark:to-red-700',
    purple: 'from-purple-500 to-purple-600 dark:from-purple-600 dark:to-purple-700',
    indigo: 'from-indigo-500 to-indigo-600 dark:from-indigo-600 dark:to-indigo-700',
    pink: 'from-pink-500 to-pink-600 dark:from-pink-600 dark:to-pink-700',
    amber: 'from-amber-500 to-amber-600 dark:from-amber-600 dark:to-amber-700',
    yellow: 'from-yellow-500 to-yellow-600 dark:from-yellow-600 dark:to-yellow-700',
    lime: 'from-lime-500 to-lime-600 dark:from-lime-600 dark:to-lime-700',
    emerald: 'from-emerald-500 to-emerald-600 dark:from-emerald-600 dark:to-emerald-700',
    teal: 'from-teal-500 to-teal-600 dark:from-teal-600 dark:to-teal-700',
    cyan: 'from-cyan-500 to-cyan-600 dark:from-cyan-600 dark:to-cyan-700',
    sky: 'from-sky-500 to-sky-600 dark:from-sky-600 dark:to-sky-700',
    violet: 'from-violet-500 to-violet-600 dark:from-violet-600 dark:to-violet-700',
    fuchsia: 'from-fuchsia-500 to-fuchsia-600 dark:from-fuchsia-600 dark:to-fuchsia-700',
    rose: 'from-rose-500 to-rose-600 dark:from-rose-600 dark:to-rose-700',
    slate: 'from-slate-500 to-slate-600 dark:from-slate-600 dark:to-slate-700',
    gray: 'from-gray-500 to-gray-600 dark:from-gray-600 dark:to-gray-700',
    zinc: 'from-zinc-500 to-zinc-600 dark:from-zinc-600 dark:to-zinc-700',
    black: 'from-zinc-800 to-zinc-900 dark:from-zinc-900 dark:to-black',
  };
  
  const iconBgColors = {
    green: 'bg-green-400/30 dark:bg-green-500/40',
    blue: 'bg-blue-400/30 dark:bg-blue-500/40',
    orange: 'bg-orange-400/30 dark:bg-orange-500/40',
    red: 'bg-red-400/30 dark:bg-red-500/40',
    purple: 'bg-purple-400/30 dark:bg-purple-500/40',
    indigo: 'bg-indigo-400/30 dark:bg-indigo-500/40',
    pink: 'bg-pink-400/30 dark:bg-pink-500/40',
    amber: 'bg-amber-400/30 dark:bg-amber-500/40',
    yellow: 'bg-yellow-400/30 dark:bg-yellow-500/40',
    lime: 'bg-lime-400/30 dark:bg-lime-500/40',
    emerald: 'bg-emerald-400/30 dark:bg-emerald-500/40',
    teal: 'bg-teal-400/30 dark:bg-teal-500/40',
    cyan: 'bg-cyan-400/30 dark:bg-cyan-500/40',
    sky: 'bg-sky-400/30 dark:bg-sky-500/40',
    violet: 'bg-violet-400/30 dark:bg-violet-500/40',
    fuchsia: 'bg-fuchsia-400/30 dark:bg-fuchsia-500/40',
    rose: 'bg-rose-400/30 dark:bg-rose-500/40',
    slate: 'bg-slate-400/30 dark:bg-slate-500/40',
    gray: 'bg-gray-400/30 dark:bg-gray-500/40',
    zinc: 'bg-zinc-400/30 dark:bg-zinc-500/40',
    black: 'bg-zinc-600/30 dark:bg-zinc-700/40',
  };

  // Estilo para cor customizada
  const customStyle = isCustomColor ? {
    background: `linear-gradient(to bottom right, ${color}, ${darkenColor(color, 15)})`,
  } : {};

  const customIconBgStyle = isCustomColor ? {
    backgroundColor: `${color}50`, // 50 = 31% opacity em hex
  } : {};

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      whileHover={{ scale: 1.03, y: -3, boxShadow: "0px 10px 20px rgba(0,0,0,0.1)" }}
      className="h-full"
    >
      <Card 
        className={`h-full ${!isCustomColor ? `bg-gradient-to-br ${colorClasses[color] || colorClasses.gray}` : ''} text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden relative`}
        style={customStyle}
      >
        <div 
          className={`absolute -top-4 -right-4 w-20 h-20 ${!isCustomColor ? iconBgColors[color] || iconBgColors.gray : ''} rounded-full opacity-50 blur-md`}
          style={customIconBgStyle}
        ></div>
        <CardContent className="p-5 relative z-10 flex flex-col justify-between h-full">
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className={`text-white/90 text-sm font-medium`}>{title}</p>
              <div 
                className={`${!isCustomColor ? iconBgColors[color] || iconBgColors.gray : ''} p-2.5 rounded-lg`}
                style={customIconBgStyle}
              >
                <Icon className="h-5 w-5 text-white" />
              </div>
            </div>
            <p className="text-3xl font-bold text-white">{value}</p>
          </div>
          {(trend || subtext) && (
            <div className="mt-2 pt-2 border-t border-white/20">
              {trend && <p className={`text-white/80 text-xs`}>{trend}</p>}
              {subtext && <p className={`text-white/80 text-xs mt-0.5`}>{subtext}</p>}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default StatCard;