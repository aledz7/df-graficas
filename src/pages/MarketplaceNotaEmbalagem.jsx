import React, { useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Printer, ArrowLeft } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import { format, parseISO } from 'date-fns';

const MarketplaceNotaEmbalagem = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { venda, nomeEmpresa, logoUrl } = location.state || {};
    const componentRef = useRef();

      const handlePrint = useReactToPrint({
    content: () => componentRef.current,
    });

    if (!venda) {
        return (
            <div className="p-6 text-center">
                <p>Nenhuma venda selecionada para gerar a nota de embalagem.</p>
                <Button onClick={() => navigate('/marketplace')} className="mt-4">Voltar para Vendas</Button>
            </div>
        );
    }
    
    const previsaoEntrega = venda.data_previsao_entrega ? format(parseISO(venda.data_previsao_entrega), 'dd/MM/yyyy') : 'Não informada';

    return (
        <div className="p-4 md:p-6 bg-gray-100 dark:bg-gray-900 min-h-screen">
            <div className="max-w-2xl mx-auto bg-white dark:bg-gray-800 shadow-lg rounded-lg">
                <div ref={componentRef} className="p-6 printable-content-nota">
                    <style type="text/css" media="print">
                        {`
                          @page { size: A6 landscape; margin: 5mm; }
                          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                          .printable-content-nota { font-size: 10pt; }
                          .printable-content-nota h1 { font-size: 14pt; }
                          .printable-content-nota h2 { font-size: 12pt; }
                          .printable-content-nota p, .printable-content-nota li { margin-bottom: 2px; }
                        `}
                    </style>
                    <header className="flex justify-between items-start mb-4 pb-2 border-b">
                        <div>
                            {logoUrl && <img src={logoUrl} alt="Logo Empresa" className="h-10 mb-1 object-contain" />}
                            <h1 className="text-lg font-bold">{nomeEmpresa || 'Sua Empresa'}</h1>
                        </div>
                        <div className="text-right">
                            <p className="font-semibold">Pedido Marketplace</p>
                            <p className="text-xs">Data: {format(parseISO(venda.data_venda), 'dd/MM/yyyy')}</p>
                        </div>
                    </header>

                    <div className="grid grid-cols-2 gap-4 mb-3">
                        <div>
                            <h2 className="font-semibold text-sm mb-0.5">Cliente:</h2>
                            <p className="text-xs">{venda.cliente_nome}</p>
                            <p className="text-xs">{venda.cliente_contato}</p>
                        </div>
                        <div>
                            <h2 className="font-semibold text-sm mb-0.5">Endereço de Entrega:</h2>
                            <p className="text-xs whitespace-pre-line">{venda.cliente_endereco}</p>
                        </div>
                    </div>
                    
                    <div className="mb-3">
                        <h2 className="font-semibold text-sm mb-0.5">Detalhes do Pedido:</h2>
                        <ul className="list-disc list-inside text-xs">
                            {venda.produtos.map(p => (
                                <li key={p.id}>{p.quantidade}x {p.nome}</li>
                            ))}
                        </ul>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-3 text-xs">
                        <p><strong>Código Cliente:</strong> {venda.cliente_id || venda.id.substring(0,8).toUpperCase()}</p>
                        <p><strong>Previsão Entrega:</strong> {previsaoEntrega}</p>
                        {venda.codigo_rastreio && <p><strong>Rastreio:</strong> {venda.codigo_rastreio}</p>}
                        <p><strong>Total:</strong> R$ {(parseFloat(venda.valor_total) || 0).toFixed(2)}</p>
                    </div>
                    
                    {venda.observacoes && (
                        <div className="mb-2 pt-2 border-t mt-2">
                            <h2 className="font-semibold text-sm mb-0.5">Observações:</h2>
                            <p className="text-xs whitespace-pre-wrap">{venda.observacoes}</p>
                        </div>
                    )}
                    <p className="text-center text-xs mt-4">Obrigado por comprar conosco!</p>
                </div>
                <div className="p-6 border-t flex justify-between items-center">
                    <Button variant="outline" onClick={() => navigate('/marketplace')}>
                        <ArrowLeft size={16} className="mr-2"/> Voltar
                    </Button>
                    <Button onClick={handlePrint}>
                        <Printer size={16} className="mr-2"/> Imprimir Nota
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default MarketplaceNotaEmbalagem;