import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin } from 'lucide-react';

const estadosBrasileiros = [
    { sigla: 'AC', nome: 'Acre' }, { sigla: 'AL', nome: 'Alagoas' }, { sigla: 'AP', nome: 'Amapá' },
    { sigla: 'AM', nome: 'Amazonas' }, { sigla: 'BA', nome: 'Bahia' }, { sigla: 'CE', nome: 'Ceará' },
    { sigla: 'DF', nome: 'Distrito Federal' }, { sigla: 'ES', nome: 'Espírito Santo' }, { sigla: 'GO', nome: 'Goiás' },
    { sigla: 'MA', nome: 'Maranhão' }, { sigla: 'MT', nome: 'Mato Grosso' }, { sigla: 'MS', nome: 'Mato Grosso do Sul' },
    { sigla: 'MG', nome: 'Minas Gerais' }, { sigla: 'PA', nome: 'Pará' }, { sigla: 'PB', nome: 'Paraíba' },
    { sigla: 'PR', nome: 'Paraná' }, { sigla: 'PE', nome: 'Pernambuco' }, { sigla: 'PI', nome: 'Piauí' },
    { sigla: 'RJ', nome: 'Rio de Janeiro' }, { sigla: 'RN', nome: 'Rio Grande do Norte' }, { sigla: 'RS', nome: 'Rio Grande do Sul' },
    { sigla: 'RO', nome: 'Rondônia' }, { sigla: 'RR', nome: 'Roraima' }, { sigla: 'SC', nome: 'Santa Catarina' },
    { sigla: 'SP', nome: 'São Paulo' }, { sigla: 'SE', nome: 'Sergipe' }, { sigla: 'TO', nome: 'Tocantins' }
  ];

const ClienteTabEndereco = ({ currentCliente, handleNestedInputChange, handleLocateCep }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Endereço</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div className="space-y-1">
                <Label htmlFor="cep">CEP</Label>
                <Input id="cep" name="cep" value={currentCliente.endereco?.cep || ''} onChange={(e) => handleNestedInputChange('endereco', 'cep', e.target.value)} placeholder="00000-000"/>
            </div>
            <div className="space-y-1">
              <Button type="button" variant="outline" onClick={handleLocateCep} className="w-full">
                  <MapPin size={18} className="mr-2"/> Buscar Endereço
              </Button>
            </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1 md:col-span-2">
                <Label htmlFor="logradouro">Logradouro</Label>
                <Input id="logradouro" name="logradouro" value={currentCliente.endereco?.logradouro || ''} onChange={(e) => handleNestedInputChange('endereco', 'logradouro', e.target.value)} placeholder="Rua, Avenida, etc."/>
            </div>
            <div className="space-y-1">
                <Label htmlFor="numero">Número</Label>
                <Input id="numero" name="numero" value={currentCliente.endereco?.numero || ''} onChange={(e) => handleNestedInputChange('endereco', 'numero', e.target.value)} placeholder="Ex: 123"/>
            </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
                <Label htmlFor="complemento">Complemento</Label>
                <Input id="complemento" name="complemento" value={currentCliente.endereco?.complemento || ''} onChange={(e) => handleNestedInputChange('endereco', 'complemento', e.target.value)} placeholder="Apto, Bloco, Casa, etc."/>
            </div>
            <div className="space-y-1 md:col-span-2">
                <Label htmlFor="bairro">Bairro</Label>
                <Input id="bairro" name="bairro" value={currentCliente.endereco?.bairro || ''} onChange={(e) => handleNestedInputChange('endereco', 'bairro', e.target.value)} placeholder="Nome do Bairro"/>
            </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
                <Label htmlFor="cidade">Cidade</Label>
                <Input id="cidade" name="cidade" value={currentCliente.endereco?.cidade || ''} onChange={(e) => handleNestedInputChange('endereco', 'cidade', e.target.value)} placeholder="Nome da Cidade"/>
            </div>
            <div className="space-y-1">
                <Label htmlFor="estado">Estado</Label>
                 <Select name="estado" value={currentCliente.endereco?.estado || ''} onValueChange={(value) => handleNestedInputChange('endereco', 'estado', value)}>
                    <SelectTrigger><SelectValue placeholder="Selecione o Estado" /></SelectTrigger>
                    <SelectContent>
                        {estadosBrasileiros.map(estado => (
                            <SelectItem key={estado.sigla} value={estado.sigla}>{estado.nome}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ClienteTabEndereco;