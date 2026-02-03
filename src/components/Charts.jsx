import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import { BarChart3, Users } from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

const Charts = ({ theme }) => {
  const salesData = {
    labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'],
    datasets: [
      {
        label: 'Vendas (R$)',
        data: [12000, 19000, 15000, 25000, 22000, 30000],
        backgroundColor: theme === 'dark' ? 'rgba(59, 130, 246, 0.6)' : 'rgba(59, 130, 246, 0.8)',
        borderColor: theme === 'dark' ? 'rgba(59, 130, 246, 1)' : 'rgba(37, 99, 235, 1)',
        borderWidth: 1,
        borderRadius: 6,
        barThickness: 20,
      },
    ],
  };

  const clientsData = {
    labels: ['João Silva', 'Maria Santos', 'Pedro Costa', 'Ana Oliveira', 'Carlos Lima'],
    datasets: [
      {
        data: [30, 25, 20, 15, 10],
        backgroundColor: [
          theme === 'dark' ? 'rgba(34, 197, 94, 0.6)' : 'rgba(34, 197, 94, 0.8)',
          theme === 'dark' ? 'rgba(59, 130, 246, 0.6)' : 'rgba(59, 130, 246, 0.8)',
          theme === 'dark' ? 'rgba(249, 115, 22, 0.6)' : 'rgba(249, 115, 22, 0.8)',
          theme === 'dark' ? 'rgba(168, 85, 247, 0.6)' : 'rgba(168, 85, 247, 0.8)',
          theme === 'dark' ? 'rgba(239, 68, 68, 0.6)' : 'rgba(239, 68, 68, 0.8)',
        ],
        borderColor: theme === 'dark' ? '#1f2937' : '#ffffff',
        borderWidth: 2,
        hoverOffset: 8,
      },
    ],
  };

  const getChartColors = () => {
    return theme === 'dark' ? {
      textColor: '#e5e7eb',
      gridColor: 'rgba(55, 65, 81, 0.5)',
      tooltipBg: '#1f2937',
      tooltipTitle: '#f9fafb',
      tooltipBody: '#e5e7eb',
      tooltipBorder: '#374151',
    } : {
      textColor: '#374151',
      gridColor: 'rgba(229, 231, 235, 0.7)',
      tooltipBg: '#ffffff',
      tooltipTitle: '#111827',
      tooltipBody: '#374151',
      tooltipBorder: '#e5e7eb',
    };
  };
  
  const colors = getChartColors();

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: colors.tooltipBg,
        titleColor: colors.tooltipTitle,
        bodyColor: colors.tooltipBody,
        borderColor: colors.tooltipBorder,
        borderWidth: 1,
        titleFont: { family: 'Inter, sans-serif', weight: '600' },
        bodyFont: { family: 'Inter, sans-serif' },
        padding: 10,
        cornerRadius: 6,
        boxPadding: 4,
      },
    },
    scales: {
      x: {
        ticks: { color: colors.textColor, font: { family: 'Inter, sans-serif' } },
        grid: { color: colors.gridColor, drawBorder: false },
      },
      y: {
        ticks: { color: colors.textColor, font: { family: 'Inter, sans-serif' }, callback: (value) => `R$ ${value/1000}k` },
        grid: { color: colors.gridColor, drawBorder: false },
      },
    },
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '65%',
    plugins: {
      legend: {
        position: 'right',
        labels: { 
          color: colors.textColor, 
          font: { family: 'Inter, sans-serif', size: 11 }, 
          padding: 15,
          boxWidth: 12,
          usePointStyle: true,
          pointStyle: 'circle',
        },
      },
      tooltip: {
        backgroundColor: colors.tooltipBg,
        titleColor: colors.tooltipTitle,
        bodyColor: colors.tooltipBody,
        borderColor: colors.tooltipBorder,
        borderWidth: 1,
        titleFont: { family: 'Inter, sans-serif', weight: '600' },
        bodyFont: { family: 'Inter, sans-serif' },
        padding: 10,
        cornerRadius: 6,
        boxPadding: 4,
        callbacks: {
          label: function(context) {
            let label = context.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed !== null) {
              label += context.parsed + '%';
            }
            return label;
          }
        }
      },
    },
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
        className="h-full"
      >
        <Card className="h-full flex flex-col shadow-lg border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-foreground flex items-center"><BarChart3 size={20} className="mr-2 text-primary"/>Vendas por Mês</CardTitle>
          </CardHeader>
          <CardContent className="pb-4 flex-grow">
            <div className="h-full min-h-[250px]">
              <Bar data={salesData} options={chartOptions} />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="h-full"
      >
        <Card className="h-full flex flex-col shadow-lg border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-foreground flex items-center"><Users size={20} className="mr-2 text-primary"/>Top Clientes (%)</CardTitle>
          </CardHeader>
          <CardContent className="pb-4 flex-grow">
            <div className="h-full min-h-[250px]">
              <Doughnut data={clientsData} options={doughnutOptions} />
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default Charts;