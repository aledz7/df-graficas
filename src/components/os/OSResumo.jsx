import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { DollarSign, UserCircle, FileText as FileTextIcon, Image as ImageIcon } from 'lucide-react';
import { apiDataManager } from '@/lib/apiDataManager';

const parseDecimal = (valor, defaultValue = 0) => {
  if (valor === null || valor === undefined) return defaultValue;
  if (typeof valor === 'number') {
    return Number.isFinite(valor) ? valor : defaultValue;
  }

  let stringValue = String(valor).trim();

  if (!stringValue) return defaultValue;

  stringValue = stringValue.replace(/\s/g, '');

  if (stringValue.includes(',') && stringValue.includes('.')) {
    stringValue = stringValue.replace(/\./g, '').replace(',', '.');
  } else if (stringValue.includes(',') && !stringValue.includes('.')) {
    stringValue = stringValue.replace(',', '.');
  }

  const numero = Number.parseFloat(stringValue);
  return Number.isFinite(numero) ? numero : defaultValue;
};

const formatDecimal = (valor, casasDecimais = 2) => {
  const numero = parseDecimal(valor, 0);
  return numero.toFixed(casasDecimais).replace('.', ',');
};

const OSResumo = async ({
  itens, 
  clienteSelecionadoOS, 
  clienteNomeLivreOS, 
  obsClienteOS,
  produtosCadastrados 
}) => {
  const acabamentosConfig = JSON.parse(await apiDataManager.getItem('acabamentos_config') || '[]');

  const calcularAreaTotalM2 = () => {
    return itens.reduce((sum, item) => {
      const altura = parseDecimal(item.altura, 0);
      const largura = parseDecimal(item.largura, 0);
      const quantidade = parseDecimal(item.quantidade, 1);
      const areaItem = altura * largura;

      return sum + areaItem * quantidade;
    }, 0);
  };

  const calcularSomaAcabamentos = () => {
    let totalValorAcabamentos = 0;
    if (!Array.isArray(acabamentosConfig)) return totalValorAcabamentos;
    
    itens.forEach(item => {
      const altura = parseDecimal(item.altura, 0);
      const largura = parseDecimal(item.largura, 0);
      const areaItem = altura * largura;
      const quantidadeItem = parseDecimal(item.quantidade, 1);
      const acabamentosItem = Array.isArray(item.acabamentos) ? item.acabamentos : [];
      acabamentosItem.forEach(acabSelecionado => {
        const baseAcab = acabamentosConfig.find(b => b.id === acabSelecionado.id && b.ativo);
        if (baseAcab) {
          const valorBase = parseDecimal(baseAcab.valor_m2, 0);
          totalValorAcabamentos += valorBase * areaItem * quantidadeItem;
        }
      });
    });
    return totalValorAcabamentos;
  };

  const calcularValorTotalOS = () => {
    return itens.reduce((sum, item) => {
      const altura = parseDecimal(item.altura, 0);
      const largura = parseDecimal(item.largura, 0);
      const valorUnitarioItem = parseDecimal(item.valor_unitario_m2, 0);
      const quantidadeItem = parseDecimal(item.quantidade, 1);

      const areaItem = altura * largura;
      
      let valorAcabamentosItem = 0;
      if (Array.isArray(acabamentosConfig)) {
        const acabamentosItem = Array.isArray(item.acabamentos) ? item.acabamentos : [];
        acabamentosItem.forEach(acabSelecionado => {
          const baseAcab = acabamentosConfig.find(b => b.id === acabSelecionado.id && b.ativo);
          if (baseAcab) {
            valorAcabamentosItem += parseDecimal(baseAcab.valor_m2, 0) * areaItem;
          }
        });
      }
      
      const subtotalServico = areaItem * valorUnitarioItem;
      const totalItemComAcabamentos = (subtotalServico + valorAcabamentosItem) * quantidadeItem;
      
      return sum + totalItemComAcabamentos;
    }, 0);
  };
  
  const nomeClienteDisplay = clienteSelecionadoOS?.id === "CLIENTE_PADRAO_AVULSO" 
    ? (clienteNomeLivreOS || "Cliente Padrão") 
    : (clienteSelecionadoOS?.nome_completo || clienteSelecionadoOS?.nome || "Não informado");


  return (
    <Card className="shadow-lg sticky top-20">
      <CardHeader>
        <CardTitle>Resumo da OS</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <Label className="flex items-center text-sm font-medium"><UserCircle size={16} className="mr-2 text-primary"/>Cliente:</Label>
          <p className="text-md font-semibold truncate" title={nomeClienteDisplay}>{nomeClienteDisplay}</p>
        </div>

        {obsClienteOS && (
          <div>
            <Label className="flex items-center text-sm font-medium"><FileTextIcon size={16} className="mr-2 text-primary"/>Obs. Cliente:</Label>
            <p className="text-xs text-muted-foreground whitespace-pre-wrap break-words max-h-20 overflow-y-auto">{obsClienteOS}</p>
          </div>
        )}

        {itens.length > 0 && (
          <div className="pt-2 border-t">
            <Label className="text-sm font-medium">Itens Adicionados:</Label>
            <ul className="list-none space-y-1 max-h-32 overflow-y-auto text-xs mt-1">
              {itens.map(item => {
                const nomeDisplay = item.servico_manual || 'Serviço';
                return (
                  <li key={item.id} className="flex items-center justify-between p-1 bg-muted/50 rounded-sm">
                    <span className="truncate max-w-[70%]" title={nomeDisplay}>{nomeDisplay}</span>
                    {item.produto_relacionado_imagem_url && <ImageIcon size={14} className="text-primary ml-1" title="Produto com imagem"/>}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
        
        <div className="pt-2 border-t">
          <Label>Área Total (m²):</Label>
          <p className="text-lg font-semibold">{formatDecimal(calcularAreaTotalM2(), 2)} m²</p>
        </div>
        <div>
          <Label>Soma Acabamentos (R$):</Label>
          <p className="text-lg font-semibold">R$ {formatDecimal(calcularSomaAcabamentos(), 2)}</p>
        </div>
        <div className="pt-3 border-t">
          <Label className="flex items-center text-xl">
            <DollarSign size={22} className="mr-1 text-green-600"/> Valor Total da OS (R$):
          </Label>
          <p className="text-3xl font-extrabold text-green-600">
            R$ {formatDecimal(calcularValorTotalOS(), 2)}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default OSResumo;