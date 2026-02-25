import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { cursoService } from '@/services/api';
import { Plus, Trash2, GripVertical, Save, X, AlertCircle } from 'lucide-react';

const TIPOS_QUESTAO = [
  { value: 'multipla_escolha_uma', label: 'Múltipla Escolha (Uma Correta)' },
  { value: 'multipla_escolha_multiplas', label: 'Múltipla Escolha (Múltiplas Corretas)' },
  { value: 'verdadeiro_falso', label: 'Verdadeiro ou Falso' },
  { value: 'dissertativa', label: 'Resposta Dissertativa' },
];

const ConfiguracaoProvaModal = ({ cursoId, open, onClose, onSave }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [configuracao, setConfiguracao] = useState({
    titulo: 'Prova Final',
    descricao: '',
    nota_minima: 70,
    tempo_limite_minutos: null,
    numero_maximo_tentativas: null,
    exigir_aprovacao_certificado: true,
    exigir_aprovacao_conclusao: true,
  });
  const [questoes, setQuestoes] = useState([]);
  const [questaoEditando, setQuestaoEditando] = useState(null);

  useEffect(() => {
    if (open && cursoId) {
      carregarConfiguracao();
    }
  }, [open, cursoId]);

  const carregarConfiguracao = async () => {
    setLoading(true);
    try {
      const response = await cursoService.getProvaConfiguracao(cursoId);
      if (response.data.success) {
        if (response.data.data.prova) {
          setConfiguracao({
            titulo: response.data.data.prova.titulo || 'Prova Final',
            descricao: response.data.data.prova.descricao || '',
            nota_minima: response.data.data.prova.nota_minima || 70,
            tempo_limite_minutos: response.data.data.prova.tempo_limite_minutos,
            numero_maximo_tentativas: response.data.data.prova.numero_maximo_tentativas,
            exigir_aprovacao_certificado: response.data.data.prova.exigir_aprovacao_certificado ?? true,
            exigir_aprovacao_conclusao: response.data.data.prova.exigir_aprovacao_conclusao ?? true,
          });
          setQuestoes(response.data.data.questoes || []);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar configuração:', error);
    } finally {
      setLoading(false);
    }
  };

  const salvarConfiguracao = async () => {
    setLoading(true);
    try {
      await cursoService.salvarProvaConfiguracao(cursoId, configuracao);
      toast({
        title: 'Sucesso',
        description: 'Configuração da prova salva com sucesso!',
      });
      if (onSave) onSave();
    } catch (error) {
      toast({
        title: 'Erro',
        description: error.response?.data?.message || 'Erro ao salvar configuração',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const salvarQuestao = async (questaoData) => {
    try {
      // Validar questão
      if (!questaoData.enunciado || !questaoData.enunciado.trim()) {
        toast({
          title: 'Erro',
          description: 'O enunciado da questão é obrigatório',
          variant: 'destructive',
        });
        return;
      }

      if (questaoData.tipo !== 'dissertativa' && questaoData.tipo !== 'verdadeiro_falso') {
        if (!questaoData.alternativas || questaoData.alternativas.length < 2) {
          toast({
            title: 'Erro',
            description: 'Adicione pelo menos 2 alternativas',
            variant: 'destructive',
          });
          return;
        }

        // Verificar se há resposta correta
        const temRespostaCorreta = questaoData.alternativas.some(alt => alt.correta);
        if (!temRespostaCorreta) {
          toast({
            title: 'Erro',
            description: 'Marque pelo menos uma alternativa como correta',
            variant: 'destructive',
          });
          return;
        }
      }

      const response = await cursoService.salvarQuestao(cursoId, {
        ...questaoData,
        ordem: questoes.length,
      });
      if (response.data.success) {
        if (questaoData.id) {
          setQuestoes(questoes.map(q => q.id === questaoData.id ? response.data.data : q));
        } else {
          setQuestoes([...questoes, response.data.data]);
        }
        setQuestaoEditando(null);
        toast({
          title: 'Sucesso',
          description: 'Questão salva com sucesso!',
        });
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: error.response?.data?.message || 'Erro ao salvar questão',
        variant: 'destructive',
      });
    }
  };

  const excluirQuestao = async (questaoId) => {
    if (!window.confirm('Tem certeza que deseja excluir esta questão?')) return;
    
    try {
      await cursoService.excluirQuestao(cursoId, questaoId);
      setQuestoes(questoes.filter(q => q.id !== questaoId));
      toast({
        title: 'Sucesso',
        description: 'Questão excluída com sucesso!',
      });
    } catch (error) {
      toast({
        title: 'Erro',
        description: error.response?.data?.message || 'Erro ao excluir questão',
        variant: 'destructive',
      });
    }
  };

  const adicionarAlternativa = (questaoIndex) => {
    const questao = questoes[questaoIndex];
    const novasAlternativas = [...(questao.alternativas || []), { id: Date.now().toString(), texto: '', correta: false }];
    const novasQuestoes = [...questoes];
    novasQuestoes[questaoIndex] = { ...questao, alternativas: novasAlternativas };
    setQuestoes(novasQuestoes);
  };

  const removerAlternativa = (questaoIndex, altIndex) => {
    const questao = questoes[questaoIndex];
    const novasAlternativas = questao.alternativas.filter((_, i) => i !== altIndex);
    const novasQuestoes = [...questoes];
    novasQuestoes[questaoIndex] = { ...questao, alternativas: novasAlternativas };
    setQuestoes(novasQuestoes);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configuração da Prova Final</DialogTitle>
          <DialogDescription>
            Configure a prova final do treinamento. O colaborador só concluirá o treinamento após ser aprovado na prova final.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Configurações Gerais */}
          <Card>
            <CardHeader>
              <CardTitle>Configurações Gerais</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Título da Prova</Label>
                <Input
                  value={configuracao.titulo}
                  onChange={(e) => setConfiguracao({ ...configuracao, titulo: e.target.value })}
                  placeholder="Ex: Prova Final"
                />
              </div>

              <div>
                <Label>Descrição/Instruções</Label>
                <Textarea
                  value={configuracao.descricao}
                  onChange={(e) => setConfiguracao({ ...configuracao, descricao: e.target.value })}
                  placeholder="Instruções para o colaborador..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Nota Mínima para Aprovação (%)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={configuracao.nota_minima}
                    onChange={(e) => setConfiguracao({ ...configuracao, nota_minima: parseFloat(e.target.value) || 0 })}
                  />
                </div>

                <div>
                  <Label>Tempo Limite (minutos) - Opcional</Label>
                  <Input
                    type="number"
                    min="1"
                    value={configuracao.tempo_limite_minutos || ''}
                    onChange={(e) => setConfiguracao({ 
                      ...configuracao, 
                      tempo_limite_minutos: e.target.value ? parseInt(e.target.value) : null 
                    })}
                    placeholder="Sem limite"
                  />
                </div>
              </div>

              <div>
                <Label>Número Máximo de Tentativas</Label>
                <Select
                  value={configuracao.numero_maximo_tentativas === null ? 'ilimitado' : 'limitado'}
                  onValueChange={(value) => setConfiguracao({ 
                    ...configuracao, 
                    numero_maximo_tentativas: value === 'ilimitado' ? null : 3 
                  })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ilimitado">Ilimitado</SelectItem>
                    <SelectItem value="limitado">Definir quantidade</SelectItem>
                  </SelectContent>
                </Select>
                {configuracao.numero_maximo_tentativas !== null && (
                  <Input
                    type="number"
                    min="1"
                    value={configuracao.numero_maximo_tentativas}
                    onChange={(e) => setConfiguracao({ 
                      ...configuracao, 
                      numero_maximo_tentativas: parseInt(e.target.value) || 1 
                    })}
                    className="mt-2"
                  />
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Exigir aprovação para liberar certificado</Label>
                  <Switch
                    checked={configuracao.exigir_aprovacao_certificado}
                    onCheckedChange={(checked) => setConfiguracao({ ...configuracao, exigir_aprovacao_certificado: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Exigir aprovação para concluir treinamento</Label>
                  <Switch
                    checked={configuracao.exigir_aprovacao_conclusao}
                    onCheckedChange={(checked) => setConfiguracao({ ...configuracao, exigir_aprovacao_conclusao: checked })}
                  />
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <p className="text-sm text-yellow-800">
                  O colaborador só concluirá o treinamento após ser aprovado na prova final e obter no mínimo {configuracao.nota_minima}% de acertos.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Questões */}
          <Card>
            <CardHeader>
              <CardTitle>Questões da Prova</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {questoes.map((questao, index) => (
                <QuestaoCard
                  key={questao.id}
                  questao={questao}
                  index={index}
                  onEdit={setQuestaoEditando}
                  onSave={salvarQuestao}
                  onDelete={excluirQuestao}
                  onAddAlternativa={adicionarAlternativa}
                  onRemoveAlternativa={removerAlternativa}
                />
              ))}

              {questaoEditando === null && (
                <Button
                  onClick={() => setQuestaoEditando({ tipo: 'multipla_escolha_uma', enunciado: '', alternativas: [], peso: 1 })}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Pergunta
                </Button>
              )}

              {questaoEditando && (
                <QuestaoForm
                  questao={questaoEditando}
                  onSave={salvarQuestao}
                  onCancel={() => setQuestaoEditando(null)}
                />
              )}
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button onClick={salvarConfiguracao} disabled={loading}>
              <Save className="h-4 w-4 mr-2" />
              Salvar Configuração
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const QuestaoCard = ({ questao, index, onEdit, onSave, onDelete, onAddAlternativa, onRemoveAlternativa }) => {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <GripVertical className="h-5 w-5 text-gray-400" />
            <Badge>PERGUNTA {index + 1}</Badge>
            <Badge variant="outline">{TIPOS_QUESTAO.find(t => t.value === questao.tipo)?.label}</Badge>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => onEdit(questao)}>
              Editar
            </Button>
            <Button size="sm" variant="destructive" onClick={() => onDelete(questao.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <p className="font-medium mb-2">{questao.enunciado}</p>
        {questao.alternativas && questao.alternativas.length > 0 && (
          <div className="space-y-1">
            {questao.alternativas.map((alt, altIndex) => (
              <div key={altIndex} className="flex items-center gap-2 text-sm">
                <span className="font-medium">{String.fromCharCode(65 + altIndex)}:</span>
                <span>{alt.texto}</span>
                {alt.correta && <Badge className="bg-green-100 text-green-800">Correta</Badge>}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const QuestaoForm = ({ questao, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    id: questao?.id || null,
    tipo: questao?.tipo || 'multipla_escolha_uma',
    enunciado: questao?.enunciado || '',
    alternativas: questao?.alternativas || [],
    respostas_corretas: questao?.respostas_corretas || [],
    peso: questao?.peso || 1,
    ordem: questao?.ordem || 0,
  });

  useEffect(() => {
    if (questao) {
      setFormData({
        id: questao.id || null,
        tipo: questao.tipo || 'multipla_escolha_uma',
        enunciado: questao.enunciado || '',
        alternativas: questao.alternativas || [],
        respostas_corretas: questao.respostas_corretas || [],
        peso: questao.peso || 1,
        ordem: questao.ordem || 0,
      });
    }
  }, [questao]);

  const handleSave = () => {
    // Processar alternativas e respostas corretas
    let respostasCorretas = [];
    
    if (formData.tipo === 'verdadeiro_falso') {
      respostasCorretas = formData.respostas_corretas || [];
    } else if (formData.tipo === 'dissertativa') {
      respostasCorretas = [];
    } else {
      // Múltipla escolha
      const alternativas = formData.alternativas || [];
      respostasCorretas = alternativas
        .map((alt, index) => alt.correta ? (alt.id || index.toString()) : null)
        .filter(id => id !== null);
    }

    onSave({
      ...formData,
      respostas_corretas: respostasCorretas,
    });
  };

  return (
    <Card className="border-2 border-primary">
      <CardContent className="p-4 space-y-4">
        <div>
          <Label>Tipo de Questão</Label>
          <Select
            value={formData.tipo}
            onValueChange={(value) => {
              // Quando mudar o tipo, resetar alternativas se necessário
              let novasAlternativas = formData.alternativas || [];
              if ((value === 'multipla_escolha_uma' || value === 'multipla_escolha_multiplas') && novasAlternativas.length === 0) {
                novasAlternativas = [
                  { id: '1', texto: '', correta: false },
                  { id: '2', texto: '', correta: false },
                ];
              }
              setFormData({ ...formData, tipo: value, alternativas: novasAlternativas });
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIPOS_QUESTAO.map(tipo => (
                <SelectItem key={tipo.value} value={tipo.value}>{tipo.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Enunciado da Questão</Label>
          <Textarea
            value={formData.enunciado}
            onChange={(e) => setFormData({ ...formData, enunciado: e.target.value })}
            placeholder="Digite a pergunta..."
            rows={3}
          />
        </div>

        {formData.tipo !== 'dissertativa' && formData.tipo !== 'verdadeiro_falso' && (
          <div>
            <Label>Alternativas</Label>
            {(formData.alternativas || []).map((alt, index) => (
              <div key={index} className="flex items-center gap-2 mt-2">
                <span className="font-medium w-6">{String.fromCharCode(65 + index)}:</span>
                <Input
                  value={alt.texto}
                  onChange={(e) => {
                    const novasAlternativas = [...formData.alternativas];
                    novasAlternativas[index] = { ...alt, texto: e.target.value };
                    setFormData({ ...formData, alternativas: novasAlternativas });
                  }}
                  placeholder="Texto da alternativa"
                />
                {formData.tipo === 'multipla_escolha_uma' && (
                  <input
                    type="radio"
                    name="correta"
                    checked={alt.correta}
                    onChange={() => {
                      const novasAlternativas = formData.alternativas.map((a, i) => ({
                        ...a,
                        correta: i === index
                      }));
                      setFormData({ ...formData, alternativas: novasAlternativas });
                    }}
                  />
                )}
                {formData.tipo === 'multipla_escolha_multiplas' && (
                  <input
                    type="checkbox"
                    checked={alt.correta}
                    onChange={(e) => {
                      const novasAlternativas = [...formData.alternativas];
                      novasAlternativas[index] = { ...alt, correta: e.target.checked };
                      setFormData({ ...formData, alternativas: novasAlternativas });
                    }}
                  />
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    const novasAlternativas = formData.alternativas.filter((_, i) => i !== index);
                    setFormData({ ...formData, alternativas: novasAlternativas });
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setFormData({
                ...formData,
                alternativas: [...(formData.alternativas || []), { id: Date.now().toString(), texto: '', correta: false }]
              })}
              className="mt-2"
            >
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Alternativa
            </Button>
          </div>
        )}

        {formData.tipo === 'verdadeiro_falso' && (
          <div>
            <Label>Resposta Correta</Label>
            <Select
              value={formData.respostas_corretas?.[0] || ''}
              onValueChange={(value) => setFormData({ ...formData, respostas_corretas: [value] })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="verdadeiro">Verdadeiro</SelectItem>
                <SelectItem value="falso">Falso</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        <div>
          <Label>Peso da Questão</Label>
          <Input
            type="number"
            min="0.01"
            step="0.01"
            value={formData.peso || 1}
            onChange={(e) => setFormData({ ...formData, peso: parseFloat(e.target.value) || 1 })}
          />
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>
            Salvar Questão
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ConfiguracaoProvaModal;
