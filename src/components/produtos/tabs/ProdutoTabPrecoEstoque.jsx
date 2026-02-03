import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertTriangle } from 'lucide-react';

const ProdutoTabPrecoEstoque = ({ currentProduto, handleInputChange }) => {
  const isUnidadeMetroQuadrado = (currentProduto.unidadeMedida || currentProduto.unidade_medida) === 'm2';
  const [medidasChapa, setMedidasChapa] = React.useState({
    largura: '',
    altura: '',
  });
  const [quantidadeChapas, setQuantidadeChapas] = React.useState('1');
  const quantidadeInicializadaRef = React.useRef(false);

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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Precificação e Estoque</CardTitle>
        <CardDescription>Defina os valores de custo, venda e controle de estoque.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
                <Label htmlFor="preco_custo">Preço de Custo (R$)</Label>
                <Input id="preco_custo" name="preco_custo" type="number" step="0.01" value={currentProduto.preco_custo} onChange={handleInputChange} placeholder="0.00"/>
            </div>
            <div>
                <Label htmlFor="margem_lucro">Margem de Lucro (%)</Label>
                <Input id="margem_lucro" name="margem_lucro" type="number" step="0.1" min="0" max="1000" value={currentProduto.margem_lucro} onChange={handleInputChange} placeholder="Ex: 50"/>
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
                    onChange={handleInputChange} 
                    placeholder="Calculado ou manual"
                    disabled={currentProduto.isComposto}
                    className={currentProduto.isComposto ? "bg-gray-100 cursor-not-allowed" : ""}
                />
                {currentProduto.isComposto && (
                    <p className="text-xs text-blue-600 mt-1">
                        💡 Este preço é calculado automaticamente baseado na soma dos itens do kit na aba "Composição"
                    </p>
                )}
            </div>
            <div>
                <Label htmlFor="preco_m2">Preço por m² (R$)</Label>
                <Input id="preco_m2" name="preco_m2" type="number" step="0.01" value={currentProduto.preco_m2 !== null && currentProduto.preco_m2 !== undefined ? currentProduto.preco_m2 : ''} onChange={handleInputChange} placeholder="0.00"/>
            </div>
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
         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <Label htmlFor="estoque">
                  Estoque Atual {isUnidadeMetroQuadrado ? '(m²)' : ''} <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="estoque"
                  name="estoque"
                  type="number"
                  step="0.01"
                  value={currentProduto.estoque}
                  onChange={handleInputChange}
                  placeholder="0"
                  readOnly={isUnidadeMetroQuadrado}
                  className={isUnidadeMetroQuadrado ? "bg-gray-100 cursor-not-allowed" : ""}
                />
                {isUnidadeMetroQuadrado ? (
                  <p className="text-xs text-gray-500 mt-1">
                    Calculado automaticamente: (Largura × Altura) × Quantidade de Chapas = {currentProduto.estoque || '0'} m²
                  </p>
                ) : (
                  <p className="text-xs text-gray-500 mt-1">Informe a quantidade em estoque.</p>
                )}
            </div>
            <div>
                <Label htmlFor="estoque_minimo">Estoque Mínimo</Label>
                <Input id="estoque_minimo" name="estoque_minimo" type="number" step="0.01" value={currentProduto.estoque_minimo} onChange={handleInputChange} placeholder="1"/>
                <p className="text-xs text-gray-500 mt-1">Aceita valores fracionados (ex: 1.5, 5.25)</p>
            </div>
        </div>
        {/* Alerta de estoque baixo para produto sem variações */}
        {!currentProduto.variacoes_ativa && (currentProduto.estoque && currentProduto.estoque_minimo && parseFloat(currentProduto.estoque) <= parseFloat(currentProduto.estoque_minimo)) && (
            <div className="flex items-center text-sm text-orange-600 bg-orange-100 dark:bg-orange-900/30 p-2 rounded-md">
                <AlertTriangle size={16} className="mr-2"/>
                Atenção: Estoque atual igual ou abaixo do mínimo!
            </div>
        )}
        
        {/* Alerta específico para variações com estoque baixo */}
        {currentProduto.variacoes_ativa && currentProduto.variacoes && currentProduto.variacoes.length > 0 && (() => {
            const variacoesComEstoqueBaixo = currentProduto.variacoes.filter(variacao => {
                const estoqueVariacao = parseFloat(variacao.estoque_var || 0);
                const estoqueMinimo = parseFloat(currentProduto.estoque_minimo || 0);
                return estoqueVariacao <= estoqueMinimo;
            });
            
            if (variacoesComEstoqueBaixo.length > 0) {
                return (
                    <div className="space-y-2">
                        {variacoesComEstoqueBaixo.map((variacao, index) => {
                            // Buscar o nome da cor se disponível
                            const nomeCor = variacao.cor_nome || variacao.cor || 'Sem cor definida';
                            const nomeVariacao = variacao.nome || `Variação ${index + 1}`;
                            
                            return (
                                <div key={index} className="flex items-center text-sm text-orange-600 bg-orange-100 dark:bg-orange-900/30 p-2 rounded-md">
                                    <AlertTriangle size={16} className="mr-2"/>
                                    <span>
                                        <strong>Variação "{nomeVariacao}" ({nomeCor})</strong> está com estoque baixo 
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