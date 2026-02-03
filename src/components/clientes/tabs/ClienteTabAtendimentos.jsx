import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PlusCircle, MessageSquare, Phone, Users, Trash2, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { atendimentoService } from '@/services/api';

const initialAtendimentoState = {
  canal: 'WhatsApp',
  observacao: '',
};

const ClienteTabAtendimentos = ({ clienteId, currentCliente, setCurrentCliente }) => {
  const [novoAtendimento, setNovoAtendimento] = useState(initialAtendimentoState);
  const [atendimentos, setAtendimentos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNovoAtendimento(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name, value) => {
    setNovoAtendimento(prev => ({ ...prev, [name]: value }));
  };

  // Carregar atendimentos do cliente
  const loadAtendimentos = async () => {
    if (!clienteId) return;
    
    setLoading(true);
    try {
      const response = await atendimentoService.getByCliente(clienteId);
      setAtendimentos(response.data || []);
    } catch (error) {
      console.error('Erro ao carregar atendimentos:', error);
      toast({ 
        title: "Erro", 
        description: "Erro ao carregar atendimentos do cliente.", 
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  // Carregar atendimentos quando o cliente mudar
  useEffect(() => {
    loadAtendimentos();
  }, [clienteId]);

  const handleAddAtendimento = async () => {
    if (!novoAtendimento.observacao.trim()) {
      toast({ title: "Observação Vazia", description: "Por favor, adicione uma observação para o atendimento.", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const atendimentoData = {
        cliente_id: clienteId,
        canal: novoAtendimento.canal,
        observacao: novoAtendimento.observacao.trim(),
      };

      await atendimentoService.create(atendimentoData);
      
      setNovoAtendimento(initialAtendimentoState);
      toast({ title: "Atendimento Registrado!", description: "Novo atendimento adicionado ao histórico do cliente." });
      
      // Recarregar atendimentos
      await loadAtendimentos();
    } catch (error) {
      console.error('Erro ao salvar atendimento:', error);
      toast({ 
        title: "Erro", 
        description: error.message || "Erro ao salvar atendimento.", 
        variant: "destructive" 
      });
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveAtendimento = async (atendimentoId) => {
    try {
      await atendimentoService.delete(atendimentoId);
      toast({ title: "Atendimento Removido!", description: "O registro de atendimento foi excluído." });
      
      // Recarregar atendimentos
      await loadAtendimentos();
    } catch (error) {
      console.error('Erro ao remover atendimento:', error);
      toast({ 
        title: "Erro", 
        description: error.message || "Erro ao remover atendimento.", 
        variant: "destructive" 
      });
    }
  };


  const formatDate = (dateString) => {
    try {
      return format(new Date(dateString), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    } catch (error) {
      return "Data inválida";
    }
  };

  // Obter nome do responsável
  const getResponsavelName = (atendimento) => {
    if (atendimento.user) {
      return atendimento.user.name;
    }
    return 'Usuário não encontrado';
  };

  const canalIcons = {
    WhatsApp: <MessageSquare size={16} className="mr-2 text-green-500" />,
    Presencial: <Users size={16} className="mr-2 text-blue-500" />,
    Telefone: <Phone size={16} className="mr-2 text-orange-500" />,
    Outro: <MessageSquare size={16} className="mr-2 text-gray-500" />,
  };

  if (!clienteId) {
    return <div className="p-4 text-center text-muted-foreground">Selecione um cliente para gerenciar atendimentos.</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Registrar Novo Atendimento</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="atd-responsavel">Responsável</Label>
              <Input 
                id="atd-responsavel" 
                name="responsavel" 
                value={user?.name || 'Carregando...'} 
                disabled 
                placeholder="Nome do atendente" 
              />
            </div>
            <div>
              <Label htmlFor="atd-canal">Canal</Label>
              <Select name="canal" value={novoAtendimento.canal} onValueChange={(value) => handleSelectChange('canal', value)}>
                <SelectTrigger id="atd-canal"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="WhatsApp">WhatsApp</SelectItem>
                  <SelectItem value="Presencial">Presencial</SelectItem>
                  <SelectItem value="Telefone">Telefone</SelectItem>
                  <SelectItem value="Outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label htmlFor="atd-observacao">Observação <span className="text-red-500">*</span></Label>
            <Textarea id="atd-observacao" name="observacao" value={novoAtendimento.observacao} onChange={handleInputChange} placeholder="Descreva o atendimento, solicitação, etc." rows={3} />
          </div>
          <div className="flex justify-end">
            <Button onClick={handleAddAtendimento} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 size={18} className="mr-2 animate-spin" /> Salvando...
                </>
              ) : (
                <>
                  <PlusCircle size={18} className="mr-2" /> Adicionar Registro
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div>
        <h3 className="text-lg font-medium mb-3">Histórico de Atendimentos</h3>
        {loading ? (
          <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
            <Loader2 size={48} className="mb-4 animate-spin" />
            <p>Carregando atendimentos...</p>
          </div>
        ) : (!atendimentos || atendimentos.length === 0) ? (
          <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
            <MessageSquare size={48} className="mb-4" />
            <p>Nenhum atendimento registrado para este cliente.</p>
          </div>
        ) : (
          <ScrollArea className="h-[300px] rounded-md border p-1">
            <div className="space-y-3 p-3">
            {atendimentos.map((atd) => (
              <Card key={atd.id} className="bg-card shadow-sm">
                <CardContent className="p-3">
                  <div className="flex justify-between items-start mb-1">
                    <div className="flex items-center text-sm font-medium">
                      {canalIcons[atd.canal] || canalIcons['Outro']}
                      {atd.canal} por {getResponsavelName(atd)}
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-600" onClick={() => handleRemoveAtendimento(atd.id)}>
                        <Trash2 size={14}/>
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">{formatDate(atd.created_at)}</p>
                  <p className="text-sm whitespace-pre-wrap">{atd.observacao}</p>
                </CardContent>
              </Card>
            ))}
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  );
};

export default ClienteTabAtendimentos;