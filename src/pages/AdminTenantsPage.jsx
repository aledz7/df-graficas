import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Building2, Search, Eye, Pencil, Lock, Unlock, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { adminTenantService } from '@/services/adminTenantService';
import AdminLayout from '@/components/admin/AdminLayout';

const formatDate = (dateStr) => (!dateStr ? '—' : new Date(dateStr).toLocaleDateString('pt-BR'));

export default function AdminTenantsPage() {
  const { toast } = useToast();
  const [tenants, setTenants] = useState([]);
  const [pagination, setPagination] = useState({ current_page: 1, last_page: 1, total: 0, per_page: 15 });
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ ativo: '', plano: '', search: '' });
  const [detailTenant, setDetailTenant] = useState(null);
  const [editTenant, setEditTenant] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const loadTenants = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = { page, per_page: 15 };
      if (filters.ativo !== '' && filters.ativo !== null) params.ativo = filters.ativo === 'true';
      if (filters.plano) params.plano = filters.plano;
      if (filters.search) params.search = filters.search;
      const res = await adminTenantService.getTenants(params);
      if (res.success && res.data) {
        const data = res.data;
        setTenants(Array.isArray(data.data) ? data.data : []);
        setPagination({ current_page: data.current_page ?? 1, last_page: data.last_page ?? 1, total: data.total ?? 0, per_page: data.per_page ?? 15 });
      } else setTenants([]);
    } catch (err) {
      toast({ title: 'Erro', description: err.response?.data?.message || 'Não foi possível carregar os tenants.', variant: 'destructive' });
      setTenants([]);
    } finally {
      setLoading(false);
    }
  }, [filters.ativo, filters.plano, filters.search, toast]);

  useEffect(() => { loadTenants(pagination.current_page); }, [loadTenants]);

  const handleApplyFilters = () => { setPagination((p) => ({ ...p, current_page: 1 })); loadTenants(1); };

  const handleViewDetail = async (tenant) => {
    try {
      const res = await adminTenantService.getTenant(tenant.id);
      if (res.success && res.data) { setDetailTenant(res.data); setDetailOpen(true); }
    } catch (err) {
      toast({ title: 'Erro', description: 'Não foi possível carregar os detalhes.', variant: 'destructive' });
    }
  };

  const handleOpenEdit = (tenant) => {
    setEditTenant(tenant);
    setEditForm({
      nome: tenant.nome ?? '', razao_social: tenant.razao_social ?? '', cnpj: tenant.cnpj ?? '', email: tenant.email ?? '',
      telefone: tenant.telefone ?? '', celular: tenant.celular ?? '', cep: tenant.cep ?? '', logradouro: tenant.logradouro ?? '',
      numero: tenant.numero ?? '', complemento: tenant.complemento ?? '', bairro: tenant.bairro ?? '', cidade: tenant.cidade ?? '', uf: tenant.uf ?? '',
      ativo: tenant.ativo ?? true, plano: tenant.plano ?? 'gratuito', limite_usuarios: tenant.limite_usuarios ?? 1, limite_armazenamento_mb: tenant.limite_armazenamento_mb ?? 100,
      data_ativacao: tenant.data_ativacao ? tenant.data_ativacao.slice(0, 10) : '', data_expiracao: tenant.data_expiracao ? tenant.data_expiracao.slice(0, 10) : '',
    });
    setEditOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editTenant?.id) return;
    setSaving(true);
    try {
      const payload = { ...editForm };
      if (payload.data_ativacao === '') delete payload.data_ativacao; else payload.data_ativacao = payload.data_ativacao || null;
      if (payload.data_expiracao === '') delete payload.data_expiracao; else payload.data_expiracao = payload.data_expiracao || null;
      const res = await adminTenantService.updateTenant(editTenant.id, payload);
      if (res.success) {
        toast({ title: 'Sucesso', description: 'Tenant atualizado com sucesso.' });
        setEditOpen(false); setEditTenant(null); loadTenants(pagination.current_page);
        if (detailTenant?.id === editTenant.id) setDetailTenant(res.data);
      } else toast({ title: 'Erro', description: res.message || 'Erro ao atualizar.', variant: 'destructive' });
    } catch (err) {
      toast({ title: 'Erro', description: err.response?.data?.message || 'Erro ao atualizar tenant.', variant: 'destructive' });
    } finally { setSaving(false); }
  };

  const handleToggleAtivo = async (tenant) => {
    try {
      const res = await adminTenantService.toggleAtivo(tenant.id);
      if (res.success) {
        toast({ title: res.data?.ativo ? 'Tenant ativado' : 'Tenant bloqueado', description: res.message });
        loadTenants(pagination.current_page);
        if (detailTenant?.id === tenant.id) setDetailTenant(res.data);
        if (editTenant?.id === tenant.id) setEditTenant(res.data);
      }
    } catch (err) {
      toast({ title: 'Erro', description: err.response?.data?.message || 'Não foi possível alterar o status.', variant: 'destructive' });
    }
  };

  return (
    <AdminLayout>
    <div className="p-4 md:p-6 space-y-6">
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white"><Building2 className="h-5 w-5" /> Gerenciar Tenants (Clientes do Sistema)</CardTitle>
          <CardDescription className="text-slate-400">Liste, visualize e bloqueie ou ative o acesso dos tenants.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[180px]">
              <Label className="text-xs text-slate-300">Buscar</Label>
              <div className="relative mt-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input placeholder="Nome, email, razão social..." value={filters.search} onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))} onKeyDown={(e) => e.key === 'Enter' && handleApplyFilters()} className="pl-9 bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500" />
              </div>
            </div>
            <div className="w-[140px]">
              <Label className="text-xs text-slate-300">Status</Label>
              <Select value={filters.ativo === '' ? 'todos' : filters.ativo} onValueChange={(v) => setFilters((f) => ({ ...f, ativo: v === 'todos' ? '' : v }))}>
                <SelectTrigger className="mt-1 bg-slate-700/50 border-slate-600 text-white"><SelectValue placeholder="Todos" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="true">Ativo</SelectItem>
                  <SelectItem value="false">Inativo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-[140px]">
              <Label className="text-xs text-slate-300">Plano</Label>
              <Input placeholder="ex: gratuito" value={filters.plano} onChange={(e) => setFilters((f) => ({ ...f, plano: e.target.value }))} className="mt-1 bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500" />
            </div>
            <Button onClick={handleApplyFilters}>Filtrar</Button>
          </div>
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-slate-400" /></div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-700 hover:bg-slate-700/50">
                    <TableHead className="text-slate-300">Nome</TableHead>
                    <TableHead className="text-slate-300">Email</TableHead>
                    <TableHead className="text-slate-300">Plano</TableHead>
                    <TableHead className="text-slate-300">Status</TableHead>
                    <TableHead className="text-slate-300">Data ativação</TableHead>
                    <TableHead className="text-center text-slate-300">Usuários</TableHead>
                    <TableHead className="text-center text-slate-300">Clientes</TableHead>
                    <TableHead className="text-center text-slate-300">Vendas</TableHead>
                    <TableHead className="text-right text-slate-300">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tenants.length === 0 ? (
                    <TableRow className="border-slate-700"><TableCell colSpan={9} className="text-center text-slate-400 py-8">Nenhum tenant encontrado.</TableCell></TableRow>
                  ) : tenants.map((t) => (
                    <TableRow key={t.id} className="border-slate-700 hover:bg-slate-700/50">
                      <TableCell className="font-medium text-white">{t.nome || '—'}</TableCell>
                      <TableCell className="text-slate-300">{t.email || '—'}</TableCell>
                      <TableCell className="text-slate-300">{t.plano || '—'}</TableCell>
                      <TableCell><Badge variant={t.ativo ? 'default' : 'secondary'}>{t.ativo ? 'Ativo' : 'Bloqueado'}</Badge></TableCell>
                      <TableCell className="text-slate-300">{formatDate(t.data_ativacao)}</TableCell>
                      <TableCell className="text-center text-slate-300">{t.users_count ?? 0}</TableCell>
                      <TableCell className="text-center text-slate-300">{t.clientes_count ?? 0}</TableCell>
                      <TableCell className="text-center text-slate-300">{t.vendas_count ?? 0}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="text-slate-300 hover:text-white hover:bg-slate-700" onClick={() => handleViewDetail(t)} title="Ver detalhes"><Eye className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" className="text-slate-300 hover:text-white hover:bg-slate-700" onClick={() => handleOpenEdit(t)} title="Editar"><Pencil className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" className="text-slate-300 hover:text-white hover:bg-slate-700" onClick={() => handleToggleAtivo(t)} title={t.ativo ? 'Bloquear' : 'Ativar'}>{t.ativo ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}</Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {pagination.last_page > 1 && (
                <div className="flex items-center justify-between pt-4">
                  <p className="text-sm text-slate-400">Página {pagination.current_page} de {pagination.last_page} ({pagination.total} registros)</p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="border-slate-600 text-slate-300 hover:bg-slate-700" disabled={pagination.current_page <= 1} onClick={() => loadTenants(pagination.current_page - 1)}><ChevronLeft className="h-4 w-4" /></Button>
                    <Button variant="outline" size="sm" className="border-slate-600 text-slate-300 hover:bg-slate-700" disabled={pagination.current_page >= pagination.last_page} onClick={() => loadTenants(pagination.current_page + 1)}><ChevronRight className="h-4 w-4" /></Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes do Tenant</DialogTitle>
            <DialogDescription>Informações e contagens do cliente do sistema.</DialogDescription>
          </DialogHeader>
          {detailTenant && (
            <div className="grid gap-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div><Label className="text-muted-foreground">Nome</Label><p className="font-medium">{detailTenant.nome}</p></div>
                <div><Label className="text-muted-foreground">Razão social</Label><p className="font-medium">{detailTenant.razao_social || '—'}</p></div>
                <div><Label className="text-muted-foreground">Email</Label><p className="font-medium">{detailTenant.email}</p></div>
                <div><Label className="text-muted-foreground">CNPJ</Label><p className="font-medium">{detailTenant.cnpj || '—'}</p></div>
                <div><Label className="text-muted-foreground">Plano</Label><p className="font-medium">{detailTenant.plano || '—'}</p></div>
                <div><Label className="text-muted-foreground">Status</Label><p><Badge variant={detailTenant.ativo ? 'default' : 'secondary'}>{detailTenant.ativo ? 'Ativo' : 'Bloqueado'}</Badge></p></div>
                <div><Label className="text-muted-foreground">Limite usuários / armazenamento (MB)</Label><p className="font-medium">{detailTenant.limite_usuarios ?? '—'} / {detailTenant.limite_armazenamento_mb ?? '—'}</p></div>
              </div>
              <div><Label className="text-muted-foreground">Endereço</Label><p className="font-medium">{[detailTenant.logradouro, detailTenant.numero, detailTenant.complemento, detailTenant.bairro, detailTenant.cidade, detailTenant.uf, detailTenant.cep].filter(Boolean).join(', ') || '—'}</p></div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
                <div className="rounded border p-2 text-center"><p className="text-2xl font-semibold">{detailTenant.users_count ?? 0}</p><p className="text-xs text-muted-foreground">Usuários</p></div>
                <div className="rounded border p-2 text-center"><p className="text-2xl font-semibold">{detailTenant.produtos_count ?? 0}</p><p className="text-xs text-muted-foreground">Produtos</p></div>
                <div className="rounded border p-2 text-center"><p className="text-2xl font-semibold">{detailTenant.clientes_count ?? 0}</p><p className="text-xs text-muted-foreground">Clientes</p></div>
                <div className="rounded border p-2 text-center"><p className="text-2xl font-semibold">{detailTenant.vendas_count ?? 0}</p><p className="text-xs text-muted-foreground">Vendas</p></div>
              </div>
              <DialogFooter className="pt-4">
                <Button variant="outline" onClick={() => { setDetailOpen(false); handleOpenEdit(detailTenant); }}>Editar</Button>
                <Button onClick={() => handleToggleAtivo(detailTenant)}>{detailTenant.ativo ? 'Bloquear acesso' : 'Ativar acesso'}</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Tenant</DialogTitle>
            <DialogDescription>Altere os dados do tenant. Status ativo controla o acesso ao sistema.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Nome</Label><Input value={editForm.nome ?? ''} onChange={(e) => setEditForm((f) => ({ ...f, nome: e.target.value }))} /></div>
              <div><Label>Razão social</Label><Input value={editForm.razao_social ?? ''} onChange={(e) => setEditForm((f) => ({ ...f, razao_social: e.target.value }))} /></div>
              <div><Label>Email</Label><Input type="email" value={editForm.email ?? ''} onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))} /></div>
              <div><Label>CNPJ</Label><Input value={editForm.cnpj ?? ''} onChange={(e) => setEditForm((f) => ({ ...f, cnpj: e.target.value }))} /></div>
              <div><Label>Telefone</Label><Input value={editForm.telefone ?? ''} onChange={(e) => setEditForm((f) => ({ ...f, telefone: e.target.value }))} /></div>
              <div><Label>Celular</Label><Input value={editForm.celular ?? ''} onChange={(e) => setEditForm((f) => ({ ...f, celular: e.target.value }))} /></div>
              <div><Label>Plano</Label><Input value={editForm.plano ?? ''} onChange={(e) => setEditForm((f) => ({ ...f, plano: e.target.value }))} /></div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="edit-ativo" checked={editForm.ativo ?? true} onChange={(e) => setEditForm((f) => ({ ...f, ativo: e.target.checked }))} className="rounded border" />
                <Label htmlFor="edit-ativo">Ativo (acesso liberado)</Label>
              </div>
              <div><Label>Limite usuários</Label><Input type="number" min={0} value={editForm.limite_usuarios ?? ''} onChange={(e) => setEditForm((f) => ({ ...f, limite_usuarios: e.target.value ? parseInt(e.target.value, 10) : '' }))} /></div>
              <div><Label>Limite armazenamento (MB)</Label><Input type="number" min={0} value={editForm.limite_armazenamento_mb ?? ''} onChange={(e) => setEditForm((f) => ({ ...f, limite_armazenamento_mb: e.target.value ? parseInt(e.target.value, 10) : '' }))} /></div>
              <div><Label>Data ativação</Label><Input type="date" value={editForm.data_ativacao ?? ''} onChange={(e) => setEditForm((f) => ({ ...f, data_ativacao: e.target.value }))} /></div>
              <div><Label>Data expiração</Label><Input type="date" value={editForm.data_expiracao ?? ''} onChange={(e) => setEditForm((f) => ({ ...f, data_expiracao: e.target.value }))} /></div>
            </div>
            <div className="grid gap-2">
              <Label>CEP</Label><Input value={editForm.cep ?? ''} onChange={(e) => setEditForm((f) => ({ ...f, cep: e.target.value }))} />
              <Label>Logradouro</Label><Input value={editForm.logradouro ?? ''} onChange={(e) => setEditForm((f) => ({ ...f, logradouro: e.target.value }))} />
              <div className="grid grid-cols-3 gap-2">
                <div><Label>Número</Label><Input value={editForm.numero ?? ''} onChange={(e) => setEditForm((f) => ({ ...f, numero: e.target.value }))} /></div>
                <div><Label>Complemento</Label><Input value={editForm.complemento ?? ''} onChange={(e) => setEditForm((f) => ({ ...f, complemento: e.target.value }))} /></div>
                <div><Label>Bairro</Label><Input value={editForm.bairro ?? ''} onChange={(e) => setEditForm((f) => ({ ...f, bairro: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Cidade</Label><Input value={editForm.cidade ?? ''} onChange={(e) => setEditForm((f) => ({ ...f, cidade: e.target.value }))} /></div>
                <div><Label>UF</Label><Input value={editForm.uf ?? ''} onChange={(e) => setEditForm((f) => ({ ...f, uf: e.target.value }))} maxLength={2} /></div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveEdit} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </AdminLayout>
  );
}
