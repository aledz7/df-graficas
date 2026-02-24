import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { cursoService } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import {
  GraduationCap,
  Search,
  AlertCircle,
  Clock,
  CheckCircle2,
  Play,
  BookOpen,
  FileText,
  Video,
  Download,
  ArrowRight,
  TrendingUp,
  Calendar,
  Award
} from 'lucide-react';
import { format, isAfter, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const FILTROS = [
  { value: 'todos', label: 'Todos', icon: BookOpen, count: 0 },
  { value: 'obrigatorios', label: 'Obrigatórios', icon: AlertCircle, count: 0, color: 'text-red-500' },
  { value: 'pendentes', label: 'Pendentes', icon: Clock, count: 0, color: 'text-orange-500' },
  { value: 'em_andamento', label: 'Em Andamento', icon: TrendingUp, count: 0, color: 'text-green-500' },
  { value: 'concluidos', label: 'Concluídos', icon: CheckCircle2, count: 0, color: 'text-blue-500' },
];

const MeusTreinamentosPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [treinamentos, setTreinamentos] = useState([]);
  const [estatisticas, setEstatisticas] = useState(null);
  const [filtroAtivo, setFiltroAtivo] = useState('todos');
  const [busca, setBusca] = useState('');
  const [ordenacao, setOrdenacao] = useState('recentes');
  const [areaFiltro, setAreaFiltro] = useState('todas');

  useEffect(() => {
    carregarTreinamentos();
  }, [filtroAtivo]);

  const carregarTreinamentos = async () => {
    setLoading(true);
    try {
      const response = await cursoService.meusTreinamentos(filtroAtivo);
      if (response.data.success) {
        setTreinamentos(response.data.data || []);
        setEstatisticas(response.data.estatisticas);
      }
    } catch (error) {
      console.error('Erro ao carregar treinamentos:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os treinamentos',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleIniciarTreinamento = async (cursoId) => {
    try {
      await cursoService.iniciarTreinamento(cursoId);
      navigate(`/ferramentas/treinamento/${cursoId}`);
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao iniciar treinamento',
        variant: 'destructive',
      });
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
    return setores[setor] || setor.toUpperCase();
  };

  const getSetorCor = (setor) => {
    const cores = {
      administrativo: 'bg-gray-100 text-gray-800',
      financeiro: 'bg-blue-100 text-blue-800',
      comercial: 'bg-yellow-100 text-yellow-800',
      criacao: 'bg-purple-100 text-purple-800',
      producao: 'bg-green-100 text-green-800',
      logistica: 'bg-orange-100 text-orange-800',
      efc: 'bg-pink-100 text-pink-800',
    };
    return cores[setor] || 'bg-gray-100 text-gray-800';
  };

  const getNivelNome = (nivel) => {
    const niveis = {
      basico: 'Básico',
      intermediario: 'Intermediário',
      avancado: 'Avançado',
    };
    return niveis[nivel] || nivel;
  };

  const getStatusInfo = (curso) => {
    const progresso = curso.progresso || {};
    
    if (progresso.concluido) {
      return {
        label: 'Treinamento Concluído',
        cor: 'bg-blue-500',
        texto: 'text-blue-700',
        botao: { texto: 'Ver / Revisar', cor: 'bg-green-500 hover:bg-green-600' },
      };
    } else if (progresso.iniciado && progresso.percentual > 0) {
      return {
        label: `Em Andamento - ${progresso.percentual}%`,
        cor: 'bg-green-500',
        texto: 'text-green-700',
        botao: { texto: 'Continuar Treinamento', cor: 'bg-blue-500 hover:bg-blue-600' },
      };
    } else {
      const isAtrasado = curso.obrigatorio && curso.prazo_conclusao && 
        isAfter(new Date(), new Date(curso.prazo_conclusao));
      
      return {
        label: isAtrasado ? 'Atrasado' : 'Pendente',
        cor: isAtrasado ? 'bg-red-500' : 'bg-orange-500',
        texto: isAtrasado ? 'text-red-700' : 'text-orange-700',
        botao: { 
          texto: 'Iniciar Treinamento', 
          cor: curso.obrigatorio ? 'bg-red-500 hover:bg-red-600' : 'bg-yellow-500 hover:bg-yellow-600' 
        },
      };
    }
  };

  const treinamentosFiltrados = treinamentos.filter(t => {
    if (busca && !t.titulo.toLowerCase().includes(busca.toLowerCase())) {
      return false;
    }
    if (areaFiltro !== 'todas' && t.setor !== areaFiltro) {
      return false;
    }
    return true;
  });

  const treinamentosOrdenados = [...treinamentosFiltrados].sort((a, b) => {
    if (ordenacao === 'recentes') {
      return new Date(b.created_at) - new Date(a.created_at);
    } else if (ordenacao === 'antigos') {
      return new Date(a.created_at) - new Date(b.created_at);
    } else if (ordenacao === 'nome') {
      return a.titulo.localeCompare(b.titulo);
    }
    return 0;
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <GraduationCap className="h-8 w-8 text-primary" />
              <h1 className="text-2xl font-bold">Meus Treinamentos</h1>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-medium">Gráfica Imagine!</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar - Filtros */}
          <div className="lg:col-span-1">
            <Card>
              <CardContent className="p-4">
                <h2 className="font-semibold mb-4 flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Treinamentos Internos
                </h2>

                <div className="mb-4">
                  <Input
                    placeholder="Buscar treinamento..."
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    className="w-full"
                  />
                </div>

                <div className="space-y-2">
                  {FILTROS.map((filtro) => {
                    const Icon = filtro.icon;
                    const count = estatisticas?.[filtro.value === 'todos' ? 'total' : 
                      filtro.value === 'obrigatorios' ? 'obrigatorios' :
                      filtro.value === 'pendentes' ? 'pendentes' :
                      filtro.value === 'em_andamento' ? 'em_andamento' : 'concluidos'] || 0;
                    
                    return (
                      <button
                        key={filtro.value}
                        onClick={() => setFiltroAtivo(filtro.value)}
                        className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors ${
                          filtroAtivo === filtro.value
                            ? 'bg-primary text-primary-foreground'
                            : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Icon className={`h-5 w-5 ${filtro.color || ''}`} />
                          <span>{filtro.label}</span>
                        </div>
                        <span className="text-sm font-medium">{count}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-6 pt-6 border-t">
                  <h3 className="text-sm font-semibold mb-3">Legenda</h3>
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-red-500"></div>
                      <span>Obrigatório</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                      <span>Pendente</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                      <span>Em Andamento</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                      <span>Concluído</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Conteúdo Principal */}
          <div className="lg:col-span-3">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">
                {filtroAtivo === 'todos' ? 'Todos' : 
                 filtroAtivo === 'obrigatorios' ? 'Obrigatórios' :
                 filtroAtivo === 'pendentes' ? 'Pendentes' :
                 filtroAtivo === 'em_andamento' ? 'Em Andamento' : 'Concluídos'} treinamentos internos ({treinamentosOrdenados.length})
              </h2>
              <div className="flex gap-2">
                <Select value={ordenacao} onValueChange={setOrdenacao}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recentes">Mais Recentes</SelectItem>
                    <SelectItem value="antigos">Mais Antigos</SelectItem>
                    <SelectItem value="nome">Nome A-Z</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={areaFiltro} onValueChange={setAreaFiltro}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas Áreas</SelectItem>
                    {['administrativo', 'financeiro', 'comercial', 'criacao', 'producao', 'logistica', 'efc'].map(setor => (
                      <SelectItem key={setor} value={setor}>{getSetorNome(setor)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              </div>
            ) : treinamentosOrdenados.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <BookOpen className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-600">Nenhum treinamento encontrado</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {treinamentosOrdenados.map((curso) => {
                  const statusInfo = getStatusInfo(curso);
                  const progresso = curso.progresso || {};
                  const isNovo = new Date(curso.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

                  return (
                    <Card key={curso.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                      <div className="relative">
                        {curso.capa_url ? (
                          <img
                            src={curso.capa_url}
                            alt={curso.titulo}
                            className="w-full h-48 object-cover"
                          />
                        ) : (
                          <div className="w-full h-48 bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
                            <GraduationCap className="h-16 w-16 text-white opacity-50" />
                          </div>
                        )}
                        <div className="absolute top-2 left-2 flex gap-2 flex-wrap">
                          {curso.obrigatorio && (
                            <Badge className="bg-red-500 text-white">OBRIGATÓRIO</Badge>
                          )}
                          {isNovo && (
                            <Badge className="bg-orange-500 text-white">+ NOVO</Badge>
                          )}
                          {curso.eh_continuacao && (
                            <Badge className="bg-blue-500 text-white">CONTINUAÇÃO</Badge>
                          )}
                          {curso.estaDisponivel && !curso.obrigatorio && (
                            <Badge className="bg-green-500 text-white">DISPONÍVEL</Badge>
                          )}
                        </div>
                        <div className="absolute top-2 right-2">
                          <Badge className={getSetorCor(curso.setor)}>
                            {getSetorNome(curso.setor)}
                          </Badge>
                        </div>
                      </div>

                      <CardContent className="p-4">
                        <h3 className="font-semibold text-lg mb-2 line-clamp-2">{curso.titulo}</h3>
                        
                        <div className="flex items-center gap-2 mb-3">
                          <Badge variant="outline">{getNivelNome(curso.nivel)}</Badge>
                          {curso.parte_modulo && (
                            <Badge variant="outline">Parte {curso.parte_modulo}</Badge>
                          )}
                        </div>

                        <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium mb-3 ${statusInfo.cor} ${statusInfo.texto}`}>
                          {statusInfo.label}
                        </div>

                        {progresso.iniciado && progresso.percentual > 0 && !progresso.concluido && (
                          <div className="mb-3">
                            <div className="flex items-center justify-between text-sm mb-1">
                              <span className="text-gray-600">Progresso</span>
                              <span className="font-medium">{progresso.percentual}%</span>
                            </div>
                            <Progress value={progresso.percentual} className="h-2" />
                          </div>
                        )}

                        {curso.obrigatorio && curso.prazo_conclusao && (
                          <div className="mb-3 text-sm">
                            <div className="flex items-center gap-1 text-gray-600">
                              <Calendar className="h-4 w-4" />
                              <span>Concluir até {format(new Date(curso.prazo_conclusao), 'dd/MM/yyyy', { locale: ptBR })}</span>
                            </div>
                            {isAfter(new Date(), new Date(curso.prazo_conclusao)) && (
                              <div className="text-red-600 font-medium mt-1">
                                ⚠️ Atrasado!
                              </div>
                            )}
                          </div>
                        )}

                        <Button
                          className={`w-full ${statusInfo.botao.cor} text-white`}
                          onClick={() => handleIniciarTreinamento(curso.id)}
                        >
                          {progresso.concluido ? (
                            <>
                              <Eye className="h-4 w-4 mr-2" />
                              {statusInfo.botao.texto}
                            </>
                          ) : progresso.iniciado ? (
                            <>
                              <Play className="h-4 w-4 mr-2" />
                              {statusInfo.botao.texto}
                            </>
                          ) : (
                            <>
                              <Play className="h-4 w-4 mr-2" />
                              {statusInfo.botao.texto}
                            </>
                          )}
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MeusTreinamentosPage;
