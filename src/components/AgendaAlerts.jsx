import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Clock, AlertTriangle, CheckCircle, Package, CalendarDays } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format, isToday, parseISO } from 'date-fns';
import { apiDataManager } from '@/lib/apiDataManager';

const AgendaAlerts = () => {
  const [alerts, setAlerts] = useState([]);
  const [date, setDate] = useState(new Date());

  useEffect(() => {
        const loadData = async () => {
    const loadAlerts = async () => {
      const osSalvas = await apiDataManager.getDataAsArray('ordens_servico_salvas');
      const envelopamentosSalvos = await apiDataManager.getDataAsArray('envelopamentosOrcamentos');

    const osAlerts = osSalvas
      .filter(os => os.dados_producao?.prazo_estimado && isToday(parseISO(os.dados_producao.prazo_estimado)))
      .map(os => ({
        id: `os-${os.id_os}`,
        type: 'delivery',
        title: `Entrega OS: ${os.id_os ? String(os.id_os).slice(-6) : 'N/A'}`,
        subTitle: os.cliente?.nome_completo || os.cliente?.nome || os.cliente?.apelido_fantasia || os.cliente_info?.nome || os.cliente_nome_manual || 'Cliente não informado',
        time: format(parseISO(os.dados_producao.prazo_estimado), 'HH:mm'),
        icon: Package,
        color: 'text-blue-600 dark:text-blue-400',
        bgColor: 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700'
      }));

    const envAlerts = envelopamentosSalvos
      .filter(env => env.prazo_entrega && isToday(parseISO(env.prazo_entrega)))
      .map(env => ({
        id: `env-${env.id}`,
        type: 'delivery',
                        title: `Entrega Envelopamento: ${env.id ? String(env.id).slice(-6) : 'N/A'}`,
        subTitle: env.cliente?.nome || 'Cliente não informado',
        time: format(parseISO(env.prazo_entrega), 'HH:mm'),
        icon: Package,
        color: 'text-purple-600 dark:text-purple-400',
        bgColor: 'bg-purple-50 dark:bg-purple-900/30 border-purple-200 dark:border-purple-700'
      }));
      
      const combinedAlerts = [...osAlerts, ...envAlerts].sort((a,b) => a.time.localeCompare(b.time));
      setAlerts(combinedAlerts);
    };

    loadAlerts();
  
        };
        
        loadData();
    }, []);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="h-full"
      >
        <Card className="h-full flex flex-col shadow-lg border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-foreground flex items-center"><CalendarDays size={20} className="mr-2 text-primary"/>Calendário</CardTitle>
          </CardHeader>
          <CardContent className="p-0 flex-grow flex items-center justify-center">
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              className="p-0 [&_td]:w-10 [&_td]:h-10 [&_th]:w-10"
            />
          </CardContent>
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="h-full"
      >
        <Card className="h-full flex flex-col shadow-lg border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-foreground flex items-center"><AlertTriangle size={20} className="mr-2 text-primary"/>Alertas de Hoje</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 flex-grow overflow-hidden p-4">
            {alerts.length > 0 ? (
              <ScrollArea className="h-full pr-2">
                {alerts.map((alert, index) => (
                  <motion.div
                    key={alert.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    className={`flex items-center space-x-3 p-3 rounded-lg ${alert.bgColor} border mb-2`}
                  >
                    <alert.icon className={`h-5 w-5 ${alert.color}`} />
                    <div className="flex-1">
                      <p className="font-medium text-sm text-foreground">{alert.title}</p>
                      <p className="text-xs text-muted-foreground">{alert.subTitle}</p>
                    </div>
                    <p className="text-xs font-semibold text-foreground">{alert.time}</p>
                  </motion.div>
                ))}
              </ScrollArea>
            ) : (
              <div className="text-center py-8 flex flex-col items-center justify-center h-full">
                <Clock className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground text-sm">Sem alertas para hoje.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default AgendaAlerts;