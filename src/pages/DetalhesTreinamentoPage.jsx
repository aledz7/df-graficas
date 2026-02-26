import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/components/ui/use-toast';
import { cursoService } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import ConfiguracaoProvaModal from '@/components/treinamento/ConfiguracaoProvaModal';
import {
  ArrowLeft,
  Play,
  FileText,
  Video,
  Download,
  CheckCircle2,
  Clock,
  Calendar,
  AlertCircle,
  GraduationCap,
  Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const DetalhesTreinamentoPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [curso, setCurso] = useState(null);
  const [progresso, setProgresso] = useState(null);
  const [confirmacaoLeitura, setConfirmacaoLeitura] = useState(false);
  const [tempoInicio, setTempoInicio] = useState(null);
  const [provaAprovada, setProvaAprovada] = useState(false);
  const [modalProvaAberto, setModalProvaAberto] = useState(false);

  useEffect(() => {
    carregarCurso();
    iniciarTempo();
  }, [id]);

  useEffect(() => {
    // Atualizar progresso a cada 30 segundos
    if (tempoInicio && progresso && !progresso.concluido) {
      const interval = setInterval(() => {
        atualizarProgressoAutomatico();
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [tempoInicio, progresso]);

  const iniciarTempo = () => {
    setTempoInicio(Date.now());
  };

  const calcularTempoDecorrido = () => {
    if (!tempoInicio) return 0;
    return Math.floor((Date.now() - tempoInicio) / 1000);
  };

  const carregarCurso = async () => {
    setLoading(true);
    try {
      const response = await cursoService.getById(id);
      if (response.data.success) {
        setCurso(response.data.data);
        // Buscar progresso
        const progressoResponse = await cursoService.meusTreinamentos('todos');
        if (progressoResponse.data.success) {
          const cursoComProgresso = progressoResponse.data.data.find(c => c.id === parseInt(id));
          if (cursoComProgresso) {
            setProgresso(cursoComProgresso.progresso);
            setConfirmacaoLeitura(cursoComProgresso.progresso?.confirmacao_leitura || false);
            
            // Verificar se há prova e se foi aprovado
            if (cursoComProgresso.possui_prova_final && cursoComProgresso.progresso?.concluido) {
              // Se está concluído e tem prova, provavelmente foi aprovado
              setProvaAprovada(true);
            }
          }
        }
      }
    } catch (error) {
      console.error('Erro ao carregar curso:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar o treinamento',
        variant: 'destructive',
      });
      navigate('/ferramentas/meus-treinamentos');
    } finally {
      setLoading(false);
    }
  };

  const iniciarTreinamento = async () => {
    try {
      await cursoService.iniciarTreinamento(id);
      setProgresso({ ...progresso, iniciado: true, percentual: 0 });
      toast({
        title: 'Sucesso',
        description: 'Treinamento iniciado!',
      });
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao iniciar treinamento',
        variant: 'destructive',
      });
    }
  };

  const atualizarProgressoAutomatico = async () => {
    if (!progresso || progresso.concluido) return;
    
    try {
      const tempoDecorrido = calcularTempoDecorrido();
      const novoPercentual = Math.min(progresso.percentual + 5, 95); // Incrementa até 95%
      
      await cursoService.atualizarProgresso(id, {
        percentual: novoPercentual,
        tempo_segundos: tempoDecorrido,
      });
      
      setProgresso({ ...progresso, percentual: novoPercentual });
    } catch (error) {
      console.error('Erro ao atualizar progresso:', error);
    }
  };

  const marcarConfirmacaoLeitura = async () => {
    try {
      await cursoService.atualizarProgresso(id, {
        confirmacao_leitura: true,
      });
      setConfirmacaoLeitura(true);
      toast({
        title: 'Sucesso',
        description: 'Confirmação de leitura registrada!',
      });
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao confirmar leitura',
        variant: 'destructive',
      });
    }
  };

  const concluirTreinamento = async () => {
    try {
      const tempoDecorrido = calcularTempoDecorrido();
      await cursoService.concluirTreinamento(id, {
        tempo_total: tempoDecorrido,
        confirmacao_leitura: curso.exigir_confirmacao_leitura ? confirmacaoLeitura : true,
      });
      
      toast({
        title: 'Parabéns!',
        description: 'Treinamento concluído com sucesso!',
      });
      
      setTimeout(() => {
        navigate('/ferramentas/meus-treinamentos');
      }, 2000);
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao concluir treinamento',
        variant: 'destructive',
      });
    }
  };

  const getSetorNome = (setor) => {
    const setores = {
      administrativo: 'Administrativo',
      financeiro: 'Financeiro',
      comercial: 'Comercial',
      criacao: 'Criação',
      producao: 'Produção',
      logistica: 'Logística',
      efc: 'EFC',
    };
    return setores[setor] || setor;
  };

  const getNivelNome = (nivel) => {
    const niveis = {
      basico: 'Básico',
      intermediario: 'Intermediário',
      avancado: 'Avançado',
    };
    return niveis[nivel] || nivel;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!curso) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-600">Treinamento não encontrado</p>
            <Button onClick={() => navigate('/ferramentas/meus-treinamentos')} className="mt-4">
              Voltar
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const podeConcluir = curso.exigir_confirmacao_leitura 
    ? confirmacaoLeitura 
    : true;

  const conteudoConcluido = progresso?.percentual_concluido >= 100;
  const temProvaFinal = curso?.possui_prova_final;
  const podeIniciarProva = conteudoConcluido && temProvaFinal && !progresso?.concluido;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-6 max-w-5xl">
        <Button
          variant="ghost"
          onClick={() => navigate('/ferramentas/meus-treinamentos')}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>

        {/* Header do Curso */}
        <Card className="mb-6">
          <div className="relative">
            {curso.capa_url ? (
              <img
                src={curso.capa_url}
                alt={curso.titulo}
                className="w-full h-64 object-cover rounded-t-lg"
              />
            ) : (
              <div className="w-full h-64 bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center rounded-t-lg">
                <GraduationCap className="h-24 w-24 text-white opacity-50" />
              </div>
            )}
            <div className="absolute top-4 left-4 flex gap-2 flex-wrap">
              {curso.obrigatorio && (
                <Badge className="bg-red-500 text-white">OBRIGATÓRIO</Badge>
              )}
              {curso.eh_continuacao && (
                <Badge className="bg-blue-500 text-white">CONTINUAÇÃO</Badge>
              )}
            </div>
          </div>

          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold mb-2">{curso.titulo}</h1>
                <div className="flex items-center gap-2 mb-2">
                  <Badge>{getSetorNome(curso.setor)}</Badge>
                  <Badge variant="outline">{getNivelNome(curso.nivel)}</Badge>
                  {curso.parte_modulo && (
                    <Badge variant="outline">Parte {curso.parte_modulo}</Badge>
                  )}
                  {curso.possui_prova_final && (
                    <Badge className="bg-purple-500 text-white">PROVA FINAL</Badge>
                  )}
                </div>
                {curso.descricao && (
                  <p className="text-gray-600 mt-2">{curso.descricao}</p>
                )}
              </div>
              {user?.is_admin && (
                <Button
                  variant="outline"
                  onClick={() => setModalProvaAberto(true)}
                  className="flex items-center gap-2"
                >
                  <GraduationCap className="h-4 w-4" />
                  {curso.possui_prova_final ? 'Configurar Prova' : 'Adicionar Prova'}
                </Button>
              )}
            </div>

            {progresso && progresso.iniciado && (
              <div className="mb-4">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-gray-600">Progresso</span>
                  <span className="font-medium">{progresso.percentual || 0}%</span>
                </div>
                <Progress value={progresso.percentual || 0} className="h-3" />
              </div>
            )}

            {curso.obrigatorio && curso.prazo_conclusao && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-yellow-600" />
                  <div>
                    <p className="font-medium text-yellow-900">Prazo de Conclusão</p>
                    <p className="text-sm text-yellow-700">
                      Concluir até {format(new Date(curso.prazo_conclusao), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Conteúdo do Curso */}
        <div className="space-y-6">
          {/* Vídeo */}
          {(curso.tipo_conteudo === 'video' || curso.tipo_conteudo === 'link_video') && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Video className="h-5 w-5" />
                  Vídeo do Treinamento
                </CardTitle>
              </CardHeader>
              <CardContent>
                {curso.tipo_conteudo === 'video' && curso.video_arquivo_url ? (
                  <video
                    src={curso.video_arquivo_url}
                    controls
                    className="w-full rounded-lg"
                    disablePictureInPicture
                    onPlay={() => {
                      if (!progresso?.iniciado) {
                        iniciarTreinamento();
                      }
                    }}
                    onLoadedMetadata={(e) => {
                      // Prevenir erro do MediaSession com enterpictureinpicture
                      try {
                        if (navigator.mediaSession && e.target) {
                          // Remover qualquer handler inválido que possa ter sido adicionado
                          const validActions = ['play', 'pause', 'seekbackward', 'seekforward', 'previoustrack', 'nexttrack', 'skipad', 'stop', 'seekto'];
                          validActions.forEach(action => {
                            try {
                              if (navigator.mediaSession.setActionHandler) {
                                navigator.mediaSession.setActionHandler(action, null);
                              }
                            } catch (err) {
                              // Ignorar erros ao limpar handlers
                            }
                          });
                        }
                      } catch (err) {
                        // Ignorar erros do MediaSession
                        console.warn('Erro ao configurar MediaSession:', err);
                      }
                    }}
                  />
                ) : curso.video_url ? (
                  <div className="aspect-video">
                    <iframe
                      src={curso.video_url}
                      className="w-full h-full rounded-lg"
                      allowFullScreen
                      onLoad={() => {
                        if (!progresso?.iniciado) {
                          iniciarTreinamento();
                        }
                      }}
                    />
                  </div>
                ) : (
                  <p className="text-gray-600">Vídeo não disponível</p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Arquivo */}
          {curso.tipo_conteudo === 'arquivo' && curso.arquivo_url && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Material do Treinamento
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <FileText className="h-8 w-8 text-blue-500" />
                    <div>
                      <p className="font-medium">{curso.arquivo_nome || 'Arquivo'}</p>
                      <p className="text-sm text-gray-600">Material de apoio</p>
                    </div>
                  </div>
                  {curso.permitir_download && (
                    <Button
                      variant="outline"
                      onClick={() => window.open(curso.arquivo_url, '_blank')}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Baixar
                    </Button>
                  )}
                </div>
                {!curso.permitir_download && (
                  <iframe
                    src={curso.arquivo_url}
                    className="w-full h-screen mt-4 rounded-lg"
                    style={{ minHeight: '600px' }}
                  />
                )}
              </CardContent>
            </Card>
          )}

          {/* Texto */}
          {curso.tipo_conteudo === 'texto' && curso.conteudo_texto && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Conteúdo do Treinamento
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div 
                  className="prose max-w-none"
                  dangerouslySetInnerHTML={{ __html: curso.conteudo_texto.replace(/\n/g, '<br />') }}
                />
              </CardContent>
            </Card>
          )}

          {/* Confirmação de Leitura */}
          {curso.exigir_confirmacao_leitura && (
            <Card>
              <CardHeader>
                <CardTitle>Confirmação de Leitura</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="confirmacao"
                    checked={confirmacaoLeitura}
                    onCheckedChange={(checked) => {
                      setConfirmacaoLeitura(checked);
                      if (checked) {
                        marcarConfirmacaoLeitura();
                      }
                    }}
                  />
                  <label
                    htmlFor="confirmacao"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    Confirmo que li e compreendi todo o conteúdo deste treinamento
                  </label>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Botão de Conclusão ou Iniciar Prova */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  {podeIniciarProva ? (
                    <>
                      <p className="font-medium mb-1">Prova Final</p>
                      <p className="text-sm text-gray-600">
                        Você concluiu todo o conteúdo. Agora é necessário fazer a prova final para concluir o treinamento.
                      </p>
                    </>
                  ) : progresso?.concluido ? (
                    <>
                      <p className="font-medium mb-1">Treinamento Concluído</p>
                      {temProvaFinal && (
                        <p className="text-sm text-green-600">
                          Você foi aprovado na prova final!
                        </p>
                      )}
                    </>
                  ) : (
                    <>
                      <p className="font-medium mb-1">Finalizar Treinamento</p>
                      {!podeConcluir && (
                        <p className="text-sm text-red-600">
                          É necessário confirmar a leitura para concluir
                        </p>
                      )}
                      {!conteudoConcluido && temProvaFinal && (
                        <p className="text-sm text-yellow-600">
                          Complete todo o conteúdo para fazer a prova final
                        </p>
                      )}
                    </>
                  )}
                </div>
                {podeIniciarProva ? (
                  <Button
                    onClick={() => navigate(`/ferramentas/treinamento/${id}/prova`)}
                    className="bg-blue-500 hover:bg-blue-600"
                    size="lg"
                  >
                    <GraduationCap className="h-5 w-5 mr-2" />
                    Iniciar Prova
                  </Button>
                ) : (
                  <Button
                    onClick={concluirTreinamento}
                    disabled={!podeConcluir || (progresso?.concluido) || (temProvaFinal && !provaAprovada)}
                    className="bg-green-500 hover:bg-green-600"
                    size="lg"
                  >
                    {progresso?.concluido ? (
                      <>
                        <CheckCircle2 className="h-5 w-5 mr-2" />
                        Concluído
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-5 w-5 mr-2" />
                        Concluir Treinamento
                      </>
                    )}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modal de Configuração da Prova (apenas admin) */}
      {user?.is_admin && (
        <ConfiguracaoProvaModal
          cursoId={id}
          open={modalProvaAberto}
          onClose={() => setModalProvaAberto(false)}
          onSave={() => {
            setModalProvaAberto(false);
            carregarCurso();
          }}
        />
      )}
    </div>
  );
};

export default DetalhesTreinamentoPage;
