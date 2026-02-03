import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from '@/components/ui/use-toast';
import { Upload, Save, Building, Phone, Mail, Globe, Lock, Eye, EyeOff, Info } from 'lucide-react';
import { motion } from 'framer-motion';
import { safeJsonParse } from '@/lib/utils';
import { empresaService } from '@/services/api';

// Função para obter a URL completa da imagem
export const getImageUrlEmpresa = (path) => {
  
  if (!path) {
    return null;
  }
  
  // Obter a URL base da API do ambiente
  const apiBaseUrl = import.meta.env.VITE_API_URL;
  
  // Se o caminho já começar com /storage, não adicionar novamente
  if (path.startsWith('/storage')) {
    const fullUrl = `${apiBaseUrl}${path}`;
    return fullUrl;
  }
  
  // Se o caminho começar com tenants/, adicionar /storage/ antes
  if (path.startsWith('tenants/')) {
    const fullUrl = `${apiBaseUrl}/storage/${path}`;
    return fullUrl;
  }
  
  const fullUrl = `${apiBaseUrl}/storage/${path}`;
  return fullUrl;
};

const EmpresaSettingsPage = ({ logoUrl: appLogoUrl, setAppLogoUrl, setAppNomeEmpresa, setAppNomeSistema }) => {

  const { toast } = useToast();
  const fileInputRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [debugInfo, setDebugInfo] = useState(null);
  const [settings, setSettings] = useState({
    nomeFantasia: '',
    razaoSocial: '',
    cnpj: '',
    inscricaoEstadual: '',
    inscricaoMunicipal: '',
    telefone: '',
    whatsapp: '',
    email: '',
    enderecoCompleto: '',
    instagram: '',
    site: '',
    logoUrl: '',
    mensagemPersonalizadaRodape: '',
    nomeSistema: '',
    supervisorPassword: '',
    termosServicoPadrao: '',
    politicaPrivacidadePadrao: '',
  });
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        console.log('🔄 Carregando dados da empresa...');
        
        // Carregar dados da empresa da API Laravel
        const response = await empresaService.get();
        console.log('📡 Resposta da API:', response);
        
        const empresaData = response.data.data;
        console.log('🏢 Dados da empresa recebidos:', empresaData);
        
        // Salvar informações de debug
        setDebugInfo({
          response: response.data,
          empresaData: empresaData,
          timestamp: new Date().toISOString()
        });
        
        // Mapear dados da API para o formato local
        const loadedSettings = {
          nomeFantasia: empresaData.nome_fantasia || 'Sua Empresa',
          razaoSocial: empresaData.razao_social || '',
          cnpj: empresaData.cnpj || '',
          inscricaoEstadual: empresaData.inscricao_estadual || '',
          inscricaoMunicipal: empresaData.inscricao_municipal || '',
          telefone: empresaData.telefone || '',
          whatsapp: empresaData.whatsapp || '',
          email: empresaData.email || '',
          enderecoCompleto: empresaData.endereco_completo || '',
          instagram: empresaData.instagram || '',
          site: empresaData.site || '',
          logoUrl: empresaData.logo_url || appLogoUrl || '',
          mensagemPersonalizadaRodape: empresaData.mensagem_rodape || 'Obrigado pela preferência!',
          nomeSistema: empresaData.nome_sistema || 'Sistema Gráficas',
          supervisorPassword: empresaData.senha_supervisor || '',
          termosServicoPadrao: empresaData.termos_servico || 'Termos de serviço padrão da empresa...',
          politicaPrivacidadePadrao: empresaData.politica_privacidade || 'Política de privacidade padrão da empresa...',
        };
        
        console.log('⚙️ Configurações mapeadas:', loadedSettings);
        setSettings(loadedSettings);
        
      } catch (error) {
        console.error('❌ Erro ao carregar dados da empresa:', error);
        setDebugInfo({
          error: error.message,
          response: error.response?.data,
          timestamp: new Date().toISOString()
        });
        // Fallback para configurações padrão
        const defaultSettings = {
          nomeFantasia: 'Sua Empresa',
          razaoSocial: '',
          cnpj: '',
          inscricaoEstadual: '',
          inscricaoMunicipal: '',
          telefone: '',
          whatsapp: '',
          email: '',
          enderecoCompleto: '',
          instagram: '',
          site: '',
          logoUrl: appLogoUrl || '',
          mensagemPersonalizadaRodape: 'Obrigado pela preferência!',
          nomeSistema: 'Sistema Gráficas',
          supervisorPassword: '',
          termosServicoPadrao: 'Termos de serviço padrão da empresa...',
          politicaPrivacidadePadrao: 'Política de privacidade padrão da empresa...',
        };
        setSettings(defaultSettings);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [appLogoUrl]);

  const handleInputChange = async (e) => {
    const { name, value } = e.target;
    setSettings(prev => ({ ...prev, [name]: value }));
  };

  const handleLogoUpload = async (event) => {
    const file = event.target.files[0];
    if (file && file.size <= 2 * 1024 * 1024) { // 2MB limit
      try {
        // Upload da logo para a API
        const formData = new FormData();
        formData.append('logo', file);
        
        const response = await empresaService.uploadLogo(formData);
        const logoUrl = response.data?.url || '';
        
        setSettings(prev => ({ ...prev, logoUrl }));
        if(setAppLogoUrl) setAppLogoUrl(logoUrl);
        
        toast({ title: "Logo Atualizada", description: "A nova logo foi enviada para o servidor." });
      } catch (error) {
        console.error('Erro ao fazer upload da logo:', error);
        toast({ 
          title: "Erro ao enviar logo", 
          description: "Não foi possível enviar a logo para o servidor.", 
          variant: "destructive" 
        });
      }
    } else {
      toast({ 
        title: "Arquivo muito grande", 
        description: "A logo deve ter no máximo 2MB.", 
        variant: "destructive" 
      });
    }
  };

  const handleSaveSettings = async () => {
    try {

      // Preparar dados para enviar para a API
      const dadosEmpresa = {
        nome_fantasia: settings.nomeFantasia,
        razao_social: settings.razaoSocial,
        cnpj: settings.cnpj,
        inscricao_estadual: settings.inscricaoEstadual,
        inscricao_municipal: settings.inscricaoMunicipal,
        telefone: settings.telefone,
        whatsapp: settings.whatsapp,
        email: settings.email,
        endereco_completo: settings.enderecoCompleto,
        instagram: settings.instagram,
        site: settings.site,
        logo_url: settings.logoUrl,
        mensagem_rodape: settings.mensagemPersonalizadaRodape,
        nome_sistema: settings.nomeSistema,
        senha_supervisor: settings.supervisorPassword,
        termos_servico: settings.termosServicoPadrao,
        politica_privacidade: settings.politicaPrivacidadePadrao,
      };

      // Salvar dados da empresa na API
      const response = await empresaService.update(dadosEmpresa);
      
      // Atualizar estado da aplicação
      if(setAppNomeEmpresa) setAppNomeEmpresa(settings.nomeFantasia);
      if(setAppNomeSistema) setAppNomeSistema(settings.nomeSistema);
      
      toast({
        title: 'Configurações Salvas!',
        description: 'As informações da empresa foram salvas no servidor com sucesso.',
        className: 'bg-green-500 text-white',
      });
    } catch (error) {
      console.error('Erro ao salvar dados da empresa:', error);
      toast({
        title: 'Erro ao Salvar',
        description: 'Não foi possível salvar as configurações no servidor. Tente novamente.',
        variant: 'destructive',
      });
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current.click();
  };

  const toggleShowPassword = () => setShowPassword(!showPassword);

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
  };

  return (
    <motion.div 
      initial="hidden"
      animate="visible"
      variants={cardVariants}
      className="container mx-auto p-4 md:p-8"
    >
      <Card className="shadow-xl border-border">
        <CardHeader className="border-b border-border">
          <div className="flex items-center space-x-4">
            <Building className="h-10 w-10 text-primary" />
            <div>
              <CardTitle className="text-3xl font-bold text-foreground">Configurações da Empresa</CardTitle>
              <CardDescription className="text-muted-foreground">
                Gerencie as informações, identidade visual e termos da sua empresa.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <Tabs defaultValue="dados" className="w-full">
            <TabsList className="grid w-full grid-cols-1 md:grid-cols-4 mb-6">
              <TabsTrigger value="dados" className="text-base">Dados Cadastrais</TabsTrigger>
              <TabsTrigger value="identidade" className="text-base">Identidade Visual</TabsTrigger>
              <TabsTrigger value="termos" className="text-base">Termos e Políticas</TabsTrigger>
              {/* <TabsTrigger value="seguranca" className="text-base">Segurança</TabsTrigger> */}
            </TabsList>

            <TabsContent value="dados">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="nomeFantasia" className="text-md font-medium">Nome Fantasia <span className="text-red-500">*</span></Label>
                  <Input 
                    id="nomeFantasia" 
                    name="nomeFantasia" 
                    value={settings.nomeFantasia} 
                    onChange={handleInputChange} 
                    placeholder="Nome da sua empresa" 
                  />

                </div>
                <div className="space-y-2">
                  <Label htmlFor="razaoSocial" className="text-md font-medium">Razão Social</Label>
                  <Input id="razaoSocial" name="razaoSocial" value={settings.razaoSocial} onChange={handleInputChange} placeholder="Razão social completa" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cnpj" className="text-md font-medium">CNPJ</Label>
                  <Input 
                    id="cnpj" 
                    name="cnpj" 
                    value={settings.cnpj} 
                    onChange={handleInputChange} 
                    placeholder="00.000.000/0000-00" 
                  />

                </div>
                <div className="space-y-2">
                  <Label htmlFor="inscricaoEstadual" className="text-md font-medium">Inscrição Estadual</Label>
                  <Input id="inscricaoEstadual" name="inscricaoEstadual" value={settings.inscricaoEstadual} onChange={handleInputChange} placeholder="Número da IE" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="inscricaoMunicipal" className="text-md font-medium">Inscrição Municipal</Label>
                  <Input id="inscricaoMunicipal" name="inscricaoMunicipal" value={settings.inscricaoMunicipal} onChange={handleInputChange} placeholder="Número da IM" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-md font-medium">E-mail Principal</Label>
                   <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input id="email" name="email" type="email" value={settings.email} onChange={handleInputChange} placeholder="contato@suaempresa.com" className="pl-10"/>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="telefone" className="text-md font-medium">Telefone Fixo</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input id="telefone" name="telefone" value={settings.telefone} onChange={handleInputChange} placeholder="(00) 0000-0000" className="pl-10"/>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="whatsapp" className="text-md font-medium">WhatsApp</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input id="whatsapp" name="whatsapp" value={settings.whatsapp} onChange={handleInputChange} placeholder="(00) 90000-0000" className="pl-10"/>
                  </div>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="enderecoCompleto" className="text-md font-medium">Endereço Completo</Label>
                  <Textarea id="enderecoCompleto" name="enderecoCompleto" value={settings.enderecoCompleto} onChange={handleInputChange} placeholder="Rua, Número, Bairro, Cidade, Estado, CEP" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="instagram" className="text-md font-medium">Instagram</Label>
                  <Input id="instagram" name="instagram" value={settings.instagram} onChange={handleInputChange} placeholder="@seuinstagram" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="site" className="text-md font-medium">Site</Label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input id="site" name="site" value={settings.site} onChange={handleInputChange} placeholder="www.suaempresa.com" className="pl-10"/>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="identidade">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="nomeSistema" className="text-md font-medium">Nome do Sistema</Label>
                    <Input id="nomeSistema" name="nomeSistema" value={settings.nomeSistema} onChange={handleInputChange} placeholder="Nome que aparece no topo e abas" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-md font-medium">Logo da Empresa</Label>
                    <div className="flex items-center space-x-4">
                      {settings.logoUrl && <img src={getImageUrlEmpresa(settings.logoUrl)} alt="Logo" className="h-20 w-auto object-contain rounded border p-1 bg-muted" />}
                      <Button variant="outline" onClick={triggerFileInput}>
                        <Upload size={18} className="mr-2" /> Enviar Nova Logo
                      </Button>
                      <Input type="file" ref={fileInputRef} onChange={handleLogoUpload} accept="image/*" className="hidden" />
                    </div>
                    <p className="text-sm text-muted-foreground">Use uma imagem PNG ou JPG de até 2MB.</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mensagemPersonalizadaRodape" className="text-md font-medium">Mensagem no Rodapé dos Documentos</Label>
                  <Textarea id="mensagemPersonalizadaRodape" name="mensagemPersonalizadaRodape" value={settings.mensagemPersonalizadaRodape} onChange={handleInputChange} placeholder="Ex: Obrigado pela preferência!" rows={3} />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="termos">
              <div className="space-y-6">
                <div>
                  <Label htmlFor="termosServicoPadrao" className="text-md font-medium">Termos de Serviço Padrão</Label>
                  <Textarea 
                    id="termosServicoPadrao" 
                    name="termosServicoPadrao" 
                    value={settings.termosServicoPadrao} 
                    onChange={handleInputChange} 
                    placeholder="Defina os termos de serviço que podem ser incluídos em orçamentos e OS." 
                    rows={6} 
                  />
                  <p className="text-xs text-muted-foreground mt-1">Este texto pode ser usado como base para documentos.</p>
                </div>
                <div>
                  <Label htmlFor="politicaPrivacidadePadrao" className="text-md font-medium">Política de Privacidade Padrão</Label>
                  <Textarea 
                    id="politicaPrivacidadePadrao" 
                    name="politicaPrivacidadePadrao" 
                    value={settings.politicaPrivacidadePadrao} 
                    onChange={handleInputChange} 
                    placeholder="Defina a política de privacidade da empresa." 
                    rows={6} 
                  />
                   <p className="text-xs text-muted-foreground mt-1">Este texto pode ser usado como base para documentos.</p>
                </div>
              </div>
            </TabsContent>

            {/* <TabsContent value="seguranca">
              <Card className="border-orange-300 dark:border-orange-700 bg-orange-50 dark:bg-orange-900/30">
                <CardHeader>
                  <CardTitle className="text-xl text-orange-700 dark:text-orange-400 flex items-center">
                    <Lock size={24} className="mr-2" />
                    Senha de Supervisor
                  </CardTitle>
                  <CardDescription className="text-orange-600 dark:text-orange-500">
                    Esta senha será solicitada para ações críticas como editar ou excluir registros finalizados.
                    Guarde-a em um local seguro. Diferente da senha de login do usuário.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Label htmlFor="supervisorPassword">Definir Nova Senha de Supervisor</Label>
                    <div className="relative">
                       <Input
                        id="supervisorPassword"
                        name="supervisorPassword"
                        type={showPassword ? "text" : "password"}
                        value={settings.supervisorPassword || ''}
                        onChange={handleInputChange}
                        placeholder="Digite a nova senha de supervisor"
                        className="pr-10" 
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 text-muted-foreground"
                        onClick={toggleShowPassword}
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Recomendamos uma senha forte. Se deixado em branco, nenhuma senha será exigida para essas ações (menos seguro).
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent> */}
          </Tabs>
        </CardContent>
        <CardFooter className="border-t border-border pt-6 flex flex-col items-center">
          <div className="flex gap-4 mb-4">
            <Button onClick={handleSaveSettings} size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground text-lg">
              <Save size={20} className="mr-2" /> Salvar Todas as Configurações
            </Button>
          </div>
          
        </CardFooter>
      </Card>
    </motion.div>
  );
};

export default EmpresaSettingsPage;