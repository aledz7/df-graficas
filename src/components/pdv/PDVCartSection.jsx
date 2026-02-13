import React from 'react';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ShoppingCart } from 'lucide-react';
import PDVCart from './PDVCart';
import PDVCheckoutActions from './PDVCheckoutActions';

const PDVCartSection = ({ 
  carrinho, 
  setCarrinho, 
  productColors, 
  productSizes,
  produtos,
  desconto,
  setDesconto,
  observacoes,
  setObservacoes,
  clienteSelecionado,
  setClienteNomeLivre,
  clienteNomeLivre,
  setIsClienteModalOpen,
  calcularSubtotal,
  calcularDescontoValor,
  valorTotal, // Alterado de calcularTotal para valorTotal
  handleFinalizarDocumento,
  handleCancelarVenda,
  modoDocumento,
  setModoDocumento,
  isConsumoFuncionarioPDV,
  setIsConsumoFuncionarioPDV,
  funcionarioConsumidorPDVId,
  setFuncionarioConsumidorPDVId,
  frete,
  setFrete,
  handleTransformarEmOS,
}) => {
  return (
    <aside className="w-full lg:w-[450px] xl:w-[500px] bg-white dark:bg-gray-800 flex flex-col shadow-lg border-l border-gray-200 dark:border-gray-700">
      <Card className="flex-1 flex flex-col rounded-none border-none">
        <CardHeader className="flex flex-row items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <CardTitle className="text-xl flex items-center">
            <ShoppingCart size={24} className="mr-3 text-orange-500"/> Pedido Atual
          </CardTitle>
          <span className="text-sm font-semibold bg-orange-100 text-orange-600 dark:bg-orange-900/50 dark:text-orange-300 py-1 px-3 rounded-full">
            {(() => {
              const quantidadeTotal = carrinho.reduce((total, item) => {
                const qtd = typeof item.quantidade === 'number' 
                  ? item.quantidade 
                  : parseFloat(String(item.quantidade || 0).replace(',', '.')) || 0;
                return total + qtd;
              }, 0);
              // Formatar quantidade total: se for inteiro, mostrar sem decimais
              const qtdFormatada = quantidadeTotal % 1 === 0 
                ? quantidadeTotal.toString() 
                : quantidadeTotal.toFixed(2).replace(/\.?0+$/, '');
              return `${qtdFormatada} ${quantidadeTotal === 1 ? 'unidade' : 'unidades'}`;
            })()}
          </span>
        </CardHeader>
        <ScrollArea className="flex-1">
          <CardContent className="p-0">
            <PDVCart 
              carrinho={carrinho} 
              setCarrinho={setCarrinho} 
              productColors={productColors} 
              productSizes={productSizes}
              produtos={produtos}
            />
          </CardContent>
        </ScrollArea>
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <PDVCheckoutActions
            carrinho={carrinho}
            desconto={desconto}
            setDesconto={setDesconto}
            observacoes={observacoes}
            setObservacoes={setObservacoes}
            clienteSelecionado={clienteSelecionado}
            setClienteNomeLivre={setClienteNomeLivre}
            clienteNomeLivre={clienteNomeLivre}
            setIsClienteModalOpen={setIsClienteModalOpen}
            calcularSubtotal={calcularSubtotal}
            calcularDescontoValor={calcularDescontoValor}
            valorTotal={valorTotal} // Renomeado de calcularTotal para valorTotal
            handleFinalizarDocumento={handleFinalizarDocumento}
            handleCancelarVenda={handleCancelarVenda}
            modoDocumento={modoDocumento}
            setModoDocumento={setModoDocumento}
            isConsumoFuncionarioPDV={isConsumoFuncionarioPDV}
            setIsConsumoFuncionarioPDV={setIsConsumoFuncionarioPDV}
            funcionarioConsumidorPDVId={funcionarioConsumidorPDVId}
            setFuncionarioConsumidorPDVId={setFuncionarioConsumidorPDVId}
            frete={frete}
            setFrete={setFrete}
            handleTransformarEmOS={handleTransformarEmOS}
          />
        </div>
      </Card>
    </aside>
  );
};

export default PDVCartSection;