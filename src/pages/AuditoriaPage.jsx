import React, { useState, useEffect } from 'react';
import { useAuditoria } from '@/hooks/useAuditoria';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format, parseISO } from 'date-fns';
import { Eye, Filter, ListChecks } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { safeJsonParse } from '@/lib/utils';
import { apiDataManager } from '@/lib/apiDataManager';

const AuditoriaDetalhesModal = ({ log, isOpen, onClose }) => {
  if (!log) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Detalhes do Log de Auditoria</DialogTitle>
          <DialogDescription>Log ID: {log.id_log}</DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] p-1">
          <div className="space-y-3 text-sm">
            <p><strong>Timestamp:</strong> {format(parseISO(log.timestamp), 'dd/MM/yyyy HH:mm:ss')}</p>
            <p><strong>Usuário:</strong> {log.usuario_nome} (ID: {log.usuario_id})</p>
            <p><strong>Ação:</strong> {log.acao}</p>
            <p><strong>Entidade:</strong> {log.tipo_entidade} (ID: {log.id_entidade})</p>
            {log.justificativa && <p><strong>Justificativa:</strong> {log.justificativa}</p>}
            
            {log.detalhes_anteriores && (
              <div>
                <h4 className="font-semibold mt-2">Dados Anteriores:</h4>
                <pre className="bg-muted p-2 rounded-md text-xs overflow-auto max-h-40">{JSON.stringify(log.detalhes_anteriores, null, 2)}</pre>
              </div>
            )}
            {log.detalhes_posteriores && (
              <div>
                <h4 className="font-semibold mt-2">Dados Posteriores:</h4>
                <pre className="bg-muted p-2 rounded-md text-xs overflow-auto max-h-40">{JSON.stringify(log.detalhes_posteriores, null, 2)}</pre>
              </div>
            )}
          </div>
        </ScrollArea>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Fechar</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};


const AuditoriaPage = () => {
  const { registrosAuditoria: registrosIniciais } = useAuditoria();
  const [registrosAuditoria, setRegistrosAuditoria] = useState([]);
  const [filtros, setFiltros] = useState({
    usuario: 'todos',
    acao: 'todas',
    tipo_entidade: 'todas',
    dataInicio: '',
    dataFim: '',
  });
  const [logSelecionado, setLogSelecionado] = useState(null);
  const [isDetalhesModalOpen, setIsDetalhesModalOpen] = useState(false);

  useEffect(() => {
        const loadData = async () => {
    const storedLogs = safeJsonParse(await apiDataManager.getItem('registros_auditoria'), []);
    setRegistrosAuditoria(storedLogs);
  
        };
        
        loadData();
    }, [registrosIniciais]);


  const usuariosUnicos = [...new Set(registrosAuditoria.map(log => log.usuario_nome).filter(Boolean))];
  const acoesUnicas = [...new Set(registrosAuditoria.map(log => log.acao).filter(Boolean))];
  const entidadesUnicas = [...new Set(registrosAuditoria.map(log => log.tipo_entidade).filter(Boolean))];

  const handleFiltroChange = (campo, valor) => {
    setFiltros(prev => ({ ...prev, [campo]: valor }));
  };

  const registrosFiltrados = registrosAuditoria.filter(log => {
    if (!log || !log.timestamp) return false; 
    const timestampLog = parseISO(log.timestamp);
    const dataInicioFiltro = filtros.dataInicio ? parseISO(filtros.dataInicio) : null;
    const dataFimFiltro = filtros.dataFim ? parseISO(filtros.dataFim) : null;

    return (
      (filtros.usuario && filtros.usuario !== 'todos' ? log.usuario_nome === filtros.usuario : true) &&
      (filtros.acao && filtros.acao !== 'todas' ? log.acao === filtros.acao : true) &&
      (filtros.tipo_entidade && filtros.tipo_entidade !== 'todas' ? log.tipo_entidade === filtros.tipo_entidade : true) &&
      (dataInicioFiltro ? timestampLog >= dataInicioFiltro : true) &&
      (dataFimFiltro ? timestampLog <= dataFimFiltro : true)
    );
  });
  
  const handleVerDetalhes = (log) => {
    setLogSelecionado(log);
    setIsDetalhesModalOpen(true);
  };

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-3">
             <ListChecks size={32} className="text-primary" />
            <div>
                <CardTitle className="text-2xl font-bold">Logs de Auditoria</CardTitle>
                <CardDescription>Acompanhe as ações realizadas no sistema.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-6 p-4 border rounded-lg bg-slate-50 dark:bg-slate-800 shadow">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 items-end">
              <div className="space-y-1">
                <label htmlFor="filtro-usuario" className="text-sm font-medium">Usuário</label>
                <Select value={filtros.usuario} onValueChange={(val) => handleFiltroChange('usuario', val)}>
                  <SelectTrigger id="filtro-usuario"><SelectValue placeholder="Todos" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    {usuariosUnicos.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label htmlFor="filtro-acao" className="text-sm font-medium">Ação</label>
                <Select value={filtros.acao} onValueChange={(val) => handleFiltroChange('acao', val)}>
                  <SelectTrigger id="filtro-acao"><SelectValue placeholder="Todas" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas</SelectItem>
                    {acoesUnicas.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label htmlFor="filtro-entidade" className="text-sm font-medium">Entidade</label>
                <Select value={filtros.tipo_entidade} onValueChange={(val) => handleFiltroChange('tipo_entidade', val)}>
                  <SelectTrigger id="filtro-entidade"><SelectValue placeholder="Todas" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas</SelectItem>
                    {entidadesUnicas.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label htmlFor="filtro-dataInicio" className="text-sm font-medium">Data Início</label>
                <Input id="filtro-dataInicio" type="date" value={filtros.dataInicio} onChange={(e) => handleFiltroChange('dataInicio', e.target.value)} />
              </div>
              <div className="space-y-1">
                <label htmlFor="filtro-dataFim" className="text-sm font-medium">Data Fim</label>
                <Input id="filtro-dataFim" type="date" value={filtros.dataFim} onChange={(e) => handleFiltroChange('dataFim', e.target.value)} />
              </div>
            </div>
          </div>

          <ScrollArea className="h-[60vh]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data/Hora</TableHead>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Ação</TableHead>
                  <TableHead>Entidade</TableHead>
                  <TableHead>ID Entidade</TableHead>
                  <TableHead>Justificativa</TableHead>
                  <TableHead className="text-right">Detalhes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {registrosFiltrados.length > 0 ? registrosFiltrados.map(log => (
                  <TableRow key={log.id_log}>
                    <TableCell className="text-xs">{format(parseISO(log.timestamp), 'dd/MM/yy HH:mm')}</TableCell>
                    <TableCell>{log.usuario_nome}</TableCell>
                    <TableCell className="text-xs">{log.acao}</TableCell>
                    <TableCell>{log.tipo_entidade}</TableCell>
                    <TableCell className="text-xs">{log.id_entidade?.toString().slice(0,15)}</TableCell>
                    <TableCell className="text-xs max-w-[150px] truncate">{log.justificativa || '-'}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => handleVerDetalhes(log)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      Nenhum registro encontrado com os filtros aplicados.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
      
      <AuditoriaDetalhesModal 
        log={logSelecionado} 
        isOpen={isDetalhesModalOpen} 
        onClose={() => setIsDetalhesModalOpen(false)} 
      />
    </div>
  );
};

export default AuditoriaPage;