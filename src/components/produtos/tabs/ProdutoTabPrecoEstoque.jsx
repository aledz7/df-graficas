import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, Plus, Trash2, Info } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';

const TIPOS_PRECIFICACAO = [
  { value: 'unidade', label: 'Por Unidade', descricao: 'Preço fixo por unidade vendida' },
  { value: 'quantidade_definida', label: 'Por Quantidade Definidas', descricao: 'Preços específicos para quantidades exatas' },
  { value: 'm2_cm2', label: 'Por M²/CM²', descricao: 'Preço calculado pela área em metros ou centímetros quadrados' },
  { value: 'm2_cm2_tabelado', label: 'Por M²/CM² Tabelado', descricao: 'Tabela de preços por faixas de área' },
  { value: 'metro_linear', label: 'Por Metro Linear', descricao: 'Preço calculado pelo comprimento em metros' },
  { value: 'faixa_quantidade', label: 'Por Faixa de Quantidades', descricao: 'Preços escalonados por intervalos de quantidade' },
];

const ProdutoTabPrecoEstoque = ({ currentProduto, handleInputChange }) => {
  const isUnidadeMetroQuadrado = (currentProduto.unidadeMedida || currentProduto.unidade_medida) === 'm2';
  const isDigital = Boolean(currentProduto.is_digital);
  const deveControlarEstoque = !currentProduto.isComposto && !isDigital;
  const controlarEstoqueManual = currentProduto.controlar_estoque_manual ?? false;
  
  // Handler customizado para cálculo bidirecional de margem de lucro
  const handlePrecoChange = (e) => {
    const { name, value } = e.target;
    const tipoPrecificacao = currentProduto.tipo_precificacao || 'unidade';
    
    // Determinar qual campo de preço de venda usar baseado no tipo
    const campoVenda = tipoPrecificacao === 'm2_cm2' ? 'preco_m2' 
                      : tipoPrecificacao === 'metro_linear' ? 'preco_metro_linear'
                      : 'preco_venda';
    
    const precoCusto = parseFloat(currentProduto.preco_custo) || 0;
    const margemLucro = parseFloat(currentProduto.margem_lucro) || 0;
    const precoVendaAtual = parseFloat(currentProduto[campoVenda]) || 0;
    
    if (name === 'margem_lucro') {
      // Se alterou a margem de lucro, calcular o preço de venda
      if (precoCusto > 0 && value) {
        const novaMargem = parseFloat(value) || 0;
        const novoPrecoVenda = precoCusto + (precoCusto * novaMargem / 100);
        handleInputChange({
          target: { name: campoVenda, value: novoPrecoVenda.toFixed(2), type: 'number' }
        });
      }
      // Continuar com o handler normal para atualizar margem_lucro
      handleInputChange(e);
    } else if (name === campoVenda) {
      // Se alterou o preço de venda, calcular a margem de lucro
      if (precoCusto > 0 && value) {
        const novoPrecoVenda = parseFloat(value) || 0;
        if (novoPrecoVenda > 0) {
          const novaMargem = ((novoPrecoVenda - precoCusto) / precoCusto) * 100;
          handleInputChange({
            target: { name: 'margem_lucro', value: novaMargem.toFixed(2), type: 'number' }
          });
        }
      }
      // Continuar com o handler normal para atualizar o preço de venda
      handleInputChange(e);
    } else if (name === 'preco_custo') {
      // Se alterou o preço de custo e já tem margem de lucro, recalcular preço de venda
      if (margemLucro > 0 && value) {
        const novoCusto = parseFloat(value) || 0;
        if (novoCusto > 0) {
          const novoPrecoVenda = novoCusto + (novoCusto * margemLucro / 100);
          handleInputChange({
            target: { name: campoVenda, value: novoPrecoVenda.toFixed(2), type: 'number' }
          });
        }
      }
      // Continuar com o handler normal para atualizar preco_custo
      handleInputChange(e);
    } else {
      // Para outros campos, usar o handler normal
      handleInputChange(e);
    }
  };
  const [medidasChapa, setMedidasChapa] = React.useState({
    largura: '',
    altura: '',
  });
  const [quantidadeChapas, setQuantidadeChapas] = React.useState('1');
  const quantidadeInicializadaRef = React.useRef(false);

  // Tipo de precificação selecionado
  const tipoPrecificacao = currentProduto.tipo_precificacao || 'unidade';

  // Tabela de preços para quantidade definida e faixas
  const tabelaPrecos = currentProduto.tabela_precos || [];

  // Funções para gerenciar tabela de preços
  const handleAddFaixa = () => {
    const novaFaixa = tipoPrecificacao === 'quantidade_definida' 
      ? { quantidade: '', preco: '' }
      : tipoPrecificacao === 'faixa_quantidade'
      ? { quantidade_min: '', quantidade_max: '', preco: '' }
      : { area_min: '', area_max: '', preco: '' };
    
    handleInputChange({
      target: {
        name: 'tabela_precos',
        value: [...tabelaPrecos, novaFaixa],
      },
    });
  };

  const handleRemoveFaixa = (index) => {
    const novaTabela = tabelaPrecos.filter((_, i) => i !== index);
    handleInputChange({
      target: {
        name: 'tabela_precos',
        value: novaTabela,
      },
    });
  };

  const handleFaixaChange = (index, campo, valor) => {
    const novaTabela = [...tabelaPrecos];
    novaTabela[index] = { ...novaTabela[index], [campo]: valor };
    handleInputChange({
      target: {
        name: 'tabela_precos',
        value: novaTabela,
      },
    });
  };

  const handleTipoPrecificacaoChange = (novoTipo) => {
    handleInputChange({
      target: {
        name: 'tipo_precificacao',
        value: novoTipo,
      },
    });
    // Limpar tabela de preços ao mudar o tipo
    handleInputChange({
      target: {
        name: 'tabela_precos',
        value: [],
      },
    });
  };

  const formatarNumero = (valor, casasDecimais = 4) => {
    if (valor === '' || valor === null || valor === undefined || isNaN(valor)) {
      return '';
    }
    return parseFloat(valor).toFixed(casasDecimais);
  };

  const formatarMedidaParaInput = (valorEmCentimetros) => {
    const numero = parseFloat(valorEmCentimetros);
    if (isNaN(numero)) {
      return '';
    }
    const metros = numero / 100;
    return metros.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    });
  };

  const handleMedidaInputChange = (campo) => (event) => {
    const valorDigitado = event.target.value;
    if (valorDigitado && !/^[0-9]*[.,]?[0-9]*$/.test(valorDigitado)) {
      return;
    }

    const valorNormalizado = valorDigitado.replace('.', ',');
    setMedidasChapa((prev) => ({
      ...prev,
      [campo]: valorNormalizado,
    }));
  };

  const handleMedidaBlur = (campoProduto, campoState) => () => {
    const valorAtual = medidasChapa[campoState];
    const valorNormalizado = valorAtual.replace(/\./g, '').replace(',', '.');
    let valorConvertido = '';

    if (valorNormalizado !== '') {
      const numero = parseFloat(valorNormalizado);
      if (!isNaN(numero)) {
        valorConvertido = (numero * 100).toString();
        setMedidasChapa((prev) => ({
          ...prev,
          [campoState]: numero.toLocaleString('pt-BR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 4,
          }),
        }));
      } else {
        setMedidasChapa((prev) => ({ ...prev, [campoState]: '' }));
      }
    } else {
      setMedidasChapa((prev) => ({ ...prev, [campoState]: '' }));
    }

    handleInputChange({
      target: {
        name: campoProduto,
        value: valorConvertido,
        type: 'text',
      },
    });
  };

  // Ref para armazenar as últimas medidas usadas no cálculo
  const ultimasMedidasRef = React.useRef({ largura: null, altura: null });

  React.useEffect(() => {
    if (!isUnidadeMetroQuadrado) {
      setMedidasChapa({ largura: '', altura: '' });
      setQuantidadeChapas('1');
      quantidadeInicializadaRef.current = false;
      ultimasMedidasRef.current = { largura: null, altura: null };
      return;
    }

    const larguraCm = parseFloat(currentProduto.medida_chapa_largura_cm);
    const alturaCm = parseFloat(currentProduto.medida_chapa_altura_cm);

    // Verificar se as medidas mudaram significativamente
    const medidasMudaram = 
      ultimasMedidasRef.current.largura !== larguraCm ||
      ultimasMedidasRef.current.altura !== alturaCm;

    if (medidasMudaram) {
      quantidadeInicializadaRef.current = false;
      ultimasMedidasRef.current = { largura: larguraCm, altura: alturaCm };
    }

    setMedidasChapa({
      largura: formatarMedidaParaInput(currentProduto.medida_chapa_largura_cm),
      altura: formatarMedidaParaInput(currentProduto.medida_chapa_altura_cm),
    });

    // Calcular quantidade de chapas a partir do estoque atual APENAS na primeira inicialização
    // ou quando as medidas mudarem (não quando o estoque mudar, para evitar loop)
    if (!quantidadeInicializadaRef.current) {
      const estoqueAtual = parseFloat(currentProduto.estoque);

      if (!isNaN(larguraCm) && !isNaN(alturaCm) && larguraCm > 0 && alturaCm > 0 && !isNaN(estoqueAtual) && estoqueAtual > 0) {
        const larguraMetros = larguraCm / 100;
        const alturaMetros = alturaCm / 100;
        const areaMetrosQuadrados = larguraMetros * alturaMetros;
        
        if (areaMetrosQuadrados > 0) {
          const qtdCalculada = estoqueAtual / areaMetrosQuadrados;
          // Arredondar para o número inteiro mais próximo
          const qtdArredondada = Math.round(qtdCalculada);
          if (qtdArredondada >= 1) {
            setQuantidadeChapas(qtdArredondada.toString());
            quantidadeInicializadaRef.current = true;
          }
        }
      } else {
        setQuantidadeChapas('1');
        quantidadeInicializadaRef.current = true;
      }
    }
  }, [
    isUnidadeMetroQuadrado,
    currentProduto.medida_chapa_largura_cm,
    currentProduto.medida_chapa_altura_cm,
    // Removido currentProduto.estoque das dependências para evitar loop
  ]);

  React.useEffect(() => {
    // Só calcular estoque automaticamente para produtos em metros quadrados
    if (!isUnidadeMetroQuadrado) {
      return;
    }

    const larguraCm = parseFloat(currentProduto.medida_chapa_largura_cm);
    const alturaCm = parseFloat(currentProduto.medida_chapa_altura_cm);
    const qtdChapas = parseFloat(quantidadeChapas) || 1;

    if (isNaN(larguraCm) || isNaN(alturaCm) || larguraCm <= 0 || alturaCm <= 0) {
      if (currentProduto.estoque !== '') {
        handleInputChange({
          target: {
            name: 'estoque',
            value: '',
            type: 'number',
          },
        });
      }
      return;
    }

    const larguraMetros = larguraCm / 100;
    const alturaMetros = alturaCm / 100;
    const areaMetrosQuadrados = larguraMetros * alturaMetros;
    // Multiplicar pela quantidade de chapas
    const estoqueTotal = areaMetrosQuadrados * qtdChapas;
    const estoqueFormatado = formatarNumero(estoqueTotal);

    // Só atualizar se o valor for diferente (evita loop infinito)
    if (formatarNumero(currentProduto.estoque) !== estoqueFormatado) {
      handleInputChange({
        target: {
          name: 'estoque',
          value: estoqueFormatado,
          type: 'number',
        },
      });
    }
  }, [
    isUnidadeMetroQuadrado,
    currentProduto.medida_chapa_largura_cm,
    currentProduto.medida_chapa_altura_cm,
    quantidadeChapas,
    // Removido currentProduto.estoque das dependências para evitar loop
    handleInputChange,
  ]);

  // Renderiza os campos específicos baseado no tipo de precificação
  const renderCamposPrecificacao = () => {
    const tipoInfo = TIPOS_PRECIFICACAO.find(t => t.value === tipoPrecificacao);
    
    switch (tipoPrecificacao) {
      case 'unidade':
        return (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="preco_custo">Preço de Custo (R$)</Label>
              <Input id="preco_custo" name="preco_custo" type="number" step="0.01" value={currentProduto.preco_custo} onChange={handlePrecoChange} placeholder="0.00"/>
            </div>
            <div>
              <Label htmlFor="margem_lucro">Margem de Lucro (%)</Label>
              <Input id="margem_lucro" name="margem_lucro" type="number" step="0.1" min="0" max="1000" value={currentProduto.margem_lucro} onChange={handlePrecoChange} placeholder="Ex: 50"/>
              <p className="text-xs text-muted-foreground mt-1">Preencha % ou preço de venda</p>
            </div>
            <div>
              <Label htmlFor="preco_venda">
                Preço de Venda (R$)
                {currentProduto.isComposto && (
                  <span className="text-xs text-blue-600 ml-2">🔒 Calculado automaticamente</span>
                )}
              </Label>
              <Input 
                id="preco_venda" 
                name="preco_venda" 
                type="number" 
                step="0.01" 
                value={currentProduto.preco_venda} 
                onChange={handlePrecoChange} 
                placeholder="Calculado ou manual"
                disabled={currentProduto.isComposto}
                className={currentProduto.isComposto ? "bg-gray-100 cursor-not-allowed" : ""}
              />
              <p className="text-xs text-muted-foreground mt-1">Preencha % ou preço de venda</p>
            </div>
          </div>
        );

      case 'quantidade_definida':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="preco_custo">Preço de Custo Unitário (R$)</Label>
                <Input id="preco_custo" name="preco_custo" type="number" step="0.01" value={currentProduto.preco_custo} onChange={handleInputChange} placeholder="0.00"/>
              </div>
            </div>
            <div className="rounded-lg border border-blue-200 dark:border-blue-800 p-4 bg-blue-50/50 dark:bg-blue-900/20">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm font-semibold text-blue-800 dark:text-blue-200">Tabela de Preços por Quantidade</p>
                  <p className="text-xs text-blue-600 dark:text-blue-300">Defina preços específicos para quantidades exatas</p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={handleAddFaixa} className="border-blue-300 text-blue-700 hover:bg-blue-100">
                  <Plus size={16} className="mr-1" /> Adicionar Quantidade
                </Button>
              </div>
              {tabelaPrecos.length === 0 ? (
                <p className="text-sm text-gray-500 italic">Nenhuma quantidade definida. Clique em "Adicionar Quantidade" para começar.</p>
              ) : (
                <div className="space-y-2">
                  {tabelaPrecos.map((faixa, index) => (
                    <div key={index} className="flex items-center gap-3 bg-white dark:bg-slate-800 p-3 rounded-md border">
                      <div className="flex-1">
                        <Label className="text-xs">Quantidade</Label>
                        <Input 
                          type="number" 
                          min="1"
                          value={faixa.quantidade || ''} 
                          onChange={(e) => handleFaixaChange(index, 'quantidade', e.target.value)}
                          placeholder="Ex: 100"
                        />
                      </div>
                      <div className="flex-1">
                        <Label className="text-xs">Preço Unitário (R$)</Label>
                        <Input 
                          type="number" 
                          step="0.01"
                          value={faixa.preco || ''} 
                          onChange={(e) => handleFaixaChange(index, 'preco', e.target.value)}
                          placeholder="0.00"
                        />
                      </div>
                      <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveFaixa(index)} className="text-red-500 hover:text-red-700 hover:bg-red-50 mt-5">
                        <Trash2 size={18} />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );

      case 'm2_cm2':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="preco_custo">Preço de Custo por m² (R$)</Label>
                <Input id="preco_custo" name="preco_custo" type="number" step="0.01" value={currentProduto.preco_custo} onChange={handleInputChange} placeholder="0.00"/>
              </div>
              <div>
                <Label htmlFor="margem_lucro">Margem de Lucro (%)</Label>
                <Input id="margem_lucro" name="margem_lucro" type="number" step="0.1" min="0" max="1000" value={currentProduto.margem_lucro} onChange={handlePrecoChange} placeholder="Ex: 50"/>
                <p className="text-xs text-muted-foreground mt-1">Preencha % ou preço de venda</p>
              </div>
              <div>
                <Label htmlFor="preco_m2">Preço de Venda por m² (R$)</Label>
                <Input id="preco_m2" name="preco_m2" type="number" step="0.01" value={currentProduto.preco_m2 !== null && currentProduto.preco_m2 !== undefined ? currentProduto.preco_m2 : ''} onChange={handlePrecoChange} placeholder="0.00"/>
                <p className="text-xs text-muted-foreground mt-1">Preencha % ou preço de venda</p>
              </div>
            </div>
            <div className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 p-3 rounded-md">
              <Info size={16} className="mt-0.5 flex-shrink-0" />
              <p>O valor final será calculado multiplicando o preço por m² pela área informada na ordem de serviço (largura × altura).</p>
            </div>
          </div>
        );

      case 'm2_cm2_tabelado':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="preco_custo">Preço de Custo por m² (R$)</Label>
                <Input id="preco_custo" name="preco_custo" type="number" step="0.01" value={currentProduto.preco_custo} onChange={handleInputChange} placeholder="0.00"/>
              </div>
            </div>
            <div className="rounded-lg border border-green-200 dark:border-green-800 p-4 bg-green-50/50 dark:bg-green-900/20">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm font-semibold text-green-800 dark:text-green-200">Tabela de Preços por Faixa de Área</p>
                  <p className="text-xs text-green-600 dark:text-green-300">Defina preços diferentes para intervalos de área (m²)</p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={handleAddFaixa} className="border-green-300 text-green-700 hover:bg-green-100">
                  <Plus size={16} className="mr-1" /> Adicionar Faixa
                </Button>
              </div>
              {tabelaPrecos.length === 0 ? (
                <p className="text-sm text-gray-500 italic">Nenhuma faixa definida. Clique em "Adicionar Faixa" para começar.</p>
              ) : (
                <div className="space-y-2">
                  {tabelaPrecos.map((faixa, index) => (
                    <div key={index} className="flex items-center gap-3 bg-white dark:bg-slate-800 p-3 rounded-md border">
                      <div className="flex-1">
                        <Label className="text-xs">Área Mínima (m²)</Label>
                        <Input 
                          type="number" 
                          step="0.01"
                          min="0"
                          value={faixa.area_min || ''} 
                          onChange={(e) => handleFaixaChange(index, 'area_min', e.target.value)}
                          placeholder="0.00"
                        />
                      </div>
                      <div className="flex-1">
                        <Label className="text-xs">Área Máxima (m²)</Label>
                        <Input 
                          type="number" 
                          step="0.01"
                          min="0"
                          value={faixa.area_max || ''} 
                          onChange={(e) => handleFaixaChange(index, 'area_max', e.target.value)}
                          placeholder="Ex: 1.00"
                        />
                      </div>
                      <div className="flex-1">
                        <Label className="text-xs">Preço por m² (R$)</Label>
                        <Input 
                          type="number" 
                          step="0.01"
                          value={faixa.preco || ''} 
                          onChange={(e) => handleFaixaChange(index, 'preco', e.target.value)}
                          placeholder="0.00"
                        />
                      </div>
                      <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveFaixa(index)} className="text-red-500 hover:text-red-700 hover:bg-red-50 mt-5">
                        <Trash2 size={18} />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );

      case 'metro_linear':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="preco_custo">Preço de Custo por Metro (R$)</Label>
                <Input id="preco_custo" name="preco_custo" type="number" step="0.01" value={currentProduto.preco_custo} onChange={handlePrecoChange} placeholder="0.00"/>
              </div>
              <div>
                <Label htmlFor="margem_lucro">Margem de Lucro (%)</Label>
                <Input id="margem_lucro" name="margem_lucro" type="number" step="0.1" min="0" max="1000" value={currentProduto.margem_lucro} onChange={handlePrecoChange} placeholder="Ex: 50"/>
                <p className="text-xs text-muted-foreground mt-1">Preencha % ou preço de venda</p>
              </div>
              <div>
                <Label htmlFor="preco_metro_linear">Preço de Venda por Metro (R$)</Label>
                <Input id="preco_metro_linear" name="preco_metro_linear" type="number" step="0.01" value={currentProduto.preco_metro_linear || ''} onChange={handlePrecoChange} placeholder="0.00"/>
                <p className="text-xs text-muted-foreground mt-1">Preencha % ou preço de venda</p>
              </div>
            </div>
            <div className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 p-3 rounded-md">
              <Info size={16} className="mt-0.5 flex-shrink-0" />
              <p>O valor final será calculado multiplicando o preço por metro pelo comprimento informado na ordem de serviço.</p>
            </div>
          </div>
        );

      case 'faixa_quantidade':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="preco_custo">Preço de Custo Unitário (R$)</Label>
                <Input id="preco_custo" name="preco_custo" type="number" step="0.01" value={currentProduto.preco_custo} onChange={handleInputChange} placeholder="0.00"/>
              </div>
            </div>
            <div className="rounded-lg border border-purple-200 dark:border-purple-800 p-4 bg-purple-50/50 dark:bg-purple-900/20">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm font-semibold text-purple-800 dark:text-purple-200">Tabela de Preços por Faixa de Quantidade</p>
                  <p className="text-xs text-purple-600 dark:text-purple-300">Defina preços escalonados por intervalos de quantidade</p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={handleAddFaixa} className="border-purple-300 text-purple-700 hover:bg-purple-100">
                  <Plus size={16} className="mr-1" /> Adicionar Faixa
                </Button>
              </div>
              {tabelaPrecos.length === 0 ? (
                <p className="text-sm text-gray-500 italic">Nenhuma faixa definida. Clique em "Adicionar Faixa" para começar.</p>
              ) : (
                <div className="space-y-2">
                  {tabelaPrecos.map((faixa, index) => (
                    <div key={index} className="flex items-center gap-3 bg-white dark:bg-slate-800 p-3 rounded-md border">
                      <div className="flex-1">
                        <Label className="text-xs">Quantidade Mínima</Label>
                        <Input 
                          type="number" 
                          min="1"
                          value={faixa.quantidade_min || ''} 
                          onChange={(e) => handleFaixaChange(index, 'quantidade_min', e.target.value)}
                          placeholder="1"
                        />
                      </div>
                      <div className="flex-1">
                        <Label className="text-xs">Quantidade Máxima</Label>
                        <Input 
                          type="number" 
                          min="1"
                          value={faixa.quantidade_max || ''} 
                          onChange={(e) => handleFaixaChange(index, 'quantidade_max', e.target.value)}
                          placeholder="100"
                        />
                      </div>
                      <div className="flex-1">
                        <Label className="text-xs">Preço Unitário (R$)</Label>
                        <Input 
                          type="number" 
                          step="0.01"
                          value={faixa.preco || ''} 
                          onChange={(e) => handleFaixaChange(index, 'preco', e.target.value)}
                          placeholder="0.00"
                        />
                      </div>
                      <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveFaixa(index)} className="text-red-500 hover:text-red-700 hover:bg-red-50 mt-5">
                        <Trash2 size={18} />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Precificação e Estoque</CardTitle>
        <CardDescription>Defina os valores de custo, venda e controle de estoque.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Seletor de Tipo de Precificação */}
        <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-4 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
            <div>
              <Label htmlFor="tipo_precificacao" className="text-base font-semibold">Tipo de Precificação</Label>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                Escolha como o preço deste produto será calculado
              </p>
              <Select value={tipoPrecificacao} onValueChange={handleTipoPrecificacaoChange}>
                <SelectTrigger className="bg-white dark:bg-slate-800">
                  <SelectValue placeholder="Selecione o tipo..." />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS_PRECIFICACAO.map((tipo) => (
                    <SelectItem key={tipo.value} value={tipo.value}>
                      {tipo.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-800 p-3 rounded-md border border-slate-200 dark:border-slate-700">
              <Info size={16} className="mt-0.5 flex-shrink-0 text-blue-500" />
              <p>{TIPOS_PRECIFICACAO.find(t => t.value === tipoPrecificacao)?.descricao}</p>
            </div>
          </div>
        </div>

        {/* Campos dinâmicos baseados no tipo de precificação */}
        <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-4">
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-3">
            Configuração de Preços - {TIPOS_PRECIFICACAO.find(t => t.value === tipoPrecificacao)?.label}
          </p>
          {renderCamposPrecificacao()}
        </div>
        {isUnidadeMetroQuadrado && (
          <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-4 space-y-3 bg-slate-50/60 dark:bg-slate-900/30">
            <div>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Medidas da Chapa (para consumo de material)</p>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Informe as dimensões padrão da chapa em metros; converteremos automaticamente para centímetros ao salvar
                e recalcularemos o estoque disponível em m², preservando a compatibilidade com o restante do sistema.
                Esses dados serão utilizados nas Ordens de Serviço.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="medida_chapa_largura_cm">Largura da Chapa (m)</Label>
                <Input
                  id="medida_chapa_largura_cm"
                  name="medida_chapa_largura_cm"
                  type="text"
                  inputMode="decimal"
                  pattern="[0-9]*[\\.,]?[0-9]*"
                  value={medidasChapa.largura}
                  onChange={handleMedidaInputChange('largura')}
                  onBlur={handleMedidaBlur('medida_chapa_largura_cm', 'largura')}
                  placeholder="Ex: 1,00"
                />
              </div>
              <div>
                <Label htmlFor="medida_chapa_altura_cm">Altura da Chapa (m)</Label>
                <Input
                  id="medida_chapa_altura_cm"
                  name="medida_chapa_altura_cm"
                  type="text"
                  inputMode="decimal"
                  pattern="[0-9]*[\\.,]?[0-9]*"
                  value={medidasChapa.altura}
                  onChange={handleMedidaInputChange('altura')}
                  onBlur={handleMedidaBlur('medida_chapa_altura_cm', 'altura')}
                  placeholder="Ex: 1,80"
                />
              </div>
              <div>
                <Label htmlFor="quantidade_chapas">Quantidade de Chapas</Label>
                <Input
                  id="quantidade_chapas"
                  name="quantidade_chapas"
                  type="number"
                  min="1"
                  step="1"
                  value={quantidadeChapas}
                  onChange={(e) => {
                    const valor = e.target.value;
                    if (valor === '' || (parseFloat(valor) >= 1)) {
                      setQuantidadeChapas(valor);
                      // Marcar como inicializado quando o usuário editar manualmente
                      quantidadeInicializadaRef.current = true;
                    }
                  }}
                  placeholder="Ex: 1"
                />
                <p className="text-xs text-gray-500 mt-1">Número de chapas em estoque</p>
              </div>
              <div>
                <Label htmlFor="valor_chapa">Valor Unitário da Chapa (R$)</Label>
                <Input
                  id="valor_chapa"
                  name="valor_chapa"
                  type="number"
                  step="0.01"
                  value={currentProduto.valor_chapa}
                  onChange={handleInputChange}
                  placeholder="Ex: 120,00"
                />
              </div>
            </div>
          </div>
        )}
        {/* Checkbox para controlar estoque manualmente */}
        {deveControlarEstoque && !isUnidadeMetroQuadrado && (
          <div className="flex items-center space-x-2 p-3 bg-slate-50 dark:bg-slate-800 rounded-md border border-slate-200 dark:border-slate-700">
            <Checkbox
              id="controlar_estoque_manual"
              checked={controlarEstoqueManual}
              onCheckedChange={(checked) => {
                handleInputChange({
                  target: {
                    name: 'controlar_estoque_manual',
                    checked: checked,
                    type: 'checkbox'
                  }
                });
              }}
            />
            <Label htmlFor="controlar_estoque_manual" className="text-sm font-medium cursor-pointer">
              Controlar estoque manualmente
            </Label>
            <Info size={14} className="text-muted-foreground ml-2" />
            <p className="text-xs text-muted-foreground ml-2">
              Marque esta opção se deseja controlar o estoque deste item. Quando marcado, será necessário informar quantidade atual, quantidade mínima, etc.
            </p>
          </div>
        )}

        {isDigital && (
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
            <p className="text-xs text-blue-800 dark:text-blue-200">
              Produto digital ativo: o sistema ignora controle e baixa de estoque neste produto.
            </p>
          </div>
        )}
        
         <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {!isDigital && (
            <div>
                <Label htmlFor="estoque">
                  Estoque Atual {isUnidadeMetroQuadrado ? '(m²)' : ''}
                  {controlarEstoqueManual && !isUnidadeMetroQuadrado && <span className="text-red-500"> *</span>}
                </Label>
                <Input
                  id="estoque"
                  name="estoque"
                  type="number"
                  step="0.01"
                  value={currentProduto.estoque}
                  onChange={handleInputChange}
                  placeholder="0"
                  required={controlarEstoqueManual && !isUnidadeMetroQuadrado}
                  readOnly={isUnidadeMetroQuadrado}
                  disabled={isDigital || (!controlarEstoqueManual && !isUnidadeMetroQuadrado && deveControlarEstoque)}
                  className={isUnidadeMetroQuadrado || isDigital ? "bg-gray-100 cursor-not-allowed" : (!controlarEstoqueManual && !isUnidadeMetroQuadrado ? "bg-gray-100 cursor-not-allowed" : "")}
                />
                {isUnidadeMetroQuadrado ? (
                  <p className="text-xs text-gray-500 mt-1">
                    Calculado automaticamente: (Largura × Altura) × Quantidade de Chapas = {currentProduto.estoque || '0'} m²
                  </p>
                ) : isDigital ? (
                  <p className="text-xs text-gray-500 mt-1">Produto digital não utiliza estoque.</p>
                ) : !deveControlarEstoque ? (
                  <p className="text-xs text-gray-500 mt-1">Controle de estoque desativado para item composto.</p>
                ) : !controlarEstoqueManual ? (
                  <p className="text-xs text-gray-500 mt-1">Marque "Controlar estoque manualmente" para habilitar este campo.</p>
                ) : (
                  <p className="text-xs text-gray-500 mt-1">Informe a quantidade em estoque.</p>
                )}
            </div>
            )}
            {!isDigital && (
            <div>
                <Label htmlFor="estoque_minimo">
                  Estoque Mínimo
                  {controlarEstoqueManual && !isUnidadeMetroQuadrado && <span className="text-red-500"> *</span>}
                </Label>
                <Input 
                  id="estoque_minimo" 
                  name="estoque_minimo" 
                  type="number" 
                  step="0.01" 
                  value={currentProduto.estoque_minimo} 
                  onChange={handleInputChange} 
                  placeholder="1"
                  required={controlarEstoqueManual && !isUnidadeMetroQuadrado}
                  disabled={isDigital || (!controlarEstoqueManual && !isUnidadeMetroQuadrado)}
                  className={isDigital || (!controlarEstoqueManual && !isUnidadeMetroQuadrado) ? "bg-gray-100 cursor-not-allowed" : ""}
                />
                <p className="text-xs text-gray-500 mt-1">Aceita valores fracionados (ex: 1.5, 5.25)</p>
            </div>
            )}
            <div>
                <Label htmlFor="valor_minimo">Valor Mínimo de Venda (R$)</Label>
                <Input 
                  id="valor_minimo" 
                  name="valor_minimo" 
                  type="number" 
                  step="0.01" 
                  value={currentProduto.valor_minimo || ''} 
                  onChange={handleInputChange} 
                  placeholder="0.00"
                />
                <p className="text-xs text-gray-500 mt-1">Valor mínimo aplicado quando cálculo for menor (ex: área {"<"} 0,50m²)</p>
            </div>
        </div>
        {/* Alerta de estoque baixo para produto sem variações */}
        {!isDigital && !currentProduto.variacoes_ativa && (currentProduto.estoque && currentProduto.estoque_minimo && parseFloat(currentProduto.estoque) <= parseFloat(currentProduto.estoque_minimo)) && (
            <div className="flex items-center text-sm text-orange-600 bg-orange-100 dark:bg-orange-900/30 p-2 rounded-md">
                <AlertTriangle size={16} className="mr-2"/>
                Atenção: Estoque atual igual ou abaixo do mínimo!
            </div>
        )}
        
        {/* Alerta específico para variações com estoque baixo */}
        {!isDigital && currentProduto.variacoes_ativa && currentProduto.variacoes && currentProduto.variacoes.length > 0 && (() => {
            const variacoesComEstoqueBaixo = currentProduto.variacoes.filter(variacao => {
                const estoqueBruto = variacao.estoque_var;
                const estoqueFoiInformado = estoqueBruto !== '' && estoqueBruto !== null && estoqueBruto !== undefined;
                if (!estoqueFoiInformado) {
                    return false;
                }

                const estoqueVariacao = parseFloat(estoqueBruto);
                if (isNaN(estoqueVariacao)) {
                    return false;
                }

                const estoqueMinimo = parseFloat(currentProduto.estoque_minimo || 0);
                return estoqueVariacao <= estoqueMinimo;
            });
            
            if (variacoesComEstoqueBaixo.length > 0) {
                return (
                    <div className="space-y-2">
                        {variacoesComEstoqueBaixo.map((variacao, index) => {
                            const nomeVariacao = variacao.nome || `Variação ${index + 1}`;
                            
                            return (
                                <div key={index} className="flex items-center text-sm text-orange-600 bg-orange-100 dark:bg-orange-900/30 p-2 rounded-md">
                                    <AlertTriangle size={16} className="mr-2"/>
                                    <span>
                                        <strong>Variação "{nomeVariacao}"</strong> está com estoque baixo 
                                        ({variacao.estoque_var || 0} unidades)
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                );
            }
            return null;
        })()}
      </CardContent>
    </Card>
  );
};

export default ProdutoTabPrecoEstoque;