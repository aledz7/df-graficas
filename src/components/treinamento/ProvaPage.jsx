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
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';
import { cursoService } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Send, 
  ArrowLeft, 
  Save,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Trophy,
  FileText,
  Users,
  GraduationCap,
  Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const ProvaPage = () => {
  const { cursoId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [prova, setProva] = useState(null);
  const [curso, setCurso] = useState(null);
  const [tentativa, setTentativa] = useState(null);
  const [respostas, setRespostas] = useState({});
  const [tempoRestante, setTempoRestante] = useState(null);
  const [resultado, setResultado] = useState(null);
  const [questaoAtual, setQuestaoAtual] = useState(0);
  const [provaIniciada, setProvaIniciada] = useState(false);
  const [mostrarConfirmacao, setMostrarConfirmacao] = useState(false);

  useEffect(() => {
    carregarDados();
  }, [cursoId]);

  useEffect(() => {
    if (tentativa && prova?.tempo_limite_minutos && provaIniciada) {
      const interval = setInterval(() => {
        calcularTempoRestante();
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [tentativa, prova, provaIniciada]);

  const carregarDados = async () => {
    setLoading(true);
    try {
      // Carregar curso
      const cursoResponse = await cursoService.getById(cursoId);
      if (cursoResponse.data.success) {
        setCurso(cursoResponse.data.data);
      }

      // Verificar se já existe tentativa em andamento
      const response = await cursoService.iniciarProva(cursoId);
      if (response.data.success) {
        setProva(response.data.data.prova);
        setTentativa(response.data.data.tentativa);
        
        // Se já tem respostas salvas, carregar
        if (response.data.data.tentativa?.respostas) {
          const respostasSalvas = {};
          response.data.data.tentativa.respostas.forEach(resp => {
            respostasSalvas[resp.questao_id] = resp.resposta;
          });
          setRespostas(respostasSalvas);
        }

        calcularTempoRestante();
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: error.response?.data?.message || 'Erro ao carregar prova',
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
      setTempoRestante({ minutos: 0, segundos: 0, total: 0 });
      enviarProva(true);
      return;
    }

    const minutos = Math.floor(restante / 60);
    const segundos = restante % 60;
    setTempoRestante({ minutos, segundos, total: restante });
  };

  const formatarTempo = (tempo) => {
    if (!tempo) return '--:--';
    return `${String(tempo.minutos).padStart(2, '0')}:${String(tempo.segundos).padStart(2, '0')}`;
  };

  const iniciarProva = () => {
    setProvaIniciada(true);
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

  const salvarProgresso = async () => {
    try {
      // Salvar respostas no backend (se houver endpoint)
      toast({
        title: 'Progresso salvo',
        description: 'Você pode continuar depois',
      });
    } catch (error) {
      console.error('Erro ao salvar progresso:', error);
    }
  };

  const enviarProva = async (expirado = false) => {
    if (expirado) {
      toast({
        title: 'Tempo Esgotado',
        description: 'O tempo limite da prova foi atingido. Suas respostas serão enviadas automaticamente.',
        variant: 'destructive',
      });
    }

    // Validar se todas as questões foram respondidas
    const questoesRespondidas = Object.keys(respostas).length;
    const totalQuestoes = prova?.questoes?.length || 0;
    
    if (questoesRespondidas < totalQuestoes && !expirado) {
      setMostrarConfirmacao(true);
      return;
    }

    setEnviando(true);
    try {
      const respostasArray = Object.entries(respostas).map(([questaoId, resposta]) => {
        const questao = prova.questoes.find(q => q.id === parseInt(questaoId));
        
        // Para múltipla escolha múltiplas, enviar como array
        // Para outras, enviar como string (o backend aceita ambos)
        let respostaFormatada = resposta;
        if (questao?.tipo === 'multipla_escolha_multiplas') {
          respostaFormatada = Array.isArray(resposta) ? resposta : (resposta ? [resposta] : []);
        } else {
          // Para outras, pegar o primeiro elemento se for array
          respostaFormatada = Array.isArray(resposta) ? resposta[0] : resposta;
        }
        
        return {
          questao_id: parseInt(questaoId),
          resposta: respostaFormatada,
        };
      });

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
      setMostrarConfirmacao(false);
    }
  };

  const cancelarProva = () => {
    if (window.confirm('Tem certeza que deseja cancelar a prova? Seu progresso será perdido.')) {
      navigate(`/ferramentas/treinamento/${cursoId}`);
    }
  };

  const getSetorNome = (setor) => {
    const setores = {
      administrativo: 'ADMINISTRATIVO',
      financeiro: 'FINANCEIRO',
      comercial: 'COMERCIAL',
      criacao: 'CRIAÇÃO',
      producao: 'PRODUÇÃO',
      logistica: 'LOGÍSTICA',
      efc: 'EFC',
    };
    return setores[setor] || setor?.toUpperCase() || '';
  };

  const questoesRespondidas = Object.keys(respostas).length;
  const totalQuestoes = prova?.questoes?.length || 0;
  const percentualProgresso = totalQuestoes > 0 ? (questoesRespondidas / totalQuestoes) * 100 : 0;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-gray-600">Carregando prova...</p>
        </div>
      </div>
    );
  }

  // Tela de resultado
  if (resultado) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4 py-6 max-w-4xl">
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl flex items-center gap-2">
                    {resultado.aprovado ? (
                      <CheckCircle2 className="h-8 w-8 text-green-500" />
                    ) : (
                      <XCircle className="h-8 w-8 text-red-500" />
                    )}
                    Resultado da Prova Final
                  </CardTitle>
                  <p className="text-sm text-gray-600 mt-2">
                    Treinamento: {curso?.titulo || 'Treinamento'}
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Nota Final */}
              <div className="text-center py-8 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700 rounded-lg">
                <div className="text-6xl font-bold mb-2">
                  {resultado.nota_obtida}%
                </div>
                <Badge 
                  className={`text-lg px-4 py-2 ${
                    resultado.aprovado 
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                      : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                  }`}
                >
                  {resultado.aprovado ? '✅ Aprovado' : '❌ Reprovado'}
                </Badge>
                <p className="text-sm text-gray-600 mt-3">
                  Nota mínima exigida: {resultado.nota_minima}%
                </p>
              </div>

              {/* Informações da Prova */}
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Trophy className="h-5 w-5 text-yellow-500" />
                      <span className="text-sm font-medium">Pontuação</span>
                    </div>
                    <p className="text-2xl font-bold">
                      {resultado.pontos_obtidos || 0} / {resultado.pontos_totais || 0} pontos
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="h-5 w-5 text-blue-500" />
                      <span className="text-sm font-medium">Tentativa</span>
                    </div>
                    <p className="text-2xl font-bold">
                      {resultado.numero_tentativa || 1}
                      {resultado.numero_maximo_tentativas && ` / ${resultado.numero_maximo_tentativas}`}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Tentativas Restantes */}
              {resultado.tentativas_restantes !== null && (
                <div className={`border rounded-lg p-4 ${
                  resultado.tentativas_restantes > 0 
                    ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800' 
                    : 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800'
                }`}>
                  <div className="flex items-center gap-2">
                    <AlertCircle className={`h-5 w-5 ${
                      resultado.tentativas_restantes > 0 ? 'text-blue-600' : 'text-red-600'
                    }`} />
                    <p className={`text-sm font-medium ${
                      resultado.tentativas_restantes > 0 ? 'text-blue-800' : 'text-red-800'
                    }`}>
                      {resultado.tentativas_restantes > 0 
                        ? `Tentativas restantes: ${resultado.tentativas_restantes}`
                        : 'Limite de tentativas atingido. Entre em contato com o administrador para liberação.'
                      }
                    </p>
                  </div>
                </div>
              )}

              {/* Data/Hora */}
              {resultado.data_envio && (
                <div className="text-center text-sm text-gray-600">
                  <p>Prova finalizada em: {format(new Date(resultado.data_envio), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}</p>
                </div>
              )}

              {/* Botões de Ação */}
              <div className="flex gap-3 pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => navigate(`/ferramentas/treinamento/${cursoId}`)}
                  className="flex-1"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Voltar ao Treinamento
                </Button>
                {resultado.aprovado && (
                  <Button 
                    onClick={() => navigate(`/ferramentas/treinamento/${cursoId}`)}
                    className="flex-1 bg-green-500 hover:bg-green-600"
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Concluir Treinamento
                  </Button>
                )}
                {!resultado.aprovado && resultado.tentativas_restantes > 0 && (
                  <Button 
                    onClick={() => window.location.reload()}
                    className="flex-1"
                  >
                    <GraduationCap className="h-4 w-4 mr-2" />
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

  // Tela de regras antes de iniciar
  if (!provaIniciada) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4 py-6 max-w-4xl">
          {/* Cabeçalho */}
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl flex items-center gap-2">
                    <GraduationCap className="h-6 w-6" />
                    Prova Final
                  </CardTitle>
                  <p className="text-sm text-gray-600 mt-2">
                    Treinamento: {curso?.titulo || 'Treinamento'}
                  </p>
                </div>
                <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                  Prova Obrigatória para Conclusão
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Colaborador</p>
                  <p className="font-medium">{user?.name || 'Usuário'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Setor</p>
                  <p className="font-medium">{getSetorNome(curso?.setor)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Caixa de Regras */}
          <Card>
            <CardHeader>
              <CardTitle>Informações da Prova</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <Trophy className="h-8 w-8 text-blue-500" />
                  <div>
                    <p className="text-xs text-gray-600">Nota Mínima</p>
                    <p className="text-lg font-bold">{prova?.nota_minima || 70}%</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <FileText className="h-8 w-8 text-green-500" />
                  <div>
                    <p className="text-xs text-gray-600">Questões</p>
                    <p className="text-lg font-bold">{prova?.questoes?.length || 0}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <Users className="h-8 w-8 text-purple-500" />
                  <div>
                    <p className="text-xs text-gray-600">Tentativa</p>
                    <p className="text-lg font-bold">
                      {tentativa?.numero_tentativa || 1}
                      {prova?.numero_maximo_tentativas && ` / ${prova.numero_maximo_tentativas}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                  <Clock className="h-8 w-8 text-orange-500" />
                  <div>
                    <p className="text-xs text-gray-600">Tempo Limite</p>
                    <p className="text-lg font-bold">
                      {prova?.tempo_limite_minutos ? `${prova.tempo_limite_minutos} min` : 'Sem limite'}
                    </p>
                  </div>
                </div>
              </div>

              {prova?.descricao && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">{prova.descricao}</p>
                </div>
              )}

              <Button 
                onClick={iniciarProva}
                size="lg"
                className="w-full bg-green-500 hover:bg-green-600"
              >
                <GraduationCap className="h-5 w-5 mr-2" />
                Iniciar Prova
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Tela da prova em andamento
  const questao = prova?.questoes?.[questaoAtual];
  const questaoRespondida = respostas[questao?.id] !== undefined && respostas[questao?.id] !== null && respostas[questao?.id] !== '';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Cabeçalho Fixo */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <GraduationCap className="h-6 w-6 text-primary" />
              <div>
                <h1 className="text-xl font-bold">Prova Final</h1>
                <p className="text-sm text-gray-600">Treinamento: {curso?.titulo || 'Treinamento'}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Em Andamento
              </Badge>
              {tempoRestante && (
                <div className="flex items-center gap-2 text-lg font-bold">
                  <Clock className="h-5 w-5 text-orange-500" />
                  <span>Tempo Restante: {formatarTempo(tempoRestante)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Barra de Informações */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-yellow-500" />
              <div>
                <p className="text-xs text-gray-600">Nota Mínima</p>
                <p className="text-sm font-bold">{prova?.nota_minima || 70}%</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-blue-500" />
              <div>
                <p className="text-xs text-gray-600">Questões</p>
                <p className="text-sm font-bold">{questoesRespondidas}/{totalQuestoes}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-purple-500" />
              <div>
                <p className="text-xs text-gray-600">Tentativa</p>
                <p className="text-sm font-bold">
                  {tentativa?.numero_tentativa || 1}
                  {prova?.numero_maximo_tentativas && ` de ${prova.numero_maximo_tentativas}`}
                </p>
              </div>
            </div>
            {tempoRestante && (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-orange-500" />
                <div>
                  <p className="text-xs text-gray-600">Tempo</p>
                  <p className="text-sm font-bold">{formatarTempo(tempoRestante)}</p>
                </div>
              </div>
            )}
            <div className="col-span-2 md:col-span-1">
              <p className="text-xs text-gray-600 mb-1">Progresso</p>
              <Progress value={percentualProgresso} className="h-2" />
              <p className="text-xs text-gray-600 mt-1">{questoesRespondidas} de {totalQuestoes} respondidas</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Área Principal - Questões */}
          <div className="lg:col-span-2 space-y-6">
            {/* Questão Atual */}
            {questao && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">
                      Questão {questaoAtual + 1} de {totalQuestoes}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">
                        {questao.tipo === 'multipla_escolha_uma' && 'Múltipla Escolha (1 correta)'}
                        {questao.tipo === 'multipla_escolha_multiplas' && 'Múltipla Escolha (múltiplas corretas)'}
                        {questao.tipo === 'verdadeiro_falso' && 'Verdadeiro ou Falso'}
                        {questao.tipo === 'dissertativa' && 'Resposta Dissertativa'}
                      </Badge>
                      <Badge className="bg-blue-100 text-blue-800">
                        {questao.peso || 1.0} ponto{questao.peso > 1 ? 's' : ''}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <p className="text-lg font-medium">{questao.enunciado}</p>

                  {/* Múltipla Escolha (1 correta) */}
                  {questao.tipo === 'multipla_escolha_uma' && (
                    <RadioGroup
                      value={respostas[questao.id]?.toString()}
                      onValueChange={(value) => handleResposta(questao.id, value)}
                    >
                      {questao.alternativas?.map((alt, altIndex) => (
                        <div key={altIndex} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">
                          <RadioGroupItem 
                            value={alt.id?.toString() || altIndex.toString()} 
                            id={`q${questao.id}-a${altIndex}`} 
                          />
                          <Label 
                            htmlFor={`q${questao.id}-a${altIndex}`} 
                            className="cursor-pointer flex-1 text-base"
                          >
                            <span className="font-bold mr-2">{String.fromCharCode(65 + altIndex)}:</span>
                            {alt.texto}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  )}

                  {/* Múltipla Escolha (múltiplas corretas) */}
                  {questao.tipo === 'multipla_escolha_multiplas' && (
                    <div className="space-y-2">
                      {questao.alternativas?.map((alt, altIndex) => (
                        <div key={altIndex} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">
                          <Checkbox
                            id={`q${questao.id}-a${altIndex}`}
                            checked={(respostas[questao.id] || []).includes(alt.id?.toString() || altIndex.toString())}
                            onCheckedChange={(checked) => handleRespostaMultipla(
                              questao.id,
                              alt.id?.toString() || altIndex.toString(),
                              checked
                            )}
                          />
                          <Label htmlFor={`q${questao.id}-a${altIndex}`} className="cursor-pointer flex-1 text-base">
                            <span className="font-bold mr-2">{String.fromCharCode(65 + altIndex)}:</span>
                            {alt.texto}
                          </Label>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Verdadeiro/Falso */}
                  {questao.tipo === 'verdadeiro_falso' && (
                    <RadioGroup
                      value={respostas[questao.id]}
                      onValueChange={(value) => handleResposta(questao.id, value)}
                    >
                      <div className="flex gap-4">
                        <div className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 flex-1">
                          <RadioGroupItem value="verdadeiro" id={`q${questao.id}-v`} />
                          <Label htmlFor={`q${questao.id}-v`} className="cursor-pointer text-base font-medium">
                            Verdadeiro
                          </Label>
                        </div>
                        <div className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 flex-1">
                          <RadioGroupItem value="falso" id={`q${questao.id}-f`} />
                          <Label htmlFor={`q${questao.id}-f`} className="cursor-pointer text-base font-medium">
                            Falso
                          </Label>
                        </div>
                      </div>
                    </RadioGroup>
                  )}

                  {/* Dissertativa */}
                  {questao.tipo === 'dissertativa' && (
                    <Textarea
                      value={respostas[questao.id] || ''}
                      onChange={(e) => handleResposta(questao.id, e.target.value)}
                      placeholder="Digite sua resposta..."
                      rows={6}
                      className="text-base"
                    />
                  )}

                  {/* Navegação entre questões */}
                  <div className="flex items-center justify-between pt-4 border-t">
                    <Button
                      variant="outline"
                      onClick={() => setQuestaoAtual(Math.max(0, questaoAtual - 1))}
                      disabled={questaoAtual === 0}
                    >
                      <ChevronLeft className="h-4 w-4 mr-2" />
                      Voltar
                    </Button>
                    <Button
                      onClick={() => setQuestaoAtual(Math.min(totalQuestoes - 1, questaoAtual + 1))}
                      disabled={questaoAtual === totalQuestoes - 1}
                    >
                      Próxima
                      <ChevronRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Botões de Ação */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={salvarProgresso}
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Salvar e Continuar Depois
                    </Button>
                    <Button
                      variant="outline"
                      onClick={cancelarProva}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Cancelar Prova
                    </Button>
                  </div>
                  <Button
                    onClick={() => enviarProva()}
                    disabled={enviando || questoesRespondidas === 0}
                    size="lg"
                    className="bg-green-500 hover:bg-green-600"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    {enviando ? 'Enviando...' : 'Finalizar Prova'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar - Resumo */}
          <div className="lg:col-span-1">
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle>Resumo da Prova</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Grid de Questões */}
                <div>
                  <p className="text-sm font-medium mb-3">Questões</p>
                  <div className="grid grid-cols-5 gap-2">
                    {prova?.questoes?.map((q, index) => {
                      const respondida = respostas[q.id] !== undefined && respostas[q.id] !== null && respostas[q.id] !== '';
                      const atual = index === questaoAtual;
                      return (
                        <button
                          key={q.id}
                          onClick={() => setQuestaoAtual(index)}
                          className={`h-10 w-10 rounded-lg flex items-center justify-center text-sm font-medium transition-colors ${
                            atual
                              ? 'bg-blue-500 text-white ring-2 ring-blue-300'
                              : respondida
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                          }`}
                        >
                          {index + 1}
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex items-center gap-4 mt-3 text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded bg-green-100 dark:bg-green-900"></div>
                      <span>Respondida</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded bg-gray-100 dark:bg-gray-800"></div>
                      <span>Não respondida</span>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Pontuação Atual */}
                <div>
                  <p className="text-sm font-medium mb-3">Pontuação Atual</p>
                  <div className="text-center">
                    <div className="relative w-24 h-24 mx-auto mb-2">
                      <svg className="transform -rotate-90 w-24 h-24">
                        <circle
                          cx="48"
                          cy="48"
                          r="40"
                          stroke="currentColor"
                          strokeWidth="8"
                          fill="none"
                          className="text-gray-200 dark:text-gray-700"
                        />
                        <circle
                          cx="48"
                          cy="48"
                          r="40"
                          stroke="currentColor"
                          strokeWidth="8"
                          fill="none"
                          strokeDasharray={`${percentualProgresso * 2.51} 251`}
                          className="text-green-500"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-2xl font-bold">{Math.round(percentualProgresso)}%</span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600">
                      {questoesRespondidas} de {totalQuestoes} respondidas
                    </p>
                  </div>
                </div>

                <Separator />

                {/* Informações */}
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tentativas Restantes:</span>
                    <span className="font-medium">
                      {prova?.numero_maximo_tentativas 
                        ? (prova.numero_maximo_tentativas - (tentativa?.numero_tentativa || 0))
                        : 'Ilimitado'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Nota mínima:</span>
                    <span className="font-medium">{prova?.nota_minima || 70}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Modal de Confirmação */}
      {mostrarConfirmacao && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle>Atenção</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4">
                Você ainda não respondeu todas as questões ({questoesRespondidas} de {totalQuestoes}). 
                Deseja finalizar mesmo assim?
              </p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setMostrarConfirmacao(false)} className="flex-1">
                  Cancelar
                </Button>
                <Button onClick={() => enviarProva()} className="flex-1">
                  Finalizar Mesmo Assim
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default ProvaPage;
