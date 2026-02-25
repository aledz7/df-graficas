import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { cursoService } from '@/services/api';
import { Clock, CheckCircle2, XCircle, AlertCircle, Send, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const ProvaPage = () => {
  const { cursoId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [prova, setProva] = useState(null);
  const [tentativa, setTentativa] = useState(null);
  const [respostas, setRespostas] = useState({});
  const [tempoRestante, setTempoRestante] = useState(null);
  const [resultado, setResultado] = useState(null);

  useEffect(() => {
    iniciarProva();
  }, [cursoId]);

  useEffect(() => {
    if (tentativa && prova?.tempo_limite_minutos) {
      const interval = setInterval(() => {
        calcularTempoRestante();
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [tentativa, prova]);

  const iniciarProva = async () => {
    setLoading(true);
    try {
      const response = await cursoService.iniciarProva(cursoId);
      if (response.data.success) {
        setProva(response.data.data.prova);
        setTentativa(response.data.data.tentativa);
        calcularTempoRestante();
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: error.response?.data?.message || 'Erro ao iniciar prova',
        variant: 'destructive',
      });
      navigate(`/ferramentas/treinamento/${cursoId}`);
    } finally {
      setLoading(false);
    }
  };

  const calcularTempoRestante = () => {
    if (!tentativa?.data_inicio || !prova?.tempo_limite_minutos) {
      setTempoRestante(null);
      return;
    }

    const inicio = new Date(tentativa.data_inicio);
    const limite = new Date(inicio.getTime() + prova.tempo_limite_minutos * 60000);
    const agora = new Date();
    const restante = Math.max(0, Math.floor((limite - agora) / 1000));

    if (restante === 0) {
      setTempoRestante(0);
      enviarProva(true);
      return;
    }

    const minutos = Math.floor(restante / 60);
    const segundos = restante % 60;
    setTempoRestante({ minutos, segundos, total: restante });
  };

  const formatarTempo = (tempo) => {
    if (!tempo) return '';
    return `${String(tempo.minutos).padStart(2, '0')}:${String(tempo.segundos).padStart(2, '0')}`;
  };

  const handleResposta = (questaoId, resposta) => {
    setRespostas({
      ...respostas,
      [questaoId]: resposta,
    });
  };

  const handleRespostaMultipla = (questaoId, alternativaId, checked) => {
    const respostasAtuais = respostas[questaoId] || [];
    let novasRespostas;
    
    if (checked) {
      novasRespostas = [...respostasAtuais, alternativaId];
    } else {
      novasRespostas = respostasAtuais.filter(id => id !== alternativaId);
    }
    
    setRespostas({
      ...respostas,
      [questaoId]: novasRespostas,
    });
  };

  const enviarProva = async (expirado = false) => {
    if (expirado) {
      toast({
        title: 'Tempo Esgotado',
        description: 'O tempo limite da prova foi atingido. Suas respostas serão enviadas automaticamente.',
        variant: 'destructive',
      });
    }

    setEnviando(true);
    try {
      const respostasArray = Object.entries(respostas).map(([questaoId, resposta]) => ({
        questao_id: parseInt(questaoId),
        resposta: resposta,
      }));

      const response = await cursoService.enviarRespostas(cursoId, tentativa.id, {
        respostas: respostasArray,
      });

      if (response.data.success) {
        setResultado(response.data.data);
        toast({
          title: 'Prova Enviada',
          description: `Nota obtida: ${response.data.data.nota_obtida}%`,
        });
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: error.response?.data?.message || 'Erro ao enviar prova',
        variant: 'destructive',
      });
    } finally {
      setEnviando(false);
    }
  };

  const verResultado = async () => {
    try {
      const response = await cursoService.getResultadoProva(cursoId, tentativa.id);
      if (response.data.success) {
        setResultado(response.data.data);
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao carregar resultado',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando prova...</p>
        </div>
      </div>
    );
  }

  if (resultado) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {resultado.aprovado ? (
                  <CheckCircle2 className="h-6 w-6 text-green-500" />
                ) : (
                  <XCircle className="h-6 w-6 text-red-500" />
                )}
                Resultado da Prova
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center py-6">
                <div className="text-4xl font-bold mb-2">
                  {resultado.nota_obtida}%
                </div>
                <Badge className={resultado.aprovado ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                  {resultado.aprovado ? 'Aprovado' : 'Reprovado'}
                </Badge>
                <p className="text-sm text-gray-600 mt-2">
                  Nota mínima: {resultado.nota_minima}%
                </p>
              </div>

              {resultado.tentativas_restantes !== null && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    Tentativas restantes: {resultado.tentativas_restantes}
                  </p>
                </div>
              )}

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => navigate(`/ferramentas/treinamento/${cursoId}`)}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Voltar ao Treinamento
                </Button>
                {!resultado.aprovado && resultado.tentativas_restantes > 0 && (
                  <Button onClick={() => window.location.reload()}>
                    Tentar Novamente
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Cabeçalho */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{prova?.titulo || 'Prova Final'}</CardTitle>
                {prova?.descricao && (
                  <p className="text-sm text-gray-600 mt-2">{prova.descricao}</p>
                )}
              </div>
              {tempoRestante && (
                <div className="flex items-center gap-2 text-lg font-bold">
                  <Clock className="h-5 w-5" />
                  {formatarTempo(tempoRestante)}
                </div>
              )}
            </div>
          </CardHeader>
        </Card>

        {/* Questões */}
        {prova?.questoes?.map((questao, index) => (
          <Card key={questao.id}>
            <CardHeader>
              <CardTitle className="text-lg">
                Questão {index + 1} {questao.peso > 1 && `(Peso: ${questao.peso})`}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="font-medium">{questao.enunciado}</p>

              {questao.tipo === 'multipla_escolha_uma' && (
                <RadioGroup
                  value={respostas[questao.id]?.toString()}
                  onValueChange={(value) => handleResposta(questao.id, value)}
                >
                  {questao.alternativas?.map((alt, altIndex) => (
                    <div key={altIndex} className="flex items-center space-x-2">
                      <RadioGroupItem value={alt.id?.toString() || altIndex.toString()} id={`q${questao.id}-a${altIndex}`} />
                      <Label htmlFor={`q${questao.id}-a${altIndex}`} className="cursor-pointer flex-1">
                        {String.fromCharCode(65 + altIndex)}: {alt.texto}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              )}

              {questao.tipo === 'multipla_escolha_multiplas' && (
                <div className="space-y-2">
                  {questao.alternativas?.map((alt, altIndex) => (
                    <div key={altIndex} className="flex items-center space-x-2">
                      <Checkbox
                        id={`q${questao.id}-a${altIndex}`}
                        checked={(respostas[questao.id] || []).includes(alt.id?.toString() || altIndex.toString())}
                        onCheckedChange={(checked) => handleRespostaMultipla(
                          questao.id,
                          alt.id?.toString() || altIndex.toString(),
                          checked
                        )}
                      />
                      <Label htmlFor={`q${questao.id}-a${altIndex}`} className="cursor-pointer flex-1">
                        {String.fromCharCode(65 + altIndex)}: {alt.texto}
                      </Label>
                    </div>
                  ))}
                </div>
              )}

              {questao.tipo === 'verdadeiro_falso' && (
                <RadioGroup
                  value={respostas[questao.id]}
                  onValueChange={(value) => handleResposta(questao.id, value)}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="verdadeiro" id={`q${questao.id}-v`} />
                    <Label htmlFor={`q${questao.id}-v`} className="cursor-pointer">Verdadeiro</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="falso" id={`q${questao.id}-f`} />
                    <Label htmlFor={`q${questao.id}-f`} className="cursor-pointer">Falso</Label>
                  </div>
                </RadioGroup>
              )}

              {questao.tipo === 'dissertativa' && (
                <Textarea
                  value={respostas[questao.id] || ''}
                  onChange={(e) => handleResposta(questao.id, e.target.value)}
                  placeholder="Digite sua resposta..."
                  rows={4}
                />
              )}
            </CardContent>
          </Card>
        ))}

        {/* Botão de Enviar */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">
                  Respondidas: {Object.keys(respostas).length} / {prova?.questoes?.length || 0}
                </p>
                <Progress 
                  value={(Object.keys(respostas).length / (prova?.questoes?.length || 1)) * 100} 
                  className="mt-2"
                />
              </div>
              <Button
                onClick={() => enviarProva()}
                disabled={enviando || Object.keys(respostas).length === 0}
                size="lg"
              >
                <Send className="h-4 w-4 mr-2" />
                {enviando ? 'Enviando...' : 'Enviar Prova'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ProvaPage;
