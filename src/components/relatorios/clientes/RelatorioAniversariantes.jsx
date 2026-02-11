import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Calendar, 
  Gift, 
  Loader2,
  Mail,
  Phone,
  MapPin,
  FileDown
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/components/ui/use-toast';
import api from '@/services/api';
import { formatCurrency } from '@/lib/utils';
import * as XLSX from 'xlsx';

const RelatorioAniversariantes = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [dados, setDados] = useState(null);
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [ano, setAno] = useState(new Date().getFullYear());

  useEffect(() => {
    carregarDados();
  }, [mes, ano]);

  const carregarDados = async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/clientes/relatorio/aniversariantes-mes', {
        params: {
          mes: mes,
          ano: ano
        }
      });

      if (response.data.success) {
        setDados(response.data.data);
      } else {
        throw new Error(response.data.message || 'Erro ao carregar dados');
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast({
        title: "Erro",
        description: error.response?.data?.message || "Não foi possível carregar os dados do relatório.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const exportarExcel = () => {
    if (!dados || !dados.clientes) return;
    
    const wb = XLSX.utils.book_new();
    
    const data = [
      ['Relatório de Aniversariantes do Mês'],
      [`Mês: ${mes}/${ano}`],
      [],
      ['Nome', 'Tipo', 'Data de Nascimento/Abertura', 'Dia', 'Idade/Anos', 'Email', 'Telefone', 'WhatsApp', 'Cidade', 'Estado']
    ];
    
    dados.clientes.forEach(cliente => {
      data.push([
        cliente.nome,
        cliente.tipo_pessoa,
        format(parseISO(cliente.data_nascimento_abertura), 'dd/MM/yyyy', { locale: ptBR }),
        cliente.dia_aniversario,
        cliente.idade !== null ? cliente.idade : cliente.anos_empresa || '-',
        cliente.email || '-',
        cliente.telefone || '-',
        cliente.whatsapp || '-',
        cliente.cidade || '-',
        cliente.estado || '-'
      ]);
    });
    
    const ws = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'Aniversariantes');
    XLSX.writeFile(wb, `aniversariantes-${mes}-${ano}.xlsx`);
    
    toast({
      title: "Sucesso",
      description: "Relatório exportado com sucesso!",
    });
  };

  const meses = [
    { value: 1, label: 'Janeiro' },
    { value: 2, label: 'Fevereiro' },
    { value: 3, label: 'Março' },
    { value: 4, label: 'Abril' },
    { value: 5, label: 'Maio' },
    { value: 6, label: 'Junho' },
    { value: 7, label: 'Julho' },
    { value: 8, label: 'Agosto' },
    { value: 9, label: 'Setembro' },
    { value: 10, label: 'Outubro' },
    { value: 11, label: 'Novembro' },
    { value: 12, label: 'Dezembro' }
  ];

  const anos = [];
  const anoAtual = new Date().getFullYear();
  for (let i = anoAtual - 5; i <= anoAtual + 1; i++) {
    anos.push(i);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Carregando relatório...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Mês</label>
              <Select value={mes.toString()} onValueChange={(value) => setMes(parseInt(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {meses.map((m) => (
                    <SelectItem key={m.value} value={m.value.toString()}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Ano</label>
              <Select value={ano.toString()} onValueChange={(value) => setAno(parseInt(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {anos.map((a) => (
                    <SelectItem key={a} value={a.toString()}>
                      {a}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button onClick={exportarExcel} className="w-full">
                <FileDown className="mr-2 h-4 w-4" />
                Exportar Excel
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resumo */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5" />
            Aniversariantes do Mês
          </CardTitle>
          <CardDescription>
            {meses.find(m => m.value === mes)?.label} de {ano}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <p className="text-2xl font-bold">{dados?.total || 0}</p>
            <p className="text-sm text-muted-foreground">Total de aniversariantes</p>
          </div>

          {dados && dados.clientes && dados.clientes.length > 0 ? (
            <ScrollArea className="h-[600px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Dia</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Idade/Anos</TableHead>
                    <TableHead>Contato</TableHead>
                    <TableHead>Localização</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dados.clientes.map((cliente, index) => (
                    <TableRow key={cliente.id || index}>
                      <TableCell>
                        <Badge variant="outline" className="text-lg font-bold">
                          {cliente.dia_aniversario}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{cliente.nome}</TableCell>
                      <TableCell>
                        <Badge variant={cliente.tipo_pessoa === 'Pessoa Jurídica' ? 'secondary' : 'default'}>
                          {cliente.tipo_pessoa}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {format(parseISO(cliente.data_nascimento_abertura), 'dd/MM/yyyy', { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        {cliente.idade !== null ? `${cliente.idade} anos` : cliente.anos_empresa ? `${cliente.anos_empresa} anos` : '-'}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {cliente.email && (
                            <div className="flex items-center gap-1 text-sm">
                              <Mail className="h-3 w-3" />
                              <span>{cliente.email}</span>
                            </div>
                          )}
                          {cliente.telefone && (
                            <div className="flex items-center gap-1 text-sm">
                              <Phone className="h-3 w-3" />
                              <span>{cliente.telefone}</span>
                            </div>
                          )}
                          {cliente.whatsapp && (
                            <div className="flex items-center gap-1 text-sm text-green-600">
                              <Phone className="h-3 w-3" />
                              <span>{cliente.whatsapp}</span>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {cliente.cidade || cliente.estado ? (
                          <div className="flex items-center gap-1 text-sm">
                            <MapPin className="h-3 w-3" />
                            <span>{[cliente.cidade, cliente.estado].filter(Boolean).join(' - ')}</span>
                          </div>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum aniversariante encontrado para este mês.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default RelatorioAniversariantes;
