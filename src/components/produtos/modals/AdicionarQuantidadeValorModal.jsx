import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save, X } from 'lucide-react';

const TIPOS_VENDA = [
  { value: 'unidade', label: 'Por Unidade' },
  { value: 'quantidade_definida', label: 'Por Quantidade Definidas' },
  { value: 'm2_cm2', label: 'Por M²/CM²' },
  { value: 'm2_cm2_tabelado', label: 'Por M²/CM² Tabelado' },
  { value: 'metro_linear', label: 'Por Metro Linear' },
  { value: 'faixa_quantidade', label: 'Por Faixa de Quantidades' },
];

const AdicionarQuantidadeValorModal = ({
  isOpen,
  onClose,
  onSave,
  tipoPrecificacao = 'unidade',
  itemExistente = null, // Para edição
}) => {
  const [tipoVenda, setTipoVenda] = useState(tipoPrecificacao || 'unidade');
  const [formData, setFormData] = useState({
    // Campos comuns
    valor_custo: '',
    valor_revenda: '',
    valor_cliente_final: '',
    valor_min_revenda: '',
    valor_min_cliente_final: '',
    
    // Por Quantidade Definidas
    quantidade: '',
    
    // Por M²/CM² Tabelado e Faixa de Quantidades
    quantidade_min: '',
    quantidade_max: '',
    area_min: '',
    area_max: '',
  });

  // Resetar formulário quando o modal abrir/fechar ou tipo mudar
  useEffect(() => {
    if (isOpen) {
      if (itemExistente) {
        // Preencher com dados existentes para edição
        setFormData({
          valor_custo: itemExistente.valor_custo || '',
          valor_revenda: itemExistente.valor_revenda || '',
          valor_cliente_final: itemExistente.valor_cliente_final || '',
          valor_min_revenda: itemExistente.valor_min_revenda || '',
          valor_min_cliente_final: itemExistente.valor_min_cliente_final || '',
          quantidade: itemExistente.quantidade || '',
          quantidade_min: itemExistente.quantidade_min || '',
          quantidade_max: itemExistente.quantidade_max || '',
          area_min: itemExistente.area_min || '',
          area_max: itemExistente.area_max || '',
        });
        setTipoVenda(itemExistente.tipo_venda || tipoPrecificacao);
      } else {
        // Resetar para novo item
        setTipoVenda(tipoPrecificacao || 'unidade');
        setFormData({
          valor_custo: '',
          valor_revenda: '',
          valor_cliente_final: '',
          valor_min_revenda: '',
          valor_min_cliente_final: '',
          quantidade: '',
          quantidade_min: '',
          quantidade_max: '',
          area_min: '',
          area_max: '',
        });
      }
    }
  }, [isOpen, itemExistente, tipoPrecificacao]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSave = () => {
    // Validar campos obrigatórios baseado no tipo
    let dadosParaSalvar = {};

    switch (tipoVenda) {
      case 'unidade':
        dadosParaSalvar = {
          tipo_venda: tipoVenda,
          valor_custo: parseFloat(formData.valor_custo) || 0,
          valor_revenda: parseFloat(formData.valor_revenda) || 0,
          valor_cliente_final: parseFloat(formData.valor_cliente_final) || 0,
        };
        break;

      case 'quantidade_definida':
        if (!formData.quantidade) {
          alert('Por favor, informe o número de itens.');
          return;
        }
        dadosParaSalvar = {
          tipo_venda: tipoVenda,
          quantidade: parseFloat(formData.quantidade) || 0,
          valor_custo: parseFloat(formData.valor_custo) || 0,
          valor_revenda: parseFloat(formData.valor_revenda) || 0,
          valor_cliente_final: parseFloat(formData.valor_cliente_final) || 0,
          // Para compatibilidade com o sistema atual
          preco: parseFloat(formData.valor_cliente_final) || 0,
        };
        break;

      case 'm2_cm2':
        dadosParaSalvar = {
          tipo_venda: tipoVenda,
          valor_custo: parseFloat(formData.valor_custo) || 0,
          valor_revenda: parseFloat(formData.valor_revenda) || 0,
          valor_min_revenda: parseFloat(formData.valor_min_revenda) || 0,
          valor_cliente_final: parseFloat(formData.valor_cliente_final) || 0,
          valor_min_cliente_final: parseFloat(formData.valor_min_cliente_final) || 0,
        };
        break;

      case 'm2_cm2_tabelado':
        if (!formData.area_min || !formData.area_max) {
          alert('Por favor, informe a faixa de área (entre).');
          return;
        }
        dadosParaSalvar = {
          tipo_venda: tipoVenda,
          area_min: parseFloat(formData.area_min) || 0,
          area_max: parseFloat(formData.area_max) || 0,
          valor_custo: parseFloat(formData.valor_custo) || 0,
          valor_revenda: parseFloat(formData.valor_revenda) || 0,
          valor_min_revenda: parseFloat(formData.valor_min_revenda) || 0,
          valor_cliente_final: parseFloat(formData.valor_cliente_final) || 0,
          valor_min_cliente_final: parseFloat(formData.valor_min_cliente_final) || 0,
          // Para compatibilidade
          preco: parseFloat(formData.valor_cliente_final) || 0,
        };
        break;

      case 'metro_linear':
        dadosParaSalvar = {
          tipo_venda: tipoVenda,
          valor_custo: parseFloat(formData.valor_custo) || 0,
          valor_revenda: parseFloat(formData.valor_revenda) || 0,
          valor_min_revenda: parseFloat(formData.valor_min_revenda) || 0,
          valor_cliente_final: parseFloat(formData.valor_cliente_final) || 0,
          valor_min_cliente_final: parseFloat(formData.valor_min_cliente_final) || 0,
        };
        break;

      case 'faixa_quantidade':
        if (!formData.quantidade_min || !formData.quantidade_max) {
          alert('Por favor, informe a faixa de quantidade.');
          return;
        }
        dadosParaSalvar = {
          tipo_venda: tipoVenda,
          quantidade_min: parseFloat(formData.quantidade_min) || 0,
          quantidade_max: parseFloat(formData.quantidade_max) || 0,
          valor_custo: parseFloat(formData.valor_custo) || 0,
          valor_revenda: parseFloat(formData.valor_revenda) || 0,
          valor_cliente_final: parseFloat(formData.valor_cliente_final) || 0,
          // Para compatibilidade
          preco: parseFloat(formData.valor_cliente_final) || 0,
        };
        break;

      default:
        return;
    }

    onSave(dadosParaSalvar);
    onClose();
  };

  const renderCamposDinamicos = () => {
    switch (tipoVenda) {
      case 'unidade':
        return (
          <>
            <div>
              <Label htmlFor="valor_custo">Valor de Custo:</Label>
              <Input
                id="valor_custo"
                type="number"
                step="0.01"
                value={formData.valor_custo}
                onChange={(e) => handleInputChange('valor_custo', e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label htmlFor="valor_revenda">Valor p/ Revenda:</Label>
              <Input
                id="valor_revenda"
                type="number"
                step="0.01"
                value={formData.valor_revenda}
                onChange={(e) => handleInputChange('valor_revenda', e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label htmlFor="valor_cliente_final">Valor Cliente Final:</Label>
              <Input
                id="valor_cliente_final"
                type="number"
                step="0.01"
                value={formData.valor_cliente_final}
                onChange={(e) => handleInputChange('valor_cliente_final', e.target.value)}
                placeholder="0.00"
              />
            </div>
          </>
        );

      case 'quantidade_definida':
        return (
          <>
            <div>
              <Label htmlFor="quantidade">Núm. de itens: <span className="text-red-500">*</span></Label>
              <Input
                id="quantidade"
                type="number"
                min="1"
                value={formData.quantidade}
                onChange={(e) => handleInputChange('quantidade', e.target.value)}
                placeholder="Ex: 25"
              />
            </div>
            <div>
              <Label htmlFor="valor_custo">Valor de Custo:</Label>
              <Input
                id="valor_custo"
                type="number"
                step="0.01"
                value={formData.valor_custo}
                onChange={(e) => handleInputChange('valor_custo', e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label htmlFor="valor_revenda">Valor p/ Revenda:</Label>
              <Input
                id="valor_revenda"
                type="number"
                step="0.01"
                value={formData.valor_revenda}
                onChange={(e) => handleInputChange('valor_revenda', e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label htmlFor="valor_cliente_final">Valor Cliente Final:</Label>
              <Input
                id="valor_cliente_final"
                type="number"
                step="0.01"
                value={formData.valor_cliente_final}
                onChange={(e) => handleInputChange('valor_cliente_final', e.target.value)}
                placeholder="0.00"
              />
            </div>
          </>
        );

      case 'm2_cm2':
        return (
          <>
            <div>
              <Label htmlFor="valor_custo">Valor de Custo:</Label>
              <Input
                id="valor_custo"
                type="number"
                step="0.01"
                value={formData.valor_custo}
                onChange={(e) => handleInputChange('valor_custo', e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label htmlFor="valor_revenda">Valor p/ Revenda:</Label>
              <Input
                id="valor_revenda"
                type="number"
                step="0.01"
                value={formData.valor_revenda}
                onChange={(e) => handleInputChange('valor_revenda', e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label htmlFor="valor_min_revenda">Valor Mín. Revenda:</Label>
              <Input
                id="valor_min_revenda"
                type="number"
                step="0.01"
                value={formData.valor_min_revenda}
                onChange={(e) => handleInputChange('valor_min_revenda', e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label htmlFor="valor_cliente_final">Valor Cliente Final:</Label>
              <Input
                id="valor_cliente_final"
                type="number"
                step="0.01"
                value={formData.valor_cliente_final}
                onChange={(e) => handleInputChange('valor_cliente_final', e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label htmlFor="valor_min_cliente_final">Vlr Mín. Cliente Final:</Label>
              <Input
                id="valor_min_cliente_final"
                type="number"
                step="0.01"
                value={formData.valor_min_cliente_final}
                onChange={(e) => handleInputChange('valor_min_cliente_final', e.target.value)}
                placeholder="0.00"
              />
            </div>
          </>
        );

      case 'm2_cm2_tabelado':
        return (
          <>
            <div className="col-span-2">
              <Label>Entre:</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.area_min}
                  onChange={(e) => handleInputChange('area_min', e.target.value)}
                  placeholder="1"
                />
                <span className="text-gray-600">a</span>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.area_max}
                  onChange={(e) => handleInputChange('area_max', e.target.value)}
                  placeholder="Ex: 5"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="valor_custo">Valor de Custo:</Label>
              <Input
                id="valor_custo"
                type="number"
                step="0.01"
                value={formData.valor_custo}
                onChange={(e) => handleInputChange('valor_custo', e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label htmlFor="valor_revenda">Valor p/ Revenda:</Label>
              <Input
                id="valor_revenda"
                type="number"
                step="0.01"
                value={formData.valor_revenda}
                onChange={(e) => handleInputChange('valor_revenda', e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label htmlFor="valor_min_revenda">Valor Mín. Revenda:</Label>
              <Input
                id="valor_min_revenda"
                type="number"
                step="0.01"
                value={formData.valor_min_revenda}
                onChange={(e) => handleInputChange('valor_min_revenda', e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label htmlFor="valor_cliente_final">Valor Cliente Final:</Label>
              <Input
                id="valor_cliente_final"
                type="number"
                step="0.01"
                value={formData.valor_cliente_final}
                onChange={(e) => handleInputChange('valor_cliente_final', e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label htmlFor="valor_min_cliente_final">Vlr Mín. Cliente Final:</Label>
              <Input
                id="valor_min_cliente_final"
                type="number"
                step="0.01"
                value={formData.valor_min_cliente_final}
                onChange={(e) => handleInputChange('valor_min_cliente_final', e.target.value)}
                placeholder="0.00"
              />
            </div>
          </>
        );

      case 'metro_linear':
        return (
          <>
            <div>
              <Label htmlFor="valor_custo">Valor de Custo:</Label>
              <Input
                id="valor_custo"
                type="number"
                step="0.01"
                value={formData.valor_custo}
                onChange={(e) => handleInputChange('valor_custo', e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label htmlFor="valor_revenda">Valor p/ Revenda:</Label>
              <Input
                id="valor_revenda"
                type="number"
                step="0.01"
                value={formData.valor_revenda}
                onChange={(e) => handleInputChange('valor_revenda', e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label htmlFor="valor_min_revenda">Valor Mín. Revenda:</Label>
              <Input
                id="valor_min_revenda"
                type="number"
                step="0.01"
                value={formData.valor_min_revenda}
                onChange={(e) => handleInputChange('valor_min_revenda', e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label htmlFor="valor_cliente_final">Valor Cliente Final:</Label>
              <Input
                id="valor_cliente_final"
                type="number"
                step="0.01"
                value={formData.valor_cliente_final}
                onChange={(e) => handleInputChange('valor_cliente_final', e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label htmlFor="valor_min_cliente_final">Vlr Mín. Cliente Final:</Label>
              <Input
                id="valor_min_cliente_final"
                type="number"
                step="0.01"
                value={formData.valor_min_cliente_final}
                onChange={(e) => handleInputChange('valor_min_cliente_final', e.target.value)}
                placeholder="0.00"
              />
            </div>
          </>
        );

      case 'faixa_quantidade':
        return (
          <>
            <div className="col-span-2">
              <Label>Faixa de Qtd:</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="1"
                  value={formData.quantidade_min}
                  onChange={(e) => handleInputChange('quantidade_min', e.target.value)}
                  placeholder="1"
                />
                <span className="text-gray-600">a</span>
                <Input
                  type="number"
                  min="1"
                  value={formData.quantidade_max}
                  onChange={(e) => handleInputChange('quantidade_max', e.target.value)}
                  placeholder="Ex: 49"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="valor_custo">Valor de Custo:</Label>
              <Input
                id="valor_custo"
                type="number"
                step="0.01"
                value={formData.valor_custo}
                onChange={(e) => handleInputChange('valor_custo', e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label htmlFor="valor_revenda">Valor p/ Revenda:</Label>
              <Input
                id="valor_revenda"
                type="number"
                step="0.01"
                value={formData.valor_revenda}
                onChange={(e) => handleInputChange('valor_revenda', e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label htmlFor="valor_cliente_final">Valor Cliente Final:</Label>
              <Input
                id="valor_cliente_final"
                type="number"
                step="0.01"
                value={formData.valor_cliente_final}
                onChange={(e) => handleInputChange('valor_cliente_final', e.target.value)}
                placeholder="0.00"
              />
            </div>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Adicionando Quantidade/Valor</DialogTitle>
          <DialogDescription>
            {itemExistente ? 'Edite os valores abaixo' : 'Preencha os dados para adicionar uma nova entrada'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="tipo_venda">Tipo de Venda:</Label>
            <Select value={tipoVenda} onValueChange={setTipoVenda} disabled={!!itemExistente}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo de venda" />
              </SelectTrigger>
              <SelectContent>
                {TIPOS_VENDA.map((tipo) => (
                  <SelectItem key={tipo.value} value={tipo.value}>
                    {tipo.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {renderCamposDinamicos()}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="flex items-center gap-2">
            <X className="h-4 w-4" />
            Cancelar
          </Button>
          <Button onClick={handleSave} className="flex items-center gap-2">
            <Save className="h-4 w-4" />
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AdicionarQuantidadeValorModal;
