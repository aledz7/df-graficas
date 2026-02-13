import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, Save, Loader2, Receipt, Eye, EyeOff, 
  CheckCircle, XCircle, Wifi, Shield, FileText, Settings2
} from 'lucide-react';
import { notaFiscalService } from '@/services/api';

const NfeSettingsPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [showToken, setShowToken] = useState(false);

  // Valores dos campos
  const [configs, setConfigs] = useState({
    token_api: '',
    ambiente: '2',
    serie: '1',
    regime_tributario: '1',
    natureza_operacao: 'Venda',
    cfop_padrao: '5102',
    codigo_ncm_padrao: '49111090',
    icms_situacao_tributaria: '102',
    pis_situacao_tributaria: '07',
    cofins_situacao_tributaria: '07',
    tipo_nfse: 'nfse',
    natureza_operacao_nfse: '1',
    optante_simples_nacional: '3',
    regime_especial_tributacao: '0',
    regime_tributario_simples_nacional: '1',
    incentivo_fiscal: 'nao_enviar',
    tributacao_iss: '1',
    tipo_retencao_iss: '1',
    codigo_tributario_municipio: '',
    item_lista_servico: '',
    codigo_cnae: '',
    codigo_nbs: '',
    aliquota_iss: '5',
  });

  useEffect(() => {
    carregarConfigs();
  }, []);

  const carregarConfigs = async () => {
    setIsLoading(true);
    try {
      const res = await notaFiscalService.carregarConfiguracoes();
      const data = res.data || {};
      
      // Mapear os valores retornados
      const novasConfigs = { ...configs };
      Object.keys(novasConfigs).forEach(chave => {
        if (data[chave] !== undefined && data[chave] !== null) {
          novasConfigs[chave] = String(data[chave]);
        }
      });
      setConfigs(novasConfigs);
    } catch (err) {
      console.error('Erro ao carregar configurações NFe:', err);
      // Se não encontrou configs, usar defaults (primeiro acesso)
      if (err?.response?.status !== 404 && err?.response?.status !== 500) {
        toast({ title: 'Aviso', description: 'Configurações ainda não foram definidas. Preencha e salve.', variant: 'default' });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await notaFiscalService.salvarConfiguracoes(configs);
      toast({ title: 'Salvo!', description: res.message || 'Configurações de Nota Fiscal salvas com sucesso.' });
    } catch (err) {
      console.error('Erro ao salvar:', err);
      const errorData = err?.response?.data;
      let descricao = 'Erro ao salvar configurações.';
      
      if (errorData?.erros && typeof errorData.erros === 'object') {
        const campos = Object.entries(errorData.erros)
          .map(([campo, msg]) => `${campo}: ${msg}`)
          .join('; ');
        descricao = `Erros encontrados: ${campos}`;
      } else if (errorData?.message) {
        descricao = errorData.message;
      }
      
      toast({ title: 'Erro ao Salvar', description: descricao, variant: 'destructive', duration: 8000 });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      // Salvar primeiro para garantir que o token está atualizado
      await notaFiscalService.salvarConfiguracoes(configs);
      
      const res = await notaFiscalService.testarConexao();
      setTestResult(res);
      
      if (res.sucesso) {
        toast({ title: 'Conexao OK', description: res.mensagem || 'Conexao com a API de emissao estabelecida com sucesso.' });
      } else {
        toast({ title: 'Falha na Conexao', description: res.erro || 'Nao foi possivel conectar a API.', variant: 'destructive' });
      }
    } catch (err) {
      const msg = err?.response?.data?.erro || 'Erro ao testar conexao.';
      setTestResult({ sucesso: false, erro: msg });
      toast({ title: 'Erro', description: msg, variant: 'destructive' });
    } finally {
      setIsTesting(false);
    }
  };

  const handleChange = (chave, valor) => {
    setConfigs(prev => ({ ...prev, [chave]: valor }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="p-4 md:p-6 max-w-4xl mx-auto"
    >
      {/* Header */}
      <header className="mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate('/configuracoes')} className="mb-2">
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
        </Button>
        <div className="flex items-center space-x-3">
          <Receipt size={32} className="text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Nota Fiscal</h1>
            <p className="text-muted-foreground">Configure o token de acesso, ambiente e parametros fiscais para emissao de NFe e NFSe.</p>
          </div>
        </div>
      </header>

      <div className="space-y-6">
        {/* Conexão com API */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="h-5 w-5" /> Conexao com API de Emissao
            </CardTitle>
            <CardDescription>
              Configure o token de acesso e o ambiente de emissao.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="token_api">Token da API</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input 
                    id="token_api"
                    type={showToken ? 'text' : 'password'}
                    value={configs.token_api}
                    onChange={(e) => handleChange('token_api', e.target.value)}
                    placeholder="Cole aqui o token de acesso..."
                    className="pr-10"
                  />
                  <Button 
                    type="button"
                    variant="ghost" 
                    size="sm" 
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowToken(!showToken)}
                  >
                    {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">O token e fornecido pelo provedor de emissao de notas fiscais.</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ambiente">Ambiente</Label>
                <Select value={configs.ambiente} onValueChange={(v) => handleChange('ambiente', v)}>
                  <SelectTrigger id="ambiente">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2">Homologacao (Testes)</SelectItem>
                    <SelectItem value="1">Producao</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="serie">Serie</Label>
                <Input 
                  id="serie"
                  value={configs.serie}
                  onChange={(e) => handleChange('serie', e.target.value)}
                  placeholder="1"
                />
              </div>
            </div>

            {/* Testar Conexão */}
            <div className="flex items-center gap-3 pt-2">
              <Button 
                variant="outline" 
                onClick={handleTestConnection}
                disabled={isTesting || !configs.token_api}
              >
                {isTesting ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Testando...</>
                ) : (
                  <><Wifi className="mr-2 h-4 w-4" /> Testar Conexao</>
                )}
              </Button>
              {testResult && (
                <div className="flex items-center gap-2">
                  {testResult.sucesso ? (
                    <Badge className="bg-green-500 text-white"><CheckCircle className="mr-1 h-3 w-3" /> Conectado</Badge>
                  ) : (
                    <Badge variant="destructive"><XCircle className="mr-1 h-3 w-3" /> Falha</Badge>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Configurações NFe */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5" /> Parametros NFe (Nota Fiscal Eletronica)
            </CardTitle>
            <CardDescription>
              Configuracoes padrao para emissao de NFe (venda de produtos e mercadorias).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="regime_tributario">Regime Tributario</Label>
                <Select value={configs.regime_tributario} onValueChange={(v) => handleChange('regime_tributario', v)}>
                  <SelectTrigger id="regime_tributario">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Simples Nacional</SelectItem>
                    <SelectItem value="2">Simples Nacional - Excesso</SelectItem>
                    <SelectItem value="3">Regime Normal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="natureza_operacao">Natureza da Operacao</Label>
                <Input 
                  id="natureza_operacao"
                  value={configs.natureza_operacao}
                  onChange={(e) => handleChange('natureza_operacao', e.target.value)}
                  placeholder="Venda"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cfop_padrao">CFOP Padrao</Label>
                <Input 
                  id="cfop_padrao"
                  value={configs.cfop_padrao}
                  onChange={(e) => handleChange('cfop_padrao', e.target.value)}
                  placeholder="5102"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="codigo_ncm_padrao">NCM Padrao</Label>
                <Input 
                  id="codigo_ncm_padrao"
                  value={configs.codigo_ncm_padrao}
                  onChange={(e) => handleChange('codigo_ncm_padrao', e.target.value)}
                  placeholder="49111090"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="icms_situacao_tributaria">ICMS Sit. Tributaria</Label>
                <Input 
                  id="icms_situacao_tributaria"
                  value={configs.icms_situacao_tributaria}
                  onChange={(e) => handleChange('icms_situacao_tributaria', e.target.value)}
                  placeholder="102"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pis_situacao_tributaria">PIS Sit. Tributaria</Label>
                <Input 
                  id="pis_situacao_tributaria"
                  value={configs.pis_situacao_tributaria}
                  onChange={(e) => handleChange('pis_situacao_tributaria', e.target.value)}
                  placeholder="07"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cofins_situacao_tributaria">COFINS Sit. Tributaria</Label>
                <Input 
                  id="cofins_situacao_tributaria"
                  value={configs.cofins_situacao_tributaria}
                  onChange={(e) => handleChange('cofins_situacao_tributaria', e.target.value)}
                  placeholder="07"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Configurações NFSe */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Settings2 className="h-5 w-5" /> Parametros NFSe (Nota Fiscal de Servico)
            </CardTitle>
            <CardDescription>
              Configuracoes padrao para emissao de NFSe (prestacao de servicos).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Tipo de Integração */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tipo_nfse">Tipo de Integracao</Label>
                <Select value={configs.tipo_nfse} onValueChange={(v) => handleChange('tipo_nfse', v)}>
                  <SelectTrigger id="tipo_nfse">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nfse">NFSe Legacy (ABRASF - /v2/nfse)</SelectItem>
                    <SelectItem value="nfsen">NFSe Nacional (/v2/nfsen)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {configs.tipo_nfse === 'nfsen' 
                    ? 'Padrao nacional unificado. Ative "NFSe Nacional" no painel.' 
                    : 'Integracao via webservice municipal (padrao ABRASF).'}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="aliquota_iss">Aliquota ISS (%)</Label>
                <Input 
                  id="aliquota_iss"
                  value={configs.aliquota_iss}
                  onChange={(e) => handleChange('aliquota_iss', e.target.value)}
                  placeholder="5"
                  type="number"
                  step="0.01"
                />
              </div>
            </div>

            {/* Campos exclusivos NFSe Legacy */}
            {configs.tipo_nfse === 'nfse' && (
              <>
                <Separator className="my-2" />
                <p className="text-sm font-medium text-muted-foreground">NFSe Legacy (ABRASF)</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="natureza_operacao_nfse">Natureza da Operacao</Label>
                    <Select value={configs.natureza_operacao_nfse} onValueChange={(v) => handleChange('natureza_operacao_nfse', v)}>
                      <SelectTrigger id="natureza_operacao_nfse">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 - Tributacao no municipio</SelectItem>
                        <SelectItem value="2">2 - Tributacao fora do municipio</SelectItem>
                        <SelectItem value="3">3 - Isencao</SelectItem>
                        <SelectItem value="4">4 - Imune</SelectItem>
                        <SelectItem value="5">5 - Exigibilidade suspensa por decisao judicial</SelectItem>
                        <SelectItem value="6">6 - Exigibilidade suspensa por procedimento administrativo</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">Codigo numerico conforme padrao ABRASF.</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="incentivo_fiscal">Incentivo Fiscal</Label>
                    <Select value={configs.incentivo_fiscal} onValueChange={(v) => handleChange('incentivo_fiscal', v)}>
                      <SelectTrigger id="incentivo_fiscal">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="nao_enviar">Nao enviar</SelectItem>
                        <SelectItem value="1">1 - Sim</SelectItem>
                        <SelectItem value="2">2 - Nao</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </>
            )}

            <Separator className="my-2" />
            <p className="text-sm font-medium text-muted-foreground">Regime Tributario</p>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="optante_simples_nacional">Optante Simples Nacional</Label>
                <Select value={configs.optante_simples_nacional} onValueChange={(v) => handleChange('optante_simples_nacional', v)}>
                  <SelectTrigger id="optante_simples_nacional">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 - Nao Optante</SelectItem>
                    <SelectItem value="2">2 - Optante - MEI</SelectItem>
                    <SelectItem value="3">3 - Optante - ME/EPP</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {configs.tipo_nfse === 'nfsen' 
                    ? 'NFSe Nacional (opSimpNac). ME/EPP = Simples Nacional.' 
                    : 'Legacy: 2 ou 3 = Optante SN (true), 1 = Nao Optante (false).'}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="regime_tributario_simples_nacional">Regime de Apuracao SN</Label>
                <Select value={configs.regime_tributario_simples_nacional} onValueChange={(v) => handleChange('regime_tributario_simples_nacional', v)}>
                  <SelectTrigger id="regime_tributario_simples_nacional">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nao_enviar">Nao enviar</SelectItem>
                    <SelectItem value="1">1 - Tributos federais e municipal pelo SN</SelectItem>
                    <SelectItem value="2">2 - Tributos federais pelo SN, ISSQN pela legislacao municipal</SelectItem>
                    <SelectItem value="3">3 - Tributos pela NFS-e conforme legislacoes de cada tributo</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Regime de apuracao tributaria (regApTribSN). Exigido por alguns provedores (ex: Olinda/Tinus).
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="regime_especial_tributacao">Regime Especial de Tributacao</Label>
                <Select value={configs.regime_especial_tributacao} onValueChange={(v) => handleChange('regime_especial_tributacao', v)}>
                  <SelectTrigger id="regime_especial_tributacao">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nao_enviar">Nao enviar</SelectItem>
                    <SelectItem value="0">0 - Nenhum</SelectItem>
                    <SelectItem value="1">1 - Cooperativa</SelectItem>
                    <SelectItem value="2">2 - Estimativa</SelectItem>
                    <SelectItem value="3">3 - Microempresa Municipal</SelectItem>
                    <SelectItem value="4">4 - Notario ou Registrador</SelectItem>
                    <SelectItem value="5">5 - Profissional Autonomo</SelectItem>
                    <SelectItem value="6">6 - Sociedade de Profissionais</SelectItem>
                    {configs.tipo_nfse === 'nfsen' && <SelectItem value="9">9 - Outros</SelectItem>}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {configs.tipo_nfse === 'nfsen' 
                    ? 'NFSe Nacional (regEspTrib). Aceita 0-9.' 
                    : 'Legacy (ABRASF). Aceita 1-6. Valor "0" nao sera enviado.'}
                </p>
              </div>

              {/* Campos exclusivos NFSe Nacional */}
              {configs.tipo_nfse === 'nfsen' && (
                <div className="space-y-2">
                  <Label htmlFor="tributacao_iss">Tributacao do ISSQN</Label>
                  <Select value={configs.tributacao_iss} onValueChange={(v) => handleChange('tributacao_iss', v)}>
                    <SelectTrigger id="tributacao_iss">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 - Operacao tributavel</SelectItem>
                      <SelectItem value="2">2 - Imunidade</SelectItem>
                      <SelectItem value="3">3 - Exportacao de servico</SelectItem>
                      <SelectItem value="4">4 - Nao Incidencia</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">NFSe Nacional (tribISSQN).</p>
                </div>
              )}

              {configs.tipo_nfse === 'nfsen' && (
                <div className="space-y-2">
                  <Label htmlFor="tipo_retencao_iss">Tipo de Retencao ISSQN</Label>
                  <Select value={configs.tipo_retencao_iss} onValueChange={(v) => handleChange('tipo_retencao_iss', v)}>
                    <SelectTrigger id="tipo_retencao_iss">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 - Nao Retido</SelectItem>
                      <SelectItem value="2">2 - Retido pelo Tomador</SelectItem>
                      <SelectItem value="3">3 - Retido pelo Intermediario</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">NFSe Nacional (tpRetISSQN).</p>
                </div>
              )}
            </div>

            <Separator className="my-2" />
            <p className="text-sm font-medium text-muted-foreground">Codigos de Servico</p>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="item_lista_servico">
                  {configs.tipo_nfse === 'nfsen' ? 'Codigo Tributacao Nacional (cTribNac)' : 'Item da Lista de Servico'}
                </Label>
                <Input 
                  id="item_lista_servico"
                  value={configs.item_lista_servico}
                  onChange={(e) => {
                    const valor = configs.tipo_nfse === 'nfsen' 
                      ? e.target.value.replace(/\D/g, '').slice(0, 6)
                      : e.target.value.replace(/[^\d.]/g, '');
                    handleChange('item_lista_servico', valor);
                  }}
                  placeholder={configs.tipo_nfse === 'nfsen' ? 'Ex: 130501' : 'Ex: 13.05'}
                />
                <p className="text-xs text-muted-foreground">
                  {configs.tipo_nfse === 'nfsen' 
                    ? 'Informe exatamente 6 digitos: Item(2) + Subitem(2) + Desdobro(2). Ex: 130501.' 
                    : 'Formato conforme o municipio (ex: 13.05).'}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="codigo_cnae">Codigo CNAE</Label>
                <Input 
                  id="codigo_cnae"
                  value={configs.codigo_cnae}
                  onChange={(e) => {
                    const valor = e.target.value.replace(/\D/g, '').slice(0, 7);
                    handleChange('codigo_cnae', valor);
                  }}
                  placeholder="Ex: 1813000"
                  maxLength={7}
                />
                <p className="text-xs text-muted-foreground">Maximo 7 digitos (sem separadores).</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="codigo_nbs">Codigo NBS</Label>
                <Input 
                  id="codigo_nbs"
                  value={configs.codigo_nbs}
                  onChange={(e) => {
                    const valor = e.target.value.replace(/\D/g, '').slice(0, 9);
                    handleChange('codigo_nbs', valor);
                  }}
                  placeholder="Ex: 114011200"
                  maxLength={9}
                />
                <p className="text-xs text-muted-foreground">Nomenclatura Brasileira de Servicos (opcional).</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="codigo_tributario_municipio">Codigo Tributario do Municipio</Label>
                <Input 
                  id="codigo_tributario_municipio"
                  value={configs.codigo_tributario_municipio}
                  onChange={(e) => handleChange('codigo_tributario_municipio', e.target.value)}
                  placeholder="Opcional"
                />
                <p className="text-xs text-muted-foreground">Deixe vazio se o municipio nao exigir (ex: Olinda/PE).</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Botão Salvar */}
        <div className="flex justify-end gap-3 pb-8">
          <Button variant="outline" onClick={() => navigate('/configuracoes')}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...</>
            ) : (
              <><Save className="mr-2 h-4 w-4" /> Salvar Configuracoes</>
            )}
          </Button>
        </div>
      </div>
    </motion.div>
  );
};

export default NfeSettingsPage;
