import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Star, TrendingUp, TrendingDown, History, Gift, AlertTriangle } from 'lucide-react';
import { format, parseISO, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { safeJsonParse, formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { configuracaoPontosService } from '@/services/configuracaoPontosService';
import { pontosClienteService } from '@/services/pontosClienteService';
import { vendaService } from '@/services/api';

const PONTOS_POR_REAIS_PADRAO = 50; 
const VALIDADE_PONTOS_MESES_PADRAO = 12;

const ClienteTabPontuacao = ({ clienteId, currentCliente, setCurrentCliente }) => {
  const { toast } = useToast();
  const [configPontos, setConfigPontos] = useState({
    ativo: true,
    pontosPorReais: PONTOS_POR_REAIS_PADRAO,
    validadeMeses: VALIDADE_PONTOS_MESES_PADRAO,
    resgateMinimo: 50, // Pontos mínimos para resgatar
  });
  const [historicoPontuacao, setHistoricoPontuacao] = useState([]);
  const [valorResgate, setValorResgate] = useState('');

  useEffect(() => {
        const loadData = async () => {
    try {
      const configData = await configuracaoPontosService.getConfiguracaoComFallback();
      setConfigPontos({
        ativo: configData.ativo !== undefined ? configData.ativo : true,
        pontosPorReais: configData.pontos_por_reais || PONTOS_POR_REAIS_PADRAO,
        validadeMeses: configData.validade_meses || VALIDADE_PONTOS_MESES_PADRAO,
        resgateMinimo: configData.resgate_minimo || 50,
      });
    } catch (error) {
      console.error('Erro ao carregar configuração de pontos:', error);
    }
        };
        
        loadData();
    }, []);

  useEffect(() => {
        const loadData = async () => {
    if (!clienteId || !currentCliente || !configPontos.ativo) {
      setHistoricoPontuacao([]);
      if (setCurrentCliente && currentCliente.pontos) {
        setCurrentCliente(prev => ({
            ...prev,
            pontos: { ...prev.pontos, saldo_atual: 0, total_ganhos: 0 }
        }));
      }
      return;
    }

    try {
      // Carregar pontos reais do banco de dados
      const pontosResponse = await pontosClienteService.getPontosCliente(clienteId);
      
      if (pontosResponse.success && pontosResponse.data) {
        const pontosReais = pontosResponse.data;
        
        // Atualizar o cliente com os dados reais do banco
        if (setCurrentCliente && currentCliente.pontos) {
          setCurrentCliente(prev => ({
            ...prev,
            pontos: {
              ...prev.pontos,
              total_ganhos: pontosReais.total_pontos_ganhos || 0,
              utilizados: pontosReais.pontos_utilizados || 0,
              expirados: pontosReais.pontos_expirados || 0,
              saldo_atual: pontosReais.saldo_pontos_atual || 0,
            }
          }));
        }

        // Carregar histórico de vendas para mostrar detalhes
        let vendasPDV = [];
        try {
          const vendasResponse = await vendaService.getByCliente(clienteId);
          const todasVendas = vendasResponse.data?.data?.data || vendasResponse.data?.data || [];
          
          if (Array.isArray(todasVendas)) {
            vendasPDV = todasVendas.filter(v => 
              (v.status_pagamento === 'Concluído' || v.status_pagamento === 'Pago' || v.tipo_documento === 'venda')
            );
          }
        } catch (error) {
          console.error('Erro ao carregar vendas do cliente:', error);
        }

        // Criar histórico baseado nas vendas e pontos reais
        const novoHistorico = [];
        let totalGastoConfirmado = 0;

        vendasPDV.forEach(venda => {
          const valorVenda = parseFloat(venda.total || 0);
          totalGastoConfirmado += valorVenda;
          const pontosGanhos = Math.floor(valorVenda / (configPontos.pontosPorReais || PONTOS_POR_REAIS_PADRAO));
          if (pontosGanhos > 0) {
            novoHistorico.push({
              id: `pts-pdv-${venda.id}`,
              data: venda.data_emissao || new Date().toISOString(),
              origem: `Venda PDV #${venda.id}`,
              valorConvertido: valorVenda,
              pontos: pontosGanhos,
              tipo: 'ganho'
            });
          }
        });

        // Adicionar pontos usados se houver
        if (pontosReais.pontos_utilizados > 0) {
          novoHistorico.push({
            id: 'pts-used-obj', 
            data: new Date().toISOString(), 
            origem: 'Resgate(s) anteriores', 
            valorConvertido: 0, 
            pontos: -pontosReais.pontos_utilizados, 
            tipo: 'uso'
          });
        }

        // Adicionar pontos expirados se houver
        if (pontosReais.pontos_expirados > 0) {
          novoHistorico.push({
            id: 'pts-expired-obj', 
            data: new Date().toISOString(), 
            origem: 'Pontos expirados', 
            valorConvertido: 0, 
            pontos: -pontosReais.pontos_expirados, 
            tipo: 'expiracao'
          });
        }

        // Ordenar histórico por data mais recente
        novoHistorico.sort((a, b) => new Date(b.data) - new Date(a.data));
        setHistoricoPontuacao(novoHistorico);
      } else {
        console.error('Erro ao carregar pontos do cliente:', pontosResponse);
        setHistoricoPontuacao([]);
      }
    } catch (error) {
      console.error('Erro ao carregar dados de pontos:', error);
      setHistoricoPontuacao([]);
    }
        };
        
        loadData();
    }, [clienteId, currentCliente, configPontos.ativo, setCurrentCliente]);

  const handleResgatarPontos = async () => {
    const pontosParaResgatar = parseInt(valorResgate, 10);
    if (isNaN(pontosParaResgatar) || pontosParaResgatar <= 0) {
      toast({ title: "Valor Inválido", description: "Insira um valor de pontos válido para resgatar.", variant: "destructive" });
      return;
    }
    if (pontosParaResgatar < configPontos.resgateMinimo) {
      toast({ title: "Resgate Mínimo", description: `O mínimo para resgate é de ${configPontos.resgateMinimo} pontos.`, variant: "destructive" });
      return;
    }
    if (pontosParaResgatar > (currentCliente.pontos?.saldo_atual || 0)) {
      toast({ title: "Saldo Insuficiente", description: "Você não tem pontos suficientes para este resgate.", variant: "destructive" });
      return;
    }

    try {
      // Chamar API para resgatar pontos
      const response = await pontosClienteService.resgatarPontos(clienteId, pontosParaResgatar);
      
      if (response.success) {
        // Atualizar cliente com novos dados
        if (setCurrentCliente) {
          setCurrentCliente(prev => ({
            ...prev,
            pontos: {
              ...prev.pontos,
              utilizados: response.data.pontos_utilizados_total || 0,
              saldo_atual: response.data.saldo_pontos_atual || 0,
            }
          }));
        }
        
        // Atualizar histórico
        setHistoricoPontuacao(prevHist => ([
          { id: `pts-resg-${Date.now()}`, data: new Date().toISOString(), origem: `Resgate de ${pontosParaResgatar} pontos`, valorConvertido: 0, pontos: -pontosParaResgatar, tipo: 'uso' },
          ...prevHist
        ].sort((a, b) => new Date(b.data) - new Date(a.data))));

        toast({ title: "Resgate Realizado!", description: `${pontosParaResgatar} pontos foram resgatados com sucesso.` });
        setValorResgate('');
      } else {
        toast({ title: "Erro no Resgate", description: response.message || "Erro ao resgatar pontos.", variant: "destructive" });
      }
    } catch (error) {
      console.error('Erro ao resgatar pontos:', error);
      toast({ title: "Erro no Resgate", description: "Erro ao processar resgate de pontos.", variant: "destructive" });
    }
  };


  const formatDate = (dateString) => {
    try {
      const date = parseISO(dateString);
      if (!isValid(date)) return "Data inválida";
      return format(date, "dd/MM/yyyy", { locale: ptBR });
    } catch (error) {
      return "Data inválida";
    }
  };
  
  if (!clienteId) {
    return <div className="p-4 text-center text-muted-foreground">Selecione um cliente para ver o programa de pontos.</div>;
  }

  if (!configPontos.ativo) {
    return (
      <Card className="mt-4 bg-yellow-50 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-700">
        <CardContent className="p-4 text-sm text-yellow-700 dark:text-yellow-300 flex items-center">
          <AlertTriangle size={20} className="mr-2"/> O programa de pontos está desativado no momento.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pontos Atuais</CardTitle>
            <Star className="h-5 w-5 text-white/80" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{currentCliente.pontos?.saldo_atual || 0}</div>
            <p className="text-xs text-white/90">Disponíveis para resgate</p>
          </CardContent>
        </Card>
        <Card className="shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Ganhos</CardTitle>
            <TrendingUp className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{currentCliente.pontos?.total_ganhos || 0}</div>
            <p className="text-xs text-muted-foreground">Desde o início</p>
          </CardContent>
        </Card>
        <Card className="shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Utilizados</CardTitle>
            <Gift className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{currentCliente.pontos?.utilizados || 0}</div>
            <p className="text-xs text-muted-foreground">Total de pontos já resgatados</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
            <CardTitle className="text-lg">Resgatar Pontos</CardTitle>
        </CardHeader>
        <CardContent className="flex items-end gap-2">
            <div className="flex-grow">
                <label htmlFor="resgate-pontos" className="text-sm font-medium">Pontos para resgatar</label>
                <Input 
                    id="resgate-pontos"
                    type="number"
                    value={valorResgate}
                    onChange={(e) => setValorResgate(e.target.value)}
                    placeholder={`Mínimo ${configPontos.resgateMinimo} pontos`}
                    min="0"
                />
            </div>
            <Button onClick={handleResgatarPontos} disabled={!valorResgate || (currentCliente.pontos?.saldo_atual || 0) < configPontos.resgateMinimo}>
                <Gift size={16} className="mr-2"/> Resgatar
            </Button>
        </CardContent>
      </Card>

      <div>
        <h3 className="text-lg font-medium mb-3 flex items-center">
          <History size={20} className="mr-2 text-primary" /> Histórico de Pontuação
        </h3>
        {historicoPontuacao.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
            <Star size={48} className="mb-4 opacity-50" />
            <p>Nenhum histórico de pontuação encontrado.</p>
          </div>
        ) : (
          <ScrollArea className="h-[300px] rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Origem</TableHead>
                  <TableHead className="text-right">Valor Convertido</TableHead>
                  <TableHead className="text-right">Pontos</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {historicoPontuacao.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{formatDate(item.data)}</TableCell>
                    <TableCell>{item.origem}</TableCell>
                    <TableCell className="text-right">
                      {item.valorConvertido > 0 ? formatCurrency(item.valorConvertido) : '-'}
                    </TableCell>
                    <TableCell className={`text-right font-medium ${item.pontos > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {item.pontos > 0 ? `+${item.pontos}` : item.pontos}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
      </div>
      <Card className="mt-4 bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700">
        <CardContent className="p-4 text-sm text-blue-700 dark:text-blue-300">
          <p><span className="font-semibold">Regra de Pontuação:</span> A cada {formatCurrency(configPontos.pontosPorReais || PONTOS_POR_REAIS_PADRAO)} em compras confirmadas, o cliente ganha 1 ponto. Pontos expiram em {configPontos.validadeMeses || VALIDADE_PONTOS_MESES_PADRAO} meses. Resgate mínimo de {configPontos.resgateMinimo} pontos.</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default ClienteTabPontuacao;