import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { format, parseISO } from 'date-fns';
import { User, CalendarDays, CheckCircle, FileText, Clock, Image } from 'lucide-react';
import OSEntregaAnexosDialog from './OSEntregaAnexosDialog';
import { getImageUrl } from '@/lib/imageUtils';

const OSEntregaCard = ({ os, onRegistrarEntrega }) => {
  // Função para obter o nome do cliente com fallbacks
  const getNomeCliente = () => {
    // Tentar diferentes propriedades para obter o nome do cliente
    return os.cliente?.nome_completo || 
           os.cliente?.nome || 
           os.cliente?.apelido_fantasia ||
           os.cliente_info?.nome ||
           os.cliente_nome_manual ||
           'N/A';
  };

  // Função para obter todas as imagens anexadas (produção + entrega)
  const getImagensAnexadas = () => {
    const anexosProducao = os.dados_producao?.fotos_producao || [];
    const anexosEntrega = os.dados_entrega?.fotos_entrega || [];
    
    // Filtrar apenas imagens
    const imagensProducao = anexosProducao.filter(anexo => anexo.type?.startsWith('image/'));
    const imagensEntrega = anexosEntrega.filter(anexo => anexo.type?.startsWith('image/'));
    
    return {
      producao: imagensProducao,
      entrega: imagensEntrega,
      total: imagensProducao.length + imagensEntrega.length
    };
  };

  // Função para obter URL da imagem
  const getImageUrlFromAnexo = (anexo) => {
    if (anexo.url && anexo.url.startsWith('http')) {
      return anexo.url;
    }
    if (anexo.path) {
      const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      return `${apiBaseUrl}/storage/${anexo.path}`;
    }
    if (anexo.url && anexo.url.startsWith('/storage/')) {
      const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      return `${apiBaseUrl}${anexo.url}`;
    }
    return null;
  };

  const imagens = getImagensAnexadas();

  return (
    <Card className="border-blue-500 bg-blue-50 dark:bg-blue-900/30">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg font-bold">OS: {os.id}</CardTitle>
            <CardDescription className="flex items-center text-xs">
              <CalendarDays size={14} className="mr-1" /> Pronto em: {format(parseISO(os.data_finalizacao_os || os.data_criacao), 'dd/MM/yyyy HH:mm')}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="text-sm">
        <div className="space-y-2">
          <div className="flex items-center">
            <User size={14} className="mr-2 text-primary" />
            <span className="font-semibold">{getNomeCliente()}</span>
          </div>
          
          {/* Informações de contato do cliente */}
          <div className="space-y-1 text-xs">
            {/* Telefone */}
            {(os.cliente?.telefone_principal || os.cliente?.whatsapp || os.cliente_info?.telefone) && (
              <div className="flex items-center text-muted-foreground">
                <Clock size={12} className="mr-1" />
                <span>
                  {os.cliente?.telefone_principal || os.cliente?.whatsapp || os.cliente_info?.telefone}
                  {os.cliente?.whatsapp && os.cliente?.telefone_principal && os.cliente?.whatsapp !== os.cliente?.telefone_principal && (
                    <span className="ml-1 text-blue-600">(WhatsApp)</span>
                  )}
                </span>
              </div>
            )}
            
            {/* Email */}
            {(os.cliente?.email || os.cliente_info?.email) && (
              <div className="flex items-center text-muted-foreground">
                <FileText size={12} className="mr-1" />
                <span className="truncate" title={os.cliente?.email || os.cliente_info?.email}>
                  {os.cliente?.email || os.cliente_info?.email}
                </span>
              </div>
            )}
            
            {/* Observações do cliente */}
            {(os.cliente?.observacoes || os.cliente_info?.observacoes) && (
              <div className="pt-1">
                <div className="text-xs font-medium text-muted-foreground mb-1">Observações do Cliente:</div>
                <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded border-l-2 border-primary/30 max-h-20 overflow-y-auto">
                  {os.cliente?.observacoes || os.cliente_info?.observacoes}
                </div>
              </div>
            )}
            
            {/* Observações gerais da OS */}
            {(os.observacoes_gerais_os || os.observacoes) && (os.observacoes_gerais_os || os.observacoes).trim() && (
              <div className="pt-1">
                <div className="text-xs font-medium text-muted-foreground mb-1">Observações Gerais da OS:</div>
                <div className="text-xs text-muted-foreground bg-blue-50 dark:bg-blue-900/20 p-2 rounded border-l-2 border-blue-500/30 max-h-20 overflow-y-auto">
                  {os.observacoes_gerais_os || os.observacoes}
                </div>
              </div>
            )}
            
            {/* Observações do cliente para nota */}
            {os.observacoes_cliente_para_nota && os.observacoes_cliente_para_nota.trim() && (
              <div className="pt-1">
                <div className="text-xs font-medium text-muted-foreground mb-1">Observações para Nota:</div>
                <div className="text-xs text-muted-foreground bg-green-50 dark:bg-green-900/20 p-2 rounded border-l-2 border-green-500/30 max-h-20 overflow-y-auto">
                  {os.observacoes_cliente_para_nota}
                </div>
              </div>
            )}
          </div>
          
          {/* Seção de Imagens Anexadas */}
          {imagens.total > 0 && (
            <div className="pt-3">
              <div className="text-xs font-medium text-muted-foreground mb-2 flex items-center">
                <Image size={12} className="mr-1" />
                Imagens Anexadas ({imagens.total})
              </div>
              
              {/* Imagens de Produção */}
              {imagens.producao.length > 0 && (
                <div className="mb-3">
                  <div className="text-xs text-muted-foreground mb-2">Produção ({imagens.producao.length})</div>
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
                    {imagens.producao.map((anexo, index) => {
                      const imageUrl = getImageUrlFromAnexo(anexo);
                      const nomeArquivo = anexo.name || `Imagem ${index + 1}`;
                      
                      return (
                        <div key={`producao-${index}`} className="relative group">
                          <div className="w-50 h-50 bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                            {imageUrl ? (
                              <img
                                src={imageUrl}
                                alt={nomeArquivo}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  console.error('❌ Erro ao carregar imagem:', imageUrl, 'para anexo:', nomeArquivo);
                                  e.target.style.display = 'none';
                                  e.target.nextElementSibling.style.display = 'flex';
                                }}
                                onLoad={(e) => {
                                  e.target.nextElementSibling.style.display = 'none';
                                }}
                              />
                            ) : null}
                            <div 
                              className={`w-full h-full flex items-center justify-center ${imageUrl ? 'hidden' : 'flex'}`}
                              style={{ backgroundColor: '#f3f4f6' }}
                            >
                              <div className="text-center">
                                <Image size={20} className="text-gray-400 mx-auto mb-1" />
                                <div className="text-xs text-gray-500">Sem imagem</div>
                              </div>
                            </div>
                          </div>
                          <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs p-1 text-center truncate opacity-0 group-hover:opacity-100 transition-opacity">
                            {nomeArquivo}
                          </div>
                          {/* Badge de tipo */}
                          <div className="absolute top-1 right-1 bg-green-600 text-white text-xs px-1.5 py-0.5 rounded-full font-medium">
                            Prod
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              
              {/* Imagens de Entrega */}
              {imagens.entrega.length > 0 && (
                <div>
                  <div className="text-xs text-muted-foreground mb-2">Entrega ({imagens.entrega.length})</div>
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
                    {imagens.entrega.map((anexo, index) => {
                      const imageUrl = getImageUrlFromAnexo(anexo);
                      const nomeArquivo = anexo.name || `Imagem ${index + 1}`;
                      
                      return (
                        <div key={`entrega-${index}`} className="relative group">
                          <div className="w-50 h-50 bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                            {imageUrl ? (
                              <img
                                src={imageUrl}
                                alt={nomeArquivo}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  console.error('❌ Erro ao carregar imagem:', imageUrl, 'para anexo:', nomeArquivo);
                                  e.target.style.display = 'none';
                                  e.target.nextElementSibling.style.display = 'flex';
                                }}
                                onLoad={(e) => {
                                  e.target.nextElementSibling.style.display = 'none';
                                }}
                              />
                            ) : null}
                            <div 
                              className={`w-full h-full flex items-center justify-center ${imageUrl ? 'hidden' : 'flex'}`}
                              style={{ backgroundColor: '#f3f4f6' }}
                            >
                              <div className="text-center">
                                <Image size={20} className="text-gray-400 mx-auto mb-1" />
                                <div className="text-xs text-gray-500">Sem imagem</div>
                              </div>
                            </div>
                          </div>
                          <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs p-1 text-center truncate opacity-0 group-hover:opacity-100 transition-opacity">
                            {nomeArquivo}
                          </div>
                          {/* Badge de tipo */}
                          <div className="absolute top-1 right-1 bg-blue-600 text-white text-xs px-1.5 py-0.5 rounded-full font-medium">
                            Ent
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
          
          <p className="text-muted-foreground text-xs">Total: <span className="font-bold text-foreground">R$ {(parseFloat(os.valor_total_os) || 0).toFixed(2)}</span></p>
        </div>
      </CardContent>
      <CardFooter className="flex justify-end space-x-2">
        <OSEntregaAnexosDialog os={os} />
        <Button onClick={() => onRegistrarEntrega(os)} className="bg-blue-600 hover:bg-blue-700">
          <CheckCircle size={16} className="mr-2" />
          Registrar Entrega
        </Button>
      </CardFooter>
    </Card>
  );
};

export default OSEntregaCard;