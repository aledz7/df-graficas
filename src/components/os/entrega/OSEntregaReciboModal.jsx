import React, { useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Printer, FileText } from 'lucide-react';
import { format, parseISO, isValid } from 'date-fns';

const OSEntregaReciboModal = ({ isOpen, setIsOpen, os, empresa }) => {
    const componentRef = useRef();
    
    
    // Função para obter o ID numérico da OS
    const getOSId = () => {
        // Usar diretamente o ID da OS (campo id é o número menor)
        return os?.id || 'N/A';
    };
    
    // Função para obter o nome do cliente com fallbacks
    const getNomeCliente = () => {
        // Tentar diferentes propriedades para obter o nome do cliente
        const nomeCliente = os?.cliente?.nome_completo || 
               os?.cliente?.nome || 
               os?.cliente?.apelido_fantasia ||
               os?.cliente_info?.nome ||
               os?.cliente_nome_manual ||
               'N/A';
        
        return nomeCliente;
    };
    
    // Função para obter o nome da empresa com fallbacks
    const getNomeEmpresa = () => {
        return empresa?.nome_fantasia || 
               empresa?.razao_social ||
               'JET-IMPRE GESTÃO';
    };
    
    const handlePrint = () => {
        try {
            const printWindow = window.open('', '_blank');
            if (!printWindow) {
                console.error('Não foi possível abrir a janela de impressão');
                return;
            }

            const printStyles = `
                body { 
                    font-family: Arial, sans-serif; 
                    margin: 0; 
                    padding: 20px; 
                    color: #000;
                    background: #fff;
                }
                .printable-content {
                    max-width: 800px;
                    margin: 0 auto;
                }
                .text-center { text-align: center; }
                .mb-6 { margin-bottom: 1.5rem; }
                .mb-2 { margin-bottom: 0.5rem; }
                .mt-16 { margin-top: 4rem; }
                .mt-8 { margin-top: 2rem; }
                .mt-1 { margin-top: 0.25rem; }
                .py-4 { padding-top: 1rem; padding-bottom: 1rem; }
                .my-4 { margin-top: 1rem; margin-bottom: 1rem; }
                .border-t { border-top: 1px solid #e5e7eb; }
                .border-b { border-bottom: 1px solid #e5e7eb; }
                .border-gray-500 { border-color: #6b7280; }
                .grid { display: grid; }
                .grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
                .gap-4 { gap: 1rem; }
                .text-2xl { font-size: 1.5rem; line-height: 2rem; }
                .text-lg { font-size: 1.125rem; line-height: 1.75rem; }
                .text-sm { font-size: 0.875rem; line-height: 1.25rem; }
                .text-xs { font-size: 0.75rem; line-height: 1rem; }
                .font-bold { font-weight: 700; }
                .font-semibold { font-weight: 600; }
                .h-20 { height: 5rem; }
                .mx-auto { margin-left: auto; margin-right: auto; }
                .object-contain { object-fit: contain; }
                .list-disc { list-style-type: disc; }
                .list-inside { list-style-position: inside; }
                .w-3\/4 { width: 75%; }
                .text-gray-500 { color: #6b7280; }
                @media print {
                    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                }
            `;

            const dados = os?.dados_producao || {};
            const nomeCliente = getNomeCliente();
            const nomeEmpresa = getNomeEmpresa();

            // Gerar o HTML diretamente
            const printContent = `
                <div class="printable-content">
                    <div class="text-center mb-6">
                        ${empresa.logo_url ? `<img src="${empresa.logo_url}" alt="Logo Empresa" class="h-20 mx-auto mb-2 object-contain" onerror="this.style.display='none';" />` : ''}
                        <h2 class="text-2xl font-bold">${nomeEmpresa}</h2>
                        <p class="text-lg">Comprovante de Entrega de Serviço</p>
                    </div>
                    
                    <div class="border-t border-b py-4 my-4">
                        <div class="grid grid-cols-2 gap-4">
                            <div><strong>Nº da OS:</strong> ${getOSId()}</div>
                            <div><strong>Data da Entrega:</strong> ${dados.data_entrega && isValid(parseISO(dados.data_entrega)) ? format(parseISO(dados.data_entrega), 'dd/MM/yyyy HH:mm') : 'N/A'}</div>
                            <div><strong>Cliente:</strong> ${nomeCliente}</div>
                            <div><strong>Valor Total:</strong> R$ ${(parseFloat(os.valor_total_os) || 0).toFixed(2)}</div>
                            <div><strong>Entregue por:</strong> ${dados.entregue_por || 'N/A'}</div>
                            <div><strong>Recebido por:</strong> ${dados.recebido_por || 'N/A'}</div>
                        </div>
                    </div>

                    <div class="mb-6">
                        <h3 class="font-semibold text-md mb-2">Itens Inclusos:</h3>
                        <ul class="list-disc list-inside text-sm">
                            ${os.itens && os.itens.map(item => 
                                `<li>${item.quantidade}x ${item.nome_servico_produto || item.nome_produto}</li>`
                            ).join('') || '<li>Nenhum item encontrado</li>'}
                        </ul>
                    </div>

                    <div class="mt-16 text-center">
                        <div class="w-3/4 border-t border-gray-500 mx-auto mb-1" style="width: 75%; margin: 0 auto; border-top: 1px solid #6b7280; margin-bottom: 0.25rem;"></div>
                        <p class="text-sm">Assinatura do Recebedor</p>
                        <p class="text-sm font-semibold mt-1">${dados.recebido_por || '______________________________'}</p>
                    </div>

                    <p class="text-xs text-center mt-8 text-gray-500">${nomeEmpresa} - ${new Date().getFullYear()}</p>
                </div>
            `;

            printWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Recibo de Entrega - OS ${getOSId()}</title>
                    <meta charset="UTF-8">
                    <style>${printStyles}</style>
                </head>
                <body>
                    ${printContent}
                    <script>
                        window.onload = function() { 
                            window.print(); 
                            window.onafterprint = function() {
                                window.close();
                            };
                        }
                    </script>
                </body>
                </html>
            `);

            printWindow.document.close();
            
        } catch (error) {
            console.error('Erro ao gerar recibo de entrega:', error);
            alert('Erro ao gerar o recibo de entrega. Verifique o console para mais detalhes.');
        }
    };

    const dados = os?.dados_producao || {};
    
    // Verificação de segurança
    if (!os) {
        console.error('OS não fornecida para o modal de recibo');
        return null;
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="max-w-2xl p-0">
                <DialogHeader className="p-6 pb-0">
                    <DialogTitle>Recibo de Entrega - OS: {getOSId()}</DialogTitle>
                </DialogHeader>
                <div ref={componentRef} className="p-8 bg-white text-black printable-content" style={{ visibility: 'hidden', position: 'absolute', height: '0', overflow: 'hidden' }}>
                    <div className="text-center mb-6">
                        {empresa.logoUrl && <img src={empresa.logoUrl} alt="Logo Empresa" className="h-20 mx-auto mb-2 object-contain" />}
                        <h2 className="text-2xl font-bold">{getNomeEmpresa()}</h2>
                        <p className="text-lg">Comprovante de Entrega de Serviço</p>
                    </div>
                    
                    <div className="border-t border-b py-4 my-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div><strong>Nº da OS:</strong> {getOSId()}</div>
                            <div><strong>Data da Entrega:</strong> {dados.data_entrega && isValid(parseISO(dados.data_entrega)) ? format(parseISO(dados.data_entrega), 'dd/MM/yyyy HH:mm') : 'N/A'}</div>
                            <div><strong>Cliente:</strong> {getNomeCliente()}</div>
                            <div><strong>Valor Total:</strong> R$ {(parseFloat(os.valor_total_os) || 0).toFixed(2)}</div>
                            <div><strong>Entregue por:</strong> {dados.entregue_por || 'N/A'}</div>
                            <div><strong>Recebido por:</strong> {dados.recebido_por || 'N/A'}</div>
                        </div>
                    </div>

                    <div className="mb-6">
                        <h3 className="font-semibold text-md mb-2">Itens Inclusos:</h3>
                        <ul className="list-disc list-inside text-sm">
                            {os.itens && os.itens.map((item, index) => (
                                <li key={item.id_temp || index}>{item.quantidade}x {item.nome_servico_produto || item.nome_produto}</li>
                            ))}
                        </ul>
                    </div>

                    <div className="mt-16 text-center">
                        <div className="w-3/4 sm:w-1/2 border-t border-gray-500 mx-auto mb-1"></div>
                        <p className="text-sm">Assinatura do Recebedor</p>
                        <p className="text-sm font-semibold mt-1">{dados.recebido_por || '______________________________'}</p>
                    </div>

                    <p className="text-xs text-center mt-8 text-gray-500">{getNomeEmpresa()} - {new Date().getFullYear()}</p>
                </div>
                <ScrollArea className="max-h-[70vh]">
                    <div className="p-8 bg-white text-black printable-content">
                        <div className="text-center mb-6">
                            {empresa.logo_url && (
                                <img 
                                    src={empresa.logo_url} 
                                    alt="Logo Empresa" 
                                    className="h-20 mx-auto mb-2 object-contain"
                                    onError={(e) => {
                                        e.target.style.display = 'none';
                                    }}
                                />
                            )}
                            <h2 className="text-2xl font-bold">{getNomeEmpresa()}</h2>
                            <p className="text-lg">Comprovante de Entrega de Serviço</p>
                        </div>
                        
                        <div className="border-t border-b py-4 my-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div><strong>Nº da OS:</strong> {getOSId()}</div>
                                <div><strong>Data da Entrega:</strong> {dados.data_entrega && isValid(parseISO(dados.data_entrega)) ? format(parseISO(dados.data_entrega), 'dd/MM/yyyy HH:mm') : 'N/A'}</div>
                                <div><strong>Cliente:</strong> {getNomeCliente()}</div>
                                <div><strong>Valor Total:</strong> R$ {(parseFloat(os.valor_total_os) || 0).toFixed(2)}</div>
                                <div><strong>Entregue por:</strong> {dados.entregue_por || 'N/A'}</div>
                                <div><strong>Recebido por:</strong> {dados.recebido_por || 'N/A'}</div>
                            </div>
                        </div>

                        <div className="mb-6">
                            <h3 className="font-semibold text-md mb-2">Itens Inclusos:</h3>
                            <ul className="list-disc list-inside text-sm">
                                {os.itens && os.itens.map((item, index) => (
                                    <li key={item.id_temp || index}>{item.quantidade}x {item.nome_servico_produto || item.nome_produto}</li>
                                ))}
                            </ul>
                        </div>

                        <div className="mt-16 text-center">
                            <div className="w-3/4 sm:w-1/2 border-t border-gray-500 mx-auto mb-1"></div>
                            <p className="text-sm">Assinatura do Recebedor</p>
                            <p className="text-sm font-semibold mt-1">{dados.recebido_por || '______________________________'}</p>
                        </div>

                        <p className="text-xs text-center mt-8 text-gray-500">{getNomeEmpresa()} - {new Date().getFullYear()}</p>
                    </div>
                </ScrollArea>
                <DialogFooter className="p-6 pt-0 border-t gap-2">
                    <Button variant="outline" onClick={handlePrint}><Printer size={16} className="mr-2"/> Imprimir Recibo</Button>
                    <Button onClick={() => setIsOpen(false)}>Fechar</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default OSEntregaReciboModal;