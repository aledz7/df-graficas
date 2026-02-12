import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Calculator, RotateCw, Maximize2, Settings, Save, Trash2, Plus } from 'lucide-react';
import { aproveitamentoFolhaService } from '@/services/api';
import { useToast } from '@/components/ui/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

const AproveitamentoFolhaPage = () => {
  const { toast } = useToast();
  const [tipoFolha, setTipoFolha] = useState('A4');
  const [larguraFolha, setLarguraFolha] = useState('');
  const [alturaFolha, setAlturaFolha] = useState('');
  const [itemLargura, setItemLargura] = useState('');
  const [itemAltura, setItemAltura] = useState('');
  const [margemSuperior, setMargemSuperior] = useState('3');
  const [margemInferior, setMargemInferior] = useState('3');
  const [margemEsquerda, setMargemEsquerda] = useState('3');
  const [margemDireita, setMargemDireita] = useState('3');
  const [sangria, setSangria] = useState('0');
  const [espacamento, setEspacamento] = useState('0');
  const [impressoraConfigId, setImpressoraConfigId] = useState('');
  const [resultado, setResultado] = useState(null);
  const [loading, setLoading] = useState(false);
  const [impressoras, setImpressoras] = useState([]);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [impressoraEditando, setImpressoraEditando] = useState(null);
  const [nomeImpressora, setNomeImpressora] = useState('');
  const [margensImpressora, setMargensImpressora] = useState({
    superior: '3',
    inferior: '3',
    esquerda: '3',
    direita: '3',
  });

  useEffect(() => {
    carregarImpressoras();
  }, []);

  useEffect(() => {
    if (impressoraConfigId) {
      const impressora = impressoras.find(i => i.id === parseInt(impressoraConfigId));
      if (impressora) {
        setMargemSuperior(impressora.margem_superior_mm.toString());
        setMargemInferior(impressora.margem_inferior_mm.toString());
        setMargemEsquerda(impressora.margem_esquerda_mm.toString());
        setMargemDireita(impressora.margem_direita_mm.toString());
      }
    }
  }, [impressoraConfigId, impressoras]);

  const carregarImpressoras = async () => {
    try {
      const response = await aproveitamentoFolhaService.listarImpressoras();
      if (response.data.success) {
        setImpressoras(response.data.data || []);
        const padrao = response.data.data?.find(i => i.padrao);
        if (padrao) {
          setImpressoraConfigId(padrao.id.toString());
        }
      }
    } catch (error) {
      console.error('Erro ao carregar impressoras:', error);
    }
  };

  const calcular = async () => {
    if (!itemLargura || !itemAltura) {
      toast({
        title: "Erro",
        description: "Informe a largura e altura do item",
        variant: "destructive",
      });
      return;
    }

    if (tipoFolha === 'personalizado' && (!larguraFolha || !alturaFolha)) {
      toast({
        title: "Erro",
        description: "Informe a largura e altura da folha personalizada",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const dados = {
        tipo_folha: tipoFolha,
        item_largura_mm: parseFloat(itemLargura),
        item_altura_mm: parseFloat(itemAltura),
        margem_superior_mm: parseFloat(margemSuperior) || 0,
        margem_inferior_mm: parseFloat(margemInferior) || 0,
        margem_esquerda_mm: parseFloat(margemEsquerda) || 0,
        margem_direita_mm: parseFloat(margemDireita) || 0,
        sangria_mm: parseFloat(sangria) || 0,
        espacamento_mm: parseFloat(espacamento) || 0,
      };

      if (tipoFolha === 'personalizado') {
        dados.largura_folha = parseFloat(larguraFolha);
        dados.altura_folha = parseFloat(alturaFolha);
      }

      if (impressoraConfigId) {
        dados.impressora_config_id = parseInt(impressoraConfigId);
      }

      const response = await aproveitamentoFolhaService.calcular(dados);
      if (response.data.success) {
        setResultado(response.data.data);
      }
    } catch (error) {
      console.error('Erro ao calcular:', error);
      toast({
        title: "Erro",
        description: error.response?.data?.message || "Erro ao calcular aproveitamento",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const salvarImpressora = async () => {
    if (!nomeImpressora) {
      toast({
        title: "Erro",
        description: "Informe o nome da impressora",
        variant: "destructive",
      });
      return;
    }

    try {
      const dados = {
        id: impressoraEditando?.id || null,
        nome: nomeImpressora,
        margem_superior_mm: parseFloat(margensImpressora.superior) || 0,
        margem_inferior_mm: parseFloat(margensImpressora.inferior) || 0,
        margem_esquerda_mm: parseFloat(margensImpressora.esquerda) || 0,
        margem_direita_mm: parseFloat(margensImpressora.direita) || 0,
        padrao: !impressoraEditando,
        ativo: true,
      };

      await aproveitamentoFolhaService.salvarImpressora(dados);
      toast({
        title: "Sucesso",
        description: impressoraEditando ? "Impressora atualizada!" : "Impressora salva!",
      });
      setConfigDialogOpen(false);
      setImpressoraEditando(null);
      setNomeImpressora('');
      setMargensImpressora({ superior: '3', inferior: '3', esquerda: '3', direita: '3' });
      carregarImpressoras();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao salvar impressora",
        variant: "destructive",
      });
    }
  };

  const excluirImpressora = async (id) => {
    if (!confirm('Tem certeza que deseja excluir esta configuração?')) {
      return;
    }

    try {
      await aproveitamentoFolhaService.excluirImpressora(id);
      toast({
        title: "Sucesso",
        description: "Impressora excluída!",
      });
      carregarImpressoras();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao excluir impressora",
        variant: "destructive",
      });
    }
  };

  const abrirDialogImpressora = (impressora = null) => {
    if (impressora) {
      setImpressoraEditando(impressora);
      setNomeImpressora(impressora.nome);
      setMargensImpressora({
        superior: impressora.margem_superior_mm.toString(),
        inferior: impressora.margem_inferior_mm.toString(),
        esquerda: impressora.margem_esquerda_mm.toString(),
        direita: impressora.margem_direita_mm.toString(),
      });
    } else {
      setImpressoraEditando(null);
      setNomeImpressora('');
      setMargensImpressora({ superior: '3', inferior: '3', esquerda: '3', direita: '3' });
    }
    setConfigDialogOpen(true);
  };

  const formatarNumero = (num) => {
    return new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(num);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Cálculo de Aproveitamento de Folha</h1>
          <p className="text-muted-foreground mt-1">
            Calcule quantas unidades cabem em uma folha considerando margens da impressora
          </p>
        </div>
        <Dialog open={configDialogOpen} onOpenChange={setConfigDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" onClick={() => abrirDialogImpressora()}>
              <Settings className="h-4 w-4 mr-2" />
              Configurar Impressoras
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {impressoraEditando ? 'Editar Impressora' : 'Nova Impressora'}
              </DialogTitle>
              <DialogDescription>
                Configure as margens não-imprimíveis da impressora
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Nome da Impressora</Label>
                <Input
                  value={nomeImpressora}
                  onChange={(e) => setNomeImpressora(e.target.value)}
                  placeholder="Ex: Impressora HP LaserJet"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Margem Superior (mm)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={margensImpressora.superior}
                    onChange={(e) => setMargensImpressora({ ...margensImpressora, superior: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Margem Inferior (mm)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={margensImpressora.inferior}
                    onChange={(e) => setMargensImpressora({ ...margensImpressora, inferior: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Margem Esquerda (mm)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={margensImpressora.esquerda}
                    onChange={(e) => setMargensImpressora({ ...margensImpressora, esquerda: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Margem Direita (mm)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={margensImpressora.direita}
                    onChange={(e) => setMargensImpressora({ ...margensImpressora, direita: e.target.value })}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfigDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={salvarImpressora}>
                <Save className="h-4 w-4 mr-2" />
                Salvar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Formulário */}
        <Card>
          <CardHeader>
            <CardTitle>Dados do Cálculo</CardTitle>
            <CardDescription>Informe as dimensões e configurações</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Tipo de Folha */}
            <div>
              <Label>Tipo de Folha</Label>
              <Select value={tipoFolha} onValueChange={(v) => {
                setTipoFolha(v);
                if (v !== 'personalizado') {
                  setLarguraFolha('');
                  setAlturaFolha('');
                }
              }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="A4">A4 (210 × 297 mm)</SelectItem>
                  <SelectItem value="A3">A3 (297 × 420 mm)</SelectItem>
                  <SelectItem value="personalizado">Personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Dimensões da folha personalizada */}
            {tipoFolha === 'personalizado' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Largura da Folha (mm)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={larguraFolha}
                    onChange={(e) => setLarguraFolha(e.target.value)}
                    placeholder="210"
                  />
                </div>
                <div>
                  <Label>Altura da Folha (mm)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={alturaFolha}
                    onChange={(e) => setAlturaFolha(e.target.value)}
                    placeholder="297"
                  />
                </div>
              </div>
            )}

            {/* Configuração de Impressora */}
            {impressoras.length > 0 && (
              <div>
                <Label>Configuração de Impressora (opcional)</Label>
                <Select value={impressoraConfigId} onValueChange={setImpressoraConfigId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma impressora" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Usar margens manuais</SelectItem>
                    {impressoras.map(imp => (
                      <SelectItem key={imp.id} value={imp.id.toString()}>
                        {imp.nome} {imp.padrao && '(Padrão)'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Dimensões do Item */}
            <Separator />
            <div>
              <Label className="text-base font-semibold">Dimensões do Item a Imprimir</Label>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Largura (mm)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={itemLargura}
                  onChange={(e) => setItemLargura(e.target.value)}
                  placeholder="100"
                />
              </div>
              <div>
                <Label>Altura (mm)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={itemAltura}
                  onChange={(e) => setItemAltura(e.target.value)}
                  placeholder="150"
                />
              </div>
            </div>

            {/* Margens (se não selecionou impressora) */}
            {!impressoraConfigId && (
              <>
                <Separator />
                <div>
                  <Label className="text-base font-semibold">Margens da Impressora (mm)</Label>
                  <p className="text-sm text-muted-foreground mb-2">
                    Área não-imprimível da impressora
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Superior</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={margemSuperior}
                      onChange={(e) => setMargemSuperior(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Inferior</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={margemInferior}
                      onChange={(e) => setMargemInferior(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Esquerda</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={margemEsquerda}
                      onChange={(e) => setMargemEsquerda(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Direita</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={margemDireita}
                      onChange={(e) => setMargemDireita(e.target.value)}
                    />
                  </div>
                </div>
              </>
            )}

            {/* Opcionais */}
            <Separator />
            <div>
              <Label className="text-base font-semibold">Opcionais</Label>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Sangria (mm)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={sangria}
                  onChange={(e) => setSangria(e.target.value)}
                  placeholder="0"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Margem de segurança para corte
                </p>
              </div>
              <div>
                <Label>Espaçamento entre Itens (mm)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={espacamento}
                  onChange={(e) => setEspacamento(e.target.value)}
                  placeholder="0"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Espaço entre unidades
                </p>
              </div>
            </div>

            <Button 
              onClick={calcular} 
              disabled={loading}
              className="w-full"
              size="lg"
            >
              <Calculator className="h-4 w-4 mr-2" />
              {loading ? 'Calculando...' : 'Calcular Aproveitamento'}
            </Button>
          </CardContent>
        </Card>

        {/* Resultado */}
        <Card>
          <CardHeader>
            <CardTitle>Resultado</CardTitle>
            <CardDescription>Quantidade de unidades por folha</CardDescription>
          </CardHeader>
          <CardContent>
            {!resultado ? (
              <div className="text-center py-12 text-muted-foreground">
                <Calculator className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Preencha os dados e clique em "Calcular Aproveitamento"</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Melhor Resultado */}
                <div className="bg-primary/10 p-4 rounded-lg border-2 border-primary">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-lg">Melhor Resultado</h3>
                    <Badge variant="default" className="text-lg px-3 py-1">
                      {resultado.melhor_resultado.total} unidades
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Disposição</p>
                      <p className="text-xl font-bold">
                        {resultado.melhor_resultado.colunas} × {resultado.melhor_resultado.linhas}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Orientação</p>
                      <div className="flex items-center gap-2">
                        {resultado.melhor_resultado.orientacao === 'girado' && (
                          <RotateCw className="h-4 w-4" />
                        )}
                        <p className="text-xl font-bold capitalize">
                          {resultado.melhor_resultado.orientacao === 'girado' ? 'Girado 90°' : 'Normal'}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4">
                    <p className="text-sm text-muted-foreground">Aproveitamento</p>
                    <p className="text-2xl font-bold text-primary">
                      {formatarNumero(resultado.melhor_resultado.percentual_aproveitamento)}%
                    </p>
                  </div>
                </div>

                {/* Comparação */}
                <div className="space-y-4">
                  <h4 className="font-semibold">Comparação</h4>
                  
                  <div className="grid grid-cols-2 gap-4">
                    {/* Normal */}
                    <div className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">Normal</span>
                        <Badge variant="secondary">
                          {resultado.resultado_normal.total} unid.
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {resultado.resultado_normal.colunas} × {resultado.resultado_normal.linhas}
                      </p>
                    </div>

                    {/* Girado */}
                    <div className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1">
                          <RotateCw className="h-3 w-3" />
                          <span className="font-medium">Girado 90°</span>
                        </div>
                        <Badge variant="secondary">
                          {resultado.resultado_girado.total} unid.
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {resultado.resultado_girado.colunas} × {resultado.resultado_girado.linhas}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Informações da Folha */}
                <Separator />
                <div className="space-y-2">
                  <h4 className="font-semibold">Informações da Folha</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Tipo</p>
                      <p className="font-medium">{resultado.folha.tipo}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Dimensões</p>
                      <p className="font-medium">
                        {formatarNumero(resultado.folha.largura_mm)} × {formatarNumero(resultado.folha.altura_mm)} mm
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Área Útil</p>
                      <p className="font-medium">
                        {formatarNumero(resultado.area_util.largura_mm)} × {formatarNumero(resultado.area_util.altura_mm)} mm
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Área Total</p>
                      <p className="font-medium">
                        {formatarNumero(resultado.folha.area_total_mm2)} mm²
                      </p>
                    </div>
                  </div>
                </div>

                {/* Informações do Item */}
                <Separator />
                <div className="space-y-2">
                  <h4 className="font-semibold">Informações do Item</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Dimensões</p>
                      <p className="font-medium">
                        {formatarNumero(resultado.item.largura_mm)} × {formatarNumero(resultado.item.altura_mm)} mm
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Área</p>
                      <p className="font-medium">
                        {formatarNumero(resultado.item.area_mm2)} mm²
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Lista de Impressoras Configuradas */}
      {impressoras.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Impressoras Configuradas</CardTitle>
            <CardDescription>Gerencie as configurações de margens</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {impressoras.map(imp => (
                <div key={imp.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{imp.nome}</span>
                      {imp.padrao && <Badge variant="default">Padrão</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Margens: {imp.margem_superior_mm}/{imp.margem_inferior_mm}/{imp.margem_esquerda_mm}/{imp.margem_direita_mm} mm
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => abrirDialogImpressora(imp)}
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => excluirImpressora(imp.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AproveitamentoFolhaPage;
