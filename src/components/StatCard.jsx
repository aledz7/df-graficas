import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';

const StatCard = ({ title, value, icon: Icon, color, trend, subtext }) => {
  const colorClasses = {
    green: 'from-green-500 to-green-600 dark:from-green-600 dark:to-green-700',
    blue: 'from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700',
    orange: 'from-orange-500 to-orange-600 dark:from-orange-600 dark:to-orange-700',
    red: 'from-red-500 to-red-600 dark:from-red-600 dark:to-red-700',
    purple: 'from-purple-500 to-purple-600 dark:from-purple-600 dark:to-purple-700',
    indigo: 'from-indigo-500 to-indigo-600 dark:from-indigo-600 dark:to-indigo-700'
  };
  
  const iconBgColors = {
    green: 'bg-green-400/30 dark:bg-green-500/40',
    blue: 'bg-blue-400/30 dark:bg-blue-500/40',
    orange: 'bg-orange-400/30 dark:bg-orange-500/40',
    red: 'bg-red-400/30 dark:bg-red-500/40',
    purple: 'bg-purple-400/30 dark:bg-purple-500/40',
    indigo: 'bg-indigo-400/30 dark:bg-indigo-500/40'
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      whileHover={{ scale: 1.03, y: -3, boxShadow: "0px 10px 20px rgba(0,0,0,0.1)" }}
      className="h-full"
    >
      <Card className={`h-full bg-gradient-to-br ${colorClasses[color]} text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden relative`}>
        <div className={`absolute -top-4 -right-4 w-20 h-20 ${iconBgColors[color]} rounded-full opacity-50 blur-md`}></div>
        <CardContent className="p-5 relative z-10 flex flex-col justify-between h-full">
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className={`text-white/90 text-sm font-medium`}>{title}</p>
              <div className={`${iconBgColors[color]} p-2.5 rounded-lg`}>
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