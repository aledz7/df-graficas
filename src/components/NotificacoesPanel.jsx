import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Bell, 
  Package, 
  AlertTriangle, 
  CheckCircle, 
  X, 
  Trash2,
  Clock,
  Check,
  ExternalLink,
  RefreshCw,
  TrendingDown
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { notificacaoService } from '@/services/notificacaoService';
import { useToast } from '@/components/ui/use-toast';

const NotificacoesPanel = ({ isOpen, onClose, notificacoes = [], loading = false, marcarComoLida, marcarTodasComoLidas, deletarNotificacao, onNotificacaoClick, executarVerificacoes }) => {
  const { toast } = useToast();
  const [executando, setExecutando] = useState(false);

  // As notificações agora vêm como props do hook

  // As funções agora vêm como props do hook

  const getIconeNotificacao = (tipo) => {
    switch (tipo) {
      case 'estoque_baixo':
        return <Package className="h-4 w-4 text-orange-500" />;
      case 'atraso':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'cliente_inativo':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'cliente_diminuindo_compras':
        return <TrendingDown className="h-4 w-4 text-orange-500" />;
      case 'meta_proxima':
        return <CheckCircle className="h-4 w-4 text-blue-500" />;
      case 'nivel_alcancado':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'alerta':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'sucesso':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return <Bell className="h-4 w-4 text-blue-500" />;
    }
  };

  const getCorPrioridade = (prioridade) => {
    switch (prioridade) {
      case 'alta':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'media':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'baixa':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const notificacoesNaoLidas = notificacoes.filter(notif => !notif.lida);

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0, x: 300 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 300 }}
      transition={{ duration: 0.3 }}
      className="fixed right-0 top-0 h-full w-96 bg-background border-l shadow-xl z-50"
    >
      <Card className="h-full rounded-none border-0">
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notificações
              {notificacoesNaoLidas.length > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {notificacoesNaoLidas.length}
                </Badge>
              )}
            </CardTitle>
            <div className="flex items-center gap-2">
              {executarVerificacoes && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={async () => {
                    setExecutando(true);
                    try {
                      await executarVerificacoes();
                    } finally {
                      setExecutando(false);
                    }
                  }}
                  disabled={executando}
                  className="text-xs"
                >
                  <RefreshCw className={`h-3 w-3 mr-1 ${executando ? 'animate-spin' : ''}`} />
                  Verificar
                </Button>
              )}
              {notificacoesNaoLidas.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={marcarTodasComoLidas}
                  className="text-xs"
                >
                  <Check className="h-3 w-3 mr-1" />
                  Marcar todas
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0 h-full">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-3">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : notificacoes.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhuma notificação</p>
                </div>
              ) : (
                <AnimatePresence>
                  {notificacoes.map((notificacao) => (
                    <motion.div
                      key={notificacao.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className={`p-3 rounded-lg border transition-all ${
                        notificacao.lida 
                          ? 'bg-muted/50 opacity-75' 
                          : 'bg-background shadow-sm'
                      }`}
                    >
                      <div 
                        className={`flex items-start gap-3 ${
                          notificacao.tipo === 'pre_venda' && onNotificacaoClick ? 'cursor-pointer hover:opacity-80' : ''
                        }`}
                        onClick={() => {
                          if (notificacao.tipo === 'pre_venda' && onNotificacaoClick) {
                            // Extrair o ID da venda da mensagem (formato: "Pré-venda #XXX - ...")
                            const match = notificacao.mensagem?.match(/#(\d+)/);
                            const vendaId = match ? match[1] : null;
                            onNotificacaoClick(notificacao, vendaId);
                          }
                        }}
                      >
                        <div className="flex-shrink-0 mt-1">
                          {getIconeNotificacao(notificacao.tipo)}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <h4 className={`font-medium text-sm ${
                                notificacao.lida ? 'text-muted-foreground' : 'text-foreground'
                              }`}>
                                {notificacao.titulo}
                                {notificacao.tipo === 'pre_venda' && onNotificacaoClick && (
                                  <ExternalLink className="inline h-3 w-3 ml-1 text-blue-500" />
                                )}
                              </h4>
                              <p className={`text-xs mt-1 ${
                                notificacao.lida ? 'text-muted-foreground' : 'text-muted-foreground'
                              }`}>
                                {notificacao.mensagem}
                              </p>
                              
                              <div className="flex items-center gap-2 mt-2">
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Clock className="h-3 w-3" />
                                  {formatDistanceToNow(new Date(notificacao.data_criacao), {
                                    addSuffix: true,
                                    locale: ptBR
                                  })}
                                </div>
                                
                                <Badge 
                                  variant="secondary" 
                                  className={`text-xs ${getCorPrioridade(notificacao.prioridade)}`}
                                >
                                  {notificacao.prioridade}
                                </Badge>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-1">
                              {!notificacao.lida && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => marcarComoLida && marcarComoLida(notificacao.id)}
                                  className="h-6 w-6 p-0"
                                >
                                  <Check className="h-3 w-3" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deletarNotificacao && deletarNotificacao(notificacao.id)}
                                className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default NotificacoesPanel; 