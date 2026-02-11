import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarDays, Loader2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/components/ui/use-toast';
import api from '@/services/api';
import { formatCurrency } from '@/lib/utils';

const ConfigurarMetasModal = ({ isOpen, onClose, meta, vendedores = [] }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    tipo: 'empresa',
    vendedor_id: null,
    data_inicio: format(new Date(), 'yyyy-MM-dd'),
    data_fim: format(new Date(), 'yyyy-MM-dd'),
    periodo_tipo: 'mensal',
    valor_meta: '',
    observacoes: '',
    ativo: true
  });
  const [showDataInicioPicker, setShowDataInicioPicker] = useState(false);
  const [showDataFimPicker, setShowDataFimPicker] = useState(false);

  useEffect(() => {
    if (meta) {
      setFormData({
        tipo: meta.tipo || 'empresa',
        vendedor_id: meta.vendedor_id || null,
        data_inicio: meta.data_inicio || format(new Date(), 'yyyy-MM-dd'),
        data_fim: meta.data_fim || format(new Date(), 'yyyy-MM-dd'),
        periodo_tipo: meta.periodo_tipo || 'mensal',
        valor_meta: meta.valor_meta || '',
        observacoes: meta.observacoes || '',
        ativo: meta.ativo !== undefined ? meta.ativo : true
      });
    } else {
      // Resetar formulário
      setFormData({
        tipo: 'empresa',
        vendedor_id: null,
        data_inicio: format(new Date(), 'yyyy-MM-dd'),
        data_fim: format(new Date(), 'yyyy-MM-dd'),
        periodo_tipo: 'mensal',
        valor_meta: '',
        observacoes: '',
        ativo: true
      });
    }
  }, [meta, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const dataToSend = {
        ...formData,
        valor_meta: parseFloat(formData.valor_meta)
      };

      if (meta) {
        // Atualizar
        await api.put(`/api/metas-vendas/${meta.id}`, dataToSend);
        toast({
          title: "Sucesso",
          description: "Meta atualizada com sucesso!",
        });
      } else {
        // Criar
        await api.post('/api/metas-vendas', dataToSend);
        toast({
          title: "Sucesso",
          description: "Meta criada com sucesso!",
        });
      }

      onClose(true); // Passar true para indicar que houve alteração
    } catch (error) {
      console.error('Erro ao salvar meta:', error);
      toast({
        title: "Erro",
        description: error.response?.data?.message || "Erro ao salvar meta.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePeriodoTipoChange = (value) => {
    setFormData({ ...formData, periodo_tipo: value });
    
    // Ajustar datas automaticamente
    const hoje = new Date();
    if (value === 'diario') {
      setFormData(prev => ({
        ...prev,
        periodo_tipo: value,
        data_inicio: format(hoje, 'yyyy-MM-dd'),
        data_fim: format(hoje, 'yyyy-MM-dd')
      }));
    } else if (value === 'mensal') {
      const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
      setFormData(prev => ({
        ...prev,
        periodo_tipo: value,
        data_inicio: format(inicioMes, 'yyyy-MM-dd'),
        data_fim: format(fimMes, 'yyyy-MM-dd')
      }));
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{meta ? 'Editar Meta' : 'Nova Meta de Vendas'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <Label>Tipo de Meta</Label>
              <Select
                value={formData.tipo}
                onValueChange={(value) => setFormData({ ...formData, tipo: value, vendedor_id: value === 'empresa' ? null : formData.vendedor_id })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="empresa">Meta da Empresa</SelectItem>
                  <SelectItem value="vendedor">Meta Individual do Vendedor</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.tipo === 'vendedor' && (
              <div>
                <Label>Vendedor</Label>
                <Select
                  value={formData.vendedor_id?.toString() || ''}
                  onValueChange={(value) => setFormData({ ...formData, vendedor_id: parseInt(value) })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Selecione o vendedor" />
                  </SelectTrigger>
                  <SelectContent>
                    {vendedores.map((vendedor) => (
                      <SelectItem key={vendedor.id} value={vendedor.id.toString()}>
                        {vendedor.name} {vendedor.email ? `(${vendedor.email})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label>Tipo de Período</Label>
              <Select
                value={formData.periodo_tipo}
                onValueChange={handlePeriodoTipoChange}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="diario">Diário</SelectItem>
                  <SelectItem value="mensal">Mensal</SelectItem>
                  <SelectItem value="personalizado">Período Personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Data Início</Label>
                <Popover open={showDataInicioPicker} onOpenChange={setShowDataInicioPicker}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal mt-1">
                      <CalendarDays className="mr-2 h-4 w-4" />
                      {formData.data_inicio ? format(parseISO(formData.data_inicio), 'dd/MM/yyyy', { locale: ptBR }) : 'Selecione'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={formData.data_inicio ? parseISO(formData.data_inicio) : undefined}
                      onSelect={(date) => {
                        if (date) {
                          setFormData({ ...formData, data_inicio: format(date, 'yyyy-MM-dd') });
                          setShowDataInicioPicker(false);
                        }
                      }}
                      locale={ptBR}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <Label>Data Fim</Label>
                <Popover open={showDataFimPicker} onOpenChange={setShowDataFimPicker}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal mt-1">
                      <CalendarDays className="mr-2 h-4 w-4" />
                      {formData.data_fim ? format(parseISO(formData.data_fim), 'dd/MM/yyyy', { locale: ptBR }) : 'Selecione'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={formData.data_fim ? parseISO(formData.data_fim) : undefined}
                      onSelect={(date) => {
                        if (date) {
                          setFormData({ ...formData, data_fim: format(date, 'yyyy-MM-dd') });
                          setShowDataFimPicker(false);
                        }
                      }}
                      locale={ptBR}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div>
              <Label>Valor da Meta (R$)</Label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                value={formData.valor_meta}
                onChange={(e) => setFormData({ ...formData, valor_meta: e.target.value })}
                placeholder="0.00"
                className="mt-1"
                required
              />
            </div>

            <div>
              <Label>Observações</Label>
              <Textarea
                value={formData.observacoes}
                onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                placeholder="Observações sobre a meta..."
                className="mt-1"
                rows={3}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="ativo"
                checked={formData.ativo}
                onCheckedChange={(checked) => setFormData({ ...formData, ativo: checked })}
              />
              <Label htmlFor="ativo">Meta ativa</Label>
            </div>
          </div>

          <DialogFooter className="mt-6">
            <DialogClose asChild>
              <Button type="button" variant="outline">Cancelar</Button>
            </DialogClose>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                meta ? 'Atualizar Meta' : 'Criar Meta'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ConfigurarMetasModal;
