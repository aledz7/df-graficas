import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, Image as ImageIcon, UserCircle2 } from 'lucide-react';

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


const ClienteTabDadosCadastrais = ({ cliente, handleInputChange, handleNestedInputChange, handleSelectChange, handleLocateCep, handleFotoUpload, fotoPreview }) => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Identificação e Contato</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-1 space-y-2 flex flex-col items-center">
            <Label>Foto do Cliente</Label>
            <div className="w-32 h-32 rounded-full border-2 border-dashed flex items-center justify-center bg-muted overflow-hidden">
              {fotoPreview ? 
                <img src={fotoPreview} alt="Foto do cliente" className="w-full h-full object-cover" /> :
                <UserCircle2 size={64} className="text-muted-foreground" />
              }
            </div>
            <Button asChild variant="outline" size="sm">
              <label htmlFor="foto-upload-tab">
                <ImageIcon className="mr-2 h-4 w-4" /> Enviar Foto
                <input id="foto-upload-tab" type="file" accept="image/*" className="hidden" onChange={handleFotoUpload} />
              </label>
            </Button>
          </div>
          <div className="md:col-span-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1 sm:col-span-1">
                <Label htmlFor="tipo_pessoa">Tipo de Pessoa</Label>
                <Select name="tipo_pessoa" value={cliente.tipo_pessoa || 'Pessoa Física'} onValueChange={(value) => handleSelectChange('tipo_pessoa', value)}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pessoa Física">Pessoa Física</SelectItem>
                    <SelectItem value="Pessoa Jurídica">Pessoa Jurídica</SelectItem>
                  </SelectContent>
                </Select>
              </div>
               <div className="space-y-1 sm:col-span-2">
                <Label htmlFor="nome_completo">Nome / Razão Social</Label>
                <Input id="nome_completo" name="nome_completo" value={cliente.nome_completo || ''} onChange={handleInputChange} placeholder="Nome completo ou Razão Social"/>
              </div>
              <div className="space-y-1">
                <Label htmlFor="apelido_fantasia">Apelido / Nome Fantasia</Label>
                <Input id="apelido_fantasia" name="apelido_fantasia" value={cliente.apelido_fantasia || ''} onChange={handleInputChange} placeholder="Como o cliente é conhecido"/>
              </div>
              <div className="space-y-1">
                <Label htmlFor="cpf_cnpj">{cliente.tipo_pessoa === 'Pessoa Física' ? 'CPF' : 'CNPJ'}</Label>
                <Input id="cpf_cnpj" name="cpf_cnpj" value={cliente.cpf_cnpj || ''} onChange={handleInputChange} placeholder={cliente.tipo_pessoa === 'Pessoa Física' ? '000.000.000-00' : '00.000.000/0000-00'}/>
              </div>
              <div className="space-y-1">
                <Label htmlFor="rg_ie">{cliente.tipo_pessoa === 'Pessoa Física' ? 'RG' : 'Inscrição Estadual'}</Label>
                <Input id="rg_ie" name="rg_ie" value={cliente.rg_ie || ''} onChange={handleInputChange} placeholder={cliente.tipo_pessoa === 'Pessoa Física' ? '00.000.000-0' : 'Número da IE'}/>
              </div>
               <div className="space-y-1">
                <Label htmlFor="telefone_principal">Telefone Principal</Label>
                <Input type="tel" id="telefone_principal" name="telefone_principal" value={cliente.telefone_principal || ''} onChange={handleInputChange} placeholder="(00) 00000-0000"/>
              </div>
              <div className="space-y-1">
                <Label htmlFor="whatsapp">WhatsApp</Label>
                <Input type="tel" id="whatsapp" name="whatsapp" value={cliente.whatsapp || ''} onChange={handleInputChange} placeholder="(00) 00000-0000"/>
              </div>
              <div className="space-y-1">
                <Label htmlFor="email">E-mail</Label>
                <Input type="email" id="email" name="email" value={cliente.email || ''} onChange={handleInputChange} placeholder="exemplo@dominio.com"/>
              </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Endereço</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                 <div className="space-y-1">
                    <Label htmlFor="cep">CEP</Label>
                    <Input id="cep" name="cep" value={cliente.endereco?.cep || ''} onChange={(e) => handleNestedInputChange('endereco', 'cep', e.target.value)} placeholder="00000-000"/>
                </div>
                <div className="space-y-1">
                  <Button type="button" variant="outline" onClick={handleLocateCep} className="w-full">
                      <MapPin size={18} className="mr-2"/> Buscar Endereço por CEP
                  </Button>
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1 md:col-span-2">
                    <Label htmlFor="logradouro">Logradouro</Label>
                    <Input id="logradouro" name="logradouro" value={cliente.endereco?.logradouro || ''} onChange={(e) => handleNestedInputChange('endereco', 'logradouro', e.target.value)} placeholder="Rua, Avenida, etc."/>
                </div>
                <div className="space-y-1">
                    <Label htmlFor="numero">Número</Label>
                    <Input id="numero" name="numero" value={cliente.endereco?.numero || ''} onChange={(e) => handleNestedInputChange('endereco', 'numero', e.target.value)} placeholder="Ex: 123"/>
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                    <Label htmlFor="complemento">Complemento</Label>
                    <Input id="complemento" name="complemento" value={cliente.endereco?.complemento || ''} onChange={(e) => handleNestedInputChange('endereco', 'complemento', e.target.value)} placeholder="Apto, Bloco, Casa, etc."/>
                </div>
                <div className="space-y-1 md:col-span-2">
                    <Label htmlFor="bairro">Bairro</Label>
                    <Input id="bairro" name="bairro" value={cliente.endereco?.bairro || ''} onChange={(e) => handleNestedInputChange('endereco', 'bairro', e.target.value)} placeholder="Nome do Bairro"/>
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                    <Label htmlFor="cidade">Cidade</Label>
                    <Input id="cidade" name="cidade" value={cliente.endereco?.cidade || ''} onChange={(e) => handleNestedInputChange('endereco', 'cidade', e.target.value)} placeholder="Nome da Cidade"/>
                </div>
                <div className="space-y-1">
                    <Label htmlFor="estado">Estado</Label>
                     <Select name="estado" value={cliente.endereco?.estado || ''} onValueChange={(value) => handleNestedInputChange('endereco', 'estado', value)}>
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
    </div>
  );
};

export default ClienteTabDadosCadastrais;