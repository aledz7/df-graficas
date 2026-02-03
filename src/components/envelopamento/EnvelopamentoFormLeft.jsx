import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { UserCheck as UserSearch, PlusCircle, Car, Shapes, SquareAsterisk as SquareAsterisk, AlertTriangle } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const EnvelopamentoFormLeft = ({ orcamento, setOrcamento, onOpenPartesModal, onAddPecaAvulsa, onOpenClienteModal, onOpenProdutoModal }) => {

  const handlePecaAvulsaChange = (e) => {
    const { name, value } = e.target;
    let finalValue = value;
    if ((name === 'larguraM' || name === 'alturaM') && value !== '') {
      finalValue = String(value).replace(',', '.');
      if (isNaN(parseFloat(finalValue)) && finalValue !== '') {
        finalValue = orcamento.pecaAvulsa?.[name] || ''; 
      }
    } else if (name === 'quantidade' && value !== '') {
        const numValue = parseInt(value, 10);
        if (isNaN(numValue) || numValue < 0) {
            finalValue = '';
        }
    }
    setOrcamento(prev => ({ 
      ...prev, 
      pecaAvulsa: { 
        descricao: '',
        larguraM: '',
        alturaM: '',
        quantidade: '',
        ...prev.pecaAvulsa, 
        [name]: finalValue 
      } 
    }));
  };

  const handlePecaAvulsaBlur = (e) => {
    const { name, value } = e.target;
    if (name === 'quantidade' && value === '') {
        // Define valor padrão 1 quando o campo estiver vazio
        setOrcamento(prev => ({ 
          ...prev, 
          pecaAvulsa: { 
            descricao: '',
            larguraM: '',
            alturaM: '',
            quantidade: '',
            ...prev.pecaAvulsa, 
            quantidade: '1' 
          } 
        }));
    } else if ((name === 'larguraM' || name === 'alturaM') && value === '') {
      setOrcamento(prev => ({ 
        ...prev, 
        pecaAvulsa: { 
          descricao: '',
          larguraM: '',
          alturaM: '',
          quantidade: '',
          ...prev.pecaAvulsa, 
          [name]: '' 
        } 
      }));
    }
  };

  return (
    <div className="space-y-6">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center"><SquareAsterisk size={20} className="mr-2 text-indigo-500"/> Identificação do Orçamento</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label htmlFor="nome_orcamento_env">Nome do Orçamento (Opcional)</Label>
            <Input id="nome_orcamento_env" value={orcamento.nome_orcamento || ''} onChange={(e) => setOrcamento(prev => ({...prev, nome_orcamento: e.target.value}))} placeholder="Ex: Envelopamento Geladeira Cozinha"/>
          </div>
           <div>
              <div>
                <Label htmlFor="cliente-env-display">Cliente Selecionado</Label>
                <div className="flex items-center gap-2">
                    <div className="mt-1 p-2 border rounded-md h-10 bg-muted/50 flex-grow flex items-center truncate">
                        {orcamento.cliente && orcamento.cliente.nome ? (
                        <span className="flex items-center"><UserSearch size={16} className="mr-2 text-green-600"/>{orcamento.cliente.nome}</span>
                        ) : (
                        <span className="text-muted-foreground italic">Nenhum cliente</span>
                        )}
                    </div>
                    <Button variant="outline" onClick={onOpenClienteModal} className="shrink-0">
                        <UserSearch size={16} className="mr-2" /> Buscar
                    </Button>
                </div>
              </div>
          </div>
        </CardContent>
      </Card>



      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center"><Car size={20} className="mr-2 text-blue-500"/>Peças e Medidas</CardTitle>
        </CardHeader>
        <CardContent>
          <Button onClick={() => onOpenPartesModal('search', false, true)} className="w-full mb-4 bg-blue-500 hover:bg-blue-600">
            <Shapes size={16} className="mr-2" /> Selecionar Peças do Catálogo
          </Button>
          <div className="space-y-3 p-3 border rounded-md bg-gray-50 dark:bg-gray-700/30">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Adicionar Peça Avulsa (m²):</h4>
            <div className="grid grid-cols-1 gap-2">
                <Input name="descricao" value={orcamento.pecaAvulsa?.descricao || ''} onChange={handlePecaAvulsaChange} placeholder="Descrição da peça" />
                <div className="grid grid-cols-2 gap-2">
                    <Input name="larguraM" type="text" value={orcamento.pecaAvulsa?.larguraM || ''} onChange={handlePecaAvulsaChange} onBlur={handlePecaAvulsaBlur} placeholder="Largura (m)" />
                    <Input name="alturaM" type="text" value={orcamento.pecaAvulsa?.alturaM || ''} onChange={handlePecaAvulsaChange} onBlur={handlePecaAvulsaBlur} placeholder="Altura (m)" />
                </div>
                <Input name="quantidade" type="number" value={orcamento.pecaAvulsa?.quantidade || ''} onChange={handlePecaAvulsaChange} onBlur={handlePecaAvulsaBlur} placeholder="1" min="0" />
            </div>
            <Button onClick={onAddPecaAvulsa} variant="outline" size="sm" className="w-full border-blue-500 text-blue-500 hover:bg-blue-50"><PlusCircle size={16} className="mr-2" />Adicionar Peça Avulsa</Button>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center"><PlusCircle size={20} className="mr-2 text-green-500"/>Produto Sem Medidas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 p-3 border rounded-md bg-green-50 dark:bg-green-900/20">
            <h4 className="text-sm font-medium text-green-700 dark:text-green-300">Adicionar Produto Direto:</h4>
            <p className="text-xs text-green-600 dark:text-green-400">
              Use esta opção para adicionar produtos que não precisam de medidas específicas (ex: acessórios, ferramentas, etc.)
            </p>
            <Button onClick={onOpenProdutoModal} variant="outline" size="sm" className="w-full border-green-500 text-green-500 hover:bg-green-50">
              <PlusCircle size={16} className="mr-2" />Selecionar Produto
            </Button>
          </div>
        </CardContent>
      </Card>
      
      <Card className="shadow-lg border-red-200 dark:border-red-800">
        <CardHeader>
          <CardTitle className="flex items-center">
            <PlusCircle size={20} className="mr-2 text-purple-500"/>
            Observações
            <span className="text-red-500 ml-1">*</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={orcamento.observacao || ''}
            onChange={(e) => setOrcamento(prev => ({ ...prev, observacao: e.target.value }))}
            placeholder="Campo obrigatório - Informe detalhes adicionais, instruções especiais, etc."
            rows={3}
            required
            className={!orcamento.observacao?.trim() ? 'border-red-300 focus:border-red-500' : ''}
          />
          {!orcamento.observacao?.trim() && (
            <p className="text-xs text-red-500 mt-1 flex items-center">
              <AlertTriangle size={12} className="mr-1" />
              Este campo é obrigatório
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center"><PlusCircle size={20} className="mr-2 text-green-500"/>Desconto e Frete</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label htmlFor="desconto_env">Desconto</Label>
            <div className="flex gap-2">
              <Input 
                id="desconto_env" 
                type="number" 
                step="0.01" 
                min="0"
                value={orcamento.desconto || ''} 
                onChange={(e) => {
                  console.log('Desconto alterado para:', e.target.value);
                  setOrcamento(prev => ({...prev, desconto: e.target.value}));
                }} 
                placeholder="0.00"
                className="flex-1"
              />
              <Select 
                value={orcamento.descontoTipo || 'percentual'} 
                onValueChange={(value) => {
                  console.log('Tipo de desconto alterado para:', value);
                  setOrcamento(prev => ({...prev, descontoTipo: value}));
                }}
              >
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentual">%</SelectItem>
                  <SelectItem value="valor">R$</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label htmlFor="frete_env">Frete (R$)</Label>
            <Input 
              id="frete_env" 
              type="number" 
              step="0.01" 
              min="0"
              value={orcamento.frete || ''} 
              onChange={(e) => {
                console.log('Frete alterado para:', e.target.value);
                setOrcamento(prev => ({...prev, frete: e.target.value}));
              }} 
              placeholder="0.00"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center"><AlertTriangle size={20} className="mr-2 text-yellow-500"/>Informação sobre Serviços</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground space-y-2">
            <p>• Os serviços adicionais (aplicação, lixamento, remoção, etc.) agora são aplicados individualmente por peça.</p>
            <p>• Para adicionar serviços a uma peça específica, use a coluna "Serviços" na tabela de itens à direita.</p>
            <p>• Cada peça pode ter diferentes serviços aplicados conforme necessário.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EnvelopamentoFormLeft;