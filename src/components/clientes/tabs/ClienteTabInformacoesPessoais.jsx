import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const ClienteTabInformacoesPessoais = ({ currentCliente, handleInputChange, handleSelectChange }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Identificação</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-1">
          <Label htmlFor="codigo_cliente">Código</Label>
          <Input id="codigo_cliente" name="codigo_cliente" value={currentCliente.codigo_cliente || ''} onChange={handleInputChange} disabled className="bg-muted"/>
        </div>
        <div className="space-y-1 md:col-span-2">
          <Label htmlFor="nome_completo">Nome / Razão Social</Label>
          <Input id="nome_completo" name="nome_completo" value={currentCliente.nome_completo || ''} onChange={handleInputChange} placeholder="Nome completo ou Razão Social"/>
        </div>
        <div className="space-y-1">
          <Label htmlFor="apelido_fantasia">Apelido / Nome Fantasia</Label>
          <Input id="apelido_fantasia" name="apelido_fantasia" value={currentCliente.apelido_fantasia || ''} onChange={handleInputChange} placeholder="Como o cliente é conhecido"/>
        </div>
        <div className="space-y-1">
          <Label htmlFor="tipo_pessoa">Tipo de Pessoa</Label>
          <Select name="tipo_pessoa" value={currentCliente.tipo_pessoa || 'Pessoa Física'} onValueChange={(value) => handleSelectChange('tipo_pessoa', value)}>
            <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Pessoa Física">Pessoa Física</SelectItem>
              <SelectItem value="Pessoa Jurídica">Pessoa Jurídica</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="cpf_cnpj">{currentCliente.tipo_pessoa === 'Pessoa Física' ? 'CPF' : 'CNPJ'}</Label>
          <Input id="cpf_cnpj" name="cpf_cnpj" value={currentCliente.cpf_cnpj || ''} onChange={handleInputChange} placeholder={currentCliente.tipo_pessoa === 'Pessoa Física' ? '000.000.000-00' : '00.000.000/0000-00'}/>
        </div>
        <div className="space-y-1">
          <Label htmlFor="rg_ie">{currentCliente.tipo_pessoa === 'Pessoa Física' ? 'RG' : 'Inscrição Estadual'}</Label>
          <Input id="rg_ie" name="rg_ie" value={currentCliente.rg_ie || ''} onChange={handleInputChange} placeholder={currentCliente.tipo_pessoa === 'Pessoa Física' ? '00.000.000-0' : 'Número da IE'}/>
        </div>
        {currentCliente.tipo_pessoa === 'Pessoa Física' ? (
          <>
            <div className="space-y-1">
              <Label htmlFor="data_nascimento_abertura">Data de Nascimento</Label>
              <Input type="date" id="data_nascimento_abertura" name="data_nascimento_abertura" value={currentCliente.data_nascimento_abertura || ''} onChange={handleInputChange} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="sexo">Sexo</Label>
              <Select name="sexo" value={currentCliente.sexo || ''} onValueChange={(value) => handleSelectChange('sexo', value)}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="Masculino">Masculino</SelectItem>
                    <SelectItem value="Feminino">Feminino</SelectItem>
                    <SelectItem value="Outro">Outro</SelectItem>
                    <SelectItem value="Prefiro não informar">Prefiro não informar</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        ) : (
          <div className="space-y-1">
            <Label htmlFor="data_nascimento_abertura">Data de Abertura</Label>
            <Input type="date" id="data_nascimento_abertura" name="data_nascimento_abertura" value={currentCliente.data_nascimento_abertura || ''} onChange={handleInputChange} />
          </div>
        )}
        <div className="space-y-1">
          <Label htmlFor="telefone_principal">Telefone Principal</Label>
          <Input type="tel" id="telefone_principal" name="telefone_principal" value={currentCliente.telefone_principal || ''} onChange={handleInputChange} placeholder="(00) 00000-0000"/>
        </div>
        <div className="space-y-1">
          <Label htmlFor="whatsapp">WhatsApp</Label>
          <Input type="tel" id="whatsapp" name="whatsapp" value={currentCliente.whatsapp || ''} onChange={handleInputChange} placeholder="(00) 00000-0000"/>
        </div>
        <div className="space-y-1">
          <Label htmlFor="email">E-mail</Label>
          <Input type="email" id="email" name="email" value={currentCliente.email || ''} onChange={handleInputChange} placeholder="exemplo@dominio.com"/>
        </div>
      </CardContent>
    </Card>
  );
};

export default ClienteTabInformacoesPessoais;