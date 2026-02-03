import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { format, parseISO, differenceInDays, isValid } from 'date-fns';
import { User, CalendarDays, Clock, FileText, ImagePlus, Eye, X } from 'lucide-react';
import OSProducaoAnexosDialog from './OSProducaoAnexosDialog';

// Status options should match those used in the backend and OSEmProducaoHeader
const statusProducaoOptions = [
  { value: 'Em Produção', label: 'Em Produção' },
  { value: 'Em Revisão', label: 'Em Revisão' },
  { value: 'Aguardando Aprovação', label: 'Aguardando Aprovação' },
  { value: 'Pronto para Entrega', label: 'Pronto para Entrega' },
  // Não incluir 'Aguardando Entrega' aqui, pois esse status é usado apenas quando movemos para a página de entregas
];

const getStatusColor = (status, prazoEstimado) => {
    if (status === 'Pronto para Entrega') return 'border-green-500 bg-green-50 dark:bg-green-900/30';
    if (prazoEstimado) {
      const hoje = new Date();
      const prazo = parseISO(prazoEstimado);
      if (isValid(prazo) && differenceInDays(prazo, hoje) < 0 && status !== 'Pronto para Entrega') {
        return 'border-red-500';
      }
    }
    return 'border-gray-200 dark:border-gray-700';
};

// Função para verificar se está em atraso
const isEmAtraso = (status, prazoEstimado) => {
  if (status === 'Pronto para Entrega') return false;
  if (!prazoEstimado) return false;
  const hoje = new Date();
  const prazo = parseISO(prazoEstimado);
  return isValid(prazo) && differenceInDays(prazo, hoje) < 0;
};

const OSEmProducaoCard = ({ os, onUpdate, onVerRecibo }) => {
  // Combinar observações internas existentes com observações gerais da OS
  const getObservacoesIniciais = () => {
    const observacoesInternas = os.dados_producao?.observacoes_internas || '';
    const observacoesGerais = os.observacoes_gerais_os || '';
    
    // Se não há observações internas mas há observações gerais, usar as gerais
    if (!observacoesInternas.trim() && observacoesGerais.trim()) {
      return observacoesGerais;
    }
    
    // Se há ambas, combinar
    if (observacoesInternas.trim() && observacoesGerais.trim()) {
      return `${observacoesInternas}\n\n--- Observações Gerais da OS ---\n${observacoesGerais}`;
    }
    
    // Usar observações internas se existirem
    return observacoesInternas;
  };

  const [observacoes, setObservacoes] = useState(getObservacoesIniciais());
  // Função para formatar data para o input
  const formatDateForInput = (dateString) => {
    if (!dateString) return '';
    
    try {
      // Se já está no formato dd/mm/aaaa hh:mm, retornar como está
      if (typeof dateString === 'string' && dateString.includes('/')) {
        return dateString;
      }
      
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        console.warn('Data inválida:', dateString);
        return '';
      }
      
      // Formato dd/mm/aaaa --:--
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      
      const formatted = `${day}/${month}/${year} ${hours}:${minutes}`;
      return formatted;
    } catch (error) {
      console.warn('Erro ao formatar data:', error, dateString);
      return '';
    }
  };

  const [prazo, setPrazo] = useState(formatDateForInput(os.dados_producao?.prazo_estimado || os.data_prevista_entrega));

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

  // Função para obter as imagens de produção
  const getImagensProducao = () => {
    return os.dados_producao.fotos_producao || [];
  };

  // Função para construir URL da imagem
  const getImageUrl = (anexo) => {
    if (!anexo) return null;
    
    // Helper para garantir HTTPS quando a página está em HTTPS
    const ensureHttps = (url) => {
      if (!url) return url;
      // Se a página está em HTTPS, força HTTPS na URL
      if (typeof window !== 'undefined' && window.location.protocol === 'https:' && url.startsWith('http://')) {
        return url.replace('http://', 'https://');
      }
      return url;
    };
    
    if (anexo.url && anexo.url.startsWith('http')) {
      return ensureHttps(anexo.url);
    }
    if (anexo.path) {
      const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const url = `${apiBaseUrl}/storage/${anexo.path}`;
      return ensureHttps(url);
    }
    if (anexo.url && anexo.url.startsWith('/storage/')) {
      const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const url = `${apiBaseUrl}${anexo.url}`;
      return ensureHttps(url);
    }
    return anexo.url ? ensureHttps(anexo.url) : null;
  };

  // Função para remover imagem
  const handleRemoveImage = (imageId) => {
    const imagensAtuais = getImagensProducao();
    const novasImagens = imagensAtuais.filter(img => img.id !== imageId);
    onUpdate(os.id, { fotos_producao: novasImagens }, true);
  };

  const handleObservacoesChange = (e) => setObservacoes(e.target.value);
  const handlePrazoChange = (e) => setPrazo(e.target.value);

  const handleSaveChanges = () => {
    // Converter data do formato dd/mm/aaaa hh:mm para ISO se necessário
    let prazoParaSalvar = prazo;
    if (prazo && prazo.includes('/')) {
      try {
        const [datePart, timePart] = prazo.split(' ');
        const [day, month, year] = datePart.split('/');
        const [hours, minutes] = timePart.split(':');
        const date = new Date(year, month - 1, day, hours, minutes);
        prazoParaSalvar = date.toISOString();
      } catch (error) {
        console.warn('Erro ao converter data:', error);
        prazoParaSalvar = prazo;
      }
    }
    
    onUpdate(os.id, { observacoes_internas: observacoes, prazo_estimado: prazoParaSalvar });
  };
  
  const handleStatusChange = (newStatus) => {
    onUpdate(os.id, { status_producao: newStatus });
  };

  const imagensProducao = getImagensProducao();
  const emAtraso = isEmAtraso(os.dados_producao.status_producao, os.dados_producao.prazo_estimado);

  return (
    <Card className={`transition-all duration-300 ${getStatusColor(os.dados_producao.status_producao, os.dados_producao.prazo_estimado)}`}>
      <CardHeader>
        {/* Aviso de Atraso */}
        {emAtraso && (
          <div className="mb-3 p-2 bg-red-100 dark:bg-red-900/50 border border-red-300 dark:border-red-700 rounded-md">
            <p className="text-xs font-semibold text-red-800 dark:text-red-200 flex items-center">
              <Clock size={14} className="mr-2" />
              ⚠️ PEDIDO EM ATRASO - Prazo de entrega vencido
            </p>
          </div>
        )}
        
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg font-bold">OS: {os.id}</CardTitle>
            <CardDescription className="flex items-center text-xs">
              <CalendarDays size={14} className="mr-1" /> Criada em: {format(parseISO(os.data_criacao), 'dd/MM/yyyy HH:mm')}
            </CardDescription>
          </div>
          <Select value={os.dados_producao.status_producao} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-[200px] h-9 text-xs">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {statusProducaoOptions.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
        <div className="md:col-span-1 space-y-2">
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
                  <div className="text-xs font-medium text-muted-foreground mb-1">Observações:</div>
                  <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded border-l-2 border-primary/30 max-h-20 overflow-y-auto">
                    {os.cliente?.observacoes || os.cliente_info?.observacoes}
                  </div>
                </div>
              )}

              {/* Observações da OS */}
              {(os.observacoes) && (
                <div className="pt-1">
                  <div className="text-xs font-medium text-muted-foreground mb-1">Observações da OS:</div>
                  <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded border-l-2 border-primary/30 max-h-20 overflow-y-auto">
                    {os.observacoes}
                  </div>
                </div>
              )}

              {/* Observações Gerais da OS (da finalização) */}
              {(os.observacoes_gerais_os) && (
                <div className="pt-1">
                  <div className="text-xs font-medium text-muted-foreground mb-1">Observações Gerais (Finalização):</div>
                  <div className="text-xs text-muted-foreground bg-blue-50 dark:bg-blue-900/30 p-2 rounded border-l-2 border-blue-500 max-h-20 overflow-y-auto">
                    {os.observacoes_gerais_os}
                  </div>
                </div>
              )}
            </div>
            
            <p className="text-muted-foreground text-xs">Total: <span className="font-bold text-foreground">R$ {(parseFloat(os.valor_total_os) || 0).toFixed(2)}</span></p>
        </div>
        
        {/* Seção de Imagens de Produção */}
        <div className="md:col-span-2 space-y-3">
          {/* Título da seção de imagens */}
          <div className="flex items-center justify-between">
            <Label className="text-xs font-medium text-muted-foreground">Fotos de Produção</Label>
            <OSProducaoAnexosDialog os={os} onUpdate={onUpdate} />
          </div>
          
          {/* Grid de imagens */}
          {imagensProducao.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {imagensProducao.map((imagem) => (
                <div key={imagem.id} className="relative group">
                  <img
                    src={getImageUrl(imagem)}
                    alt={imagem.name}
                    className="w-full h-24 object-cover rounded-lg border shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => window.open(getImageUrl(imagem), '_blank')}
                    onError={(e) => {
                      console.error('Erro ao carregar imagem:', imagem);
                      e.target.style.display = 'none';
                    }}
                  />
                  {/* Botão de remover */}
                  <Button
                    variant="destructive"
                    size="sm"
                    className="absolute -top-2 -right-2 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => handleRemoveImage(imagem.id)}
                  >
                    <X size={12} />
                  </Button>
                  {/* Nome do arquivo */}
                  <p className="text-xs text-muted-foreground mt-1 truncate" title={imagem.name}>
                    {imagem.name}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-24 border-2 border-dashed border-muted-foreground/20 rounded-lg bg-muted/30">
              <div className="text-center">
                <ImagePlus size={24} className="mx-auto mb-2 text-muted-foreground/50" />
                <p className="text-xs text-muted-foreground">Nenhuma foto de produção</p>
              </div>
            </div>
          )}
          
          {/* Campos de prazo e observações */}
          <div className="space-y-2 pt-2">
            <div>
              <Label htmlFor={`prazo-${os.id_os}`} className="text-xs">Prazo de Entrega (Opcional)</Label>
              <Input
                id={`prazo-${os.id_os}`}
                type="text"
                value={prazo}
                onChange={handlePrazoChange}
                onBlur={handleSaveChanges}
                placeholder="dd/mm/aaaa --:--"
                className="h-8 text-xs"
              />
            </div>
            <div>
              <Label htmlFor={`obs-${os.id_os}`} className="text-xs">Observações Internas da Produção</Label>
              <Textarea
                id={`obs-${os.id_os}`}
                value={observacoes}
                onChange={handleObservacoesChange}
                onBlur={handleSaveChanges}
                placeholder="Detalhes de produção, material usado, etc."
                rows={2}
                className="text-xs"
              />
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-end space-x-2">
        <Button variant="outline" size="sm" onClick={() => onVerRecibo(os)}>
          <FileText size={14} className="mr-2"/> Ver Recibo
        </Button>
      </CardFooter>
    </Card>
  );
};

export default OSEmProducaoCard;