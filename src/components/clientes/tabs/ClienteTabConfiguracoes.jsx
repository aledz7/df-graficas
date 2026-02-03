import React from 'react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';

const ClienteTabConfiguracoes = ({ cliente, handleInputChange, handleSwitchChange }) => {
  
  const handleClienteTerceirizadoChange = (checked) => {
    handleSwitchChange('is_terceirizado', checked);
    if (checked) {
      handleInputChange({ target: { name: 'classificacao_cliente', value: 'Terceirizado' } });
    } else {
      handleInputChange({ target: { name: 'classificacao_cliente', value: 'Padrão' } });
      handleInputChange({ target: { name: 'desconto_fixo_os_terceirizado', value: '0' } });
    }
  };

  const isTerceirizado = cliente.classificacao_cliente === 'Terceirizado' || cliente.is_terceirizado === true;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Configurações Avançadas</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center space-x-2 pt-2">
          <Checkbox
            id="is_terceirizado"
            checked={isTerceirizado}
            onCheckedChange={handleClienteTerceirizadoChange}
          />
          <Label htmlFor="is_terceirizado" className="font-medium text-base">Cliente Terceirizado?</Label>
        </div>
        
        {isTerceirizado && (
          <div className="space-y-2 p-4 border rounded-md bg-slate-50 dark:bg-slate-800 transition-all duration-300 ease-in-out">
            <Label htmlFor="desconto_fixo_os_terceirizado" className="font-semibold">Percentual de Desconto para OS (%)</Label>
            <div className="flex items-center space-x-2">
              <Input 
                id="desconto_fixo_os_terceirizado"
                name="desconto_fixo_os_terceirizado"
                type="number"
                value={cliente.desconto_fixo_os_terceirizado !== null && cliente.desconto_fixo_os_terceirizado !== undefined ? cliente.desconto_fixo_os_terceirizado : ''} 
                onChange={handleInputChange} 
                placeholder="0"
                min="0" max="100"
                className="w-24"
              />
              <span className="text-muted-foreground">%</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Este percentual de desconto será aplicado automaticamente em Ordens de Serviço para este cliente.
              A edição desta porcentagem deve ser feita com cautela (idealmente por administradores).
            </p>
          </div>
        )}


        <div className="space-y-2">
          <Label htmlFor="observacoes">Observações Internas</Label>
          <Textarea id="observacoes" name="observacoes" value={cliente.observacoes || ''} onChange={handleInputChange} placeholder="Informações sobre o cliente, preferências, restrições, etc."/>
        </div>
        <div className="flex items-center space-x-2 pt-2">
          <Switch id="autorizado_prazo" name="autorizado_prazo" checked={cliente.autorizado_prazo || false} onCheckedChange={(checked) => handleSwitchChange('autorizado_prazo', checked)} />
          <Label htmlFor="autorizado_prazo">Autorizado a comprar a prazo / crediário?</Label>
        </div>
        <div className="flex items-center space-x-2">
          <Switch id="status" name="status" checked={cliente.status === undefined ? true : cliente.status} onCheckedChange={(checked) => handleSwitchChange('status', checked)} />
          <Label htmlFor="status">Cliente Ativo</Label>
        </div>
      </CardContent>
    </Card>
  );
};

export default ClienteTabConfiguracoes;