import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';
import { cursoService } from '@/services/api';
import { 
  GraduationCap, 
  ArrowLeft, 
  Save, 
  Send, 
  X, 
  Upload, 
  FileText, 
  Video, 
  Link as LinkIcon,
  Image as ImageIcon,
  Check,
  Calendar,
  Users,
  Bell,
  Settings,
  Eye,
  File,
  Play,
  Loader2
} from 'lucide-react';
import { motion } from 'framer-motion';

const SETORES = [
  { value: 'administrativo', label: 'Administrativo' },
  { value: 'financeiro', label: 'Financeiro' },
  { value: 'comercial', label: 'Comercial' },
  { value: 'criacao', label: 'Criação' },
  { value: 'producao', label: 'Produção' },
  { value: 'logistica', label: 'Logística' },
  { value: 'efc', label: 'EFC' },
];

const NIVELS = [
  { value: 'basico', label: 'Básico', icon: '📚' },
  { value: 'intermediario', label: 'Intermediário', icon: '⭐' },
  { value: 'avancado', label: 'Avançado', icon: '⭐' },
];

const NovoTreinamentoPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState({ capa: false, arquivo: false, video: false });
  const [cursosParaContinuacao, setCursosParaContinuacao] = useState([]);

  const [formData, setFormData] = useState({
    // 1. Informações Básicas
    titulo: '',
    descricao: '',
    capa_url: null,
    setor: 'comercial',
    nivel: 'basico',
    obrigatorio: false,
    
    // 2. Tipo de Conteúdo
    tipo_conteudo: 'texto',
    conteudo_texto: '',
    arquivo_url: null,
    arquivo_nome: null,
    video_url: null,
    video_arquivo_url: null,
    
    // 3. Continuação
    eh_continuacao: false,
    treinamento_anterior_id: null,
    parte_modulo: '',
    
    // 4. Regras de Liberação
    tipo_liberacao: 'agora',
    data_liberacao: '',
    data_inicio_periodo: '',
    data_fim_periodo: '',
    
    // 5. Público-alvo
    publico_alvo: 'todos',
    setores_publico: [],
    usuarios_publico: [],
    
    // 6. Notificação
    tipo_notificacao: 'nenhum',
    setores_notificacao: [],
    
    // 7. Configurações Extras
    exigir_confirmacao_leitura: false,
    exigir_conclusao_obrigatoria: false,
    prazo_conclusao: '',
    permitir_comentarios: false,
    permitir_download: false,
    ativar_certificado: false,
    possui_prova_final: false,
    dividir_em_modulos: false,
    permitir_anexos_adicionais: false,
  });

  useEffect(() => {
    carregarCursosParaContinuacao();
  }, []);

  const carregarCursosParaContinuacao = async () => {
    try {
      const response = await cursoService.listarParaContinuacao();
      if (response.data.success) {
        setCursosParaContinuacao(response.data.data || []);
      }
    } catch (error) {
      console.error('Erro ao carregar cursos:', error);
    }
  };

  const handleUploadCapa = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Erro',
        description: 'Por favor, selecione uma imagem válida',
        variant: 'destructive',
      });
      return;
    }

    setUploading({ ...uploading, capa: true });
    try {
      const response = await cursoService.uploadCapa(file);
      if (response.data.success) {
        setFormData({ ...formData, capa_url: response.data.url });
        toast({
          title: 'Sucesso',
          description: 'Capa enviada com sucesso!',
        });
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao fazer upload da capa',
        variant: 'destructive',
      });
    } finally {
      setUploading({ ...uploading, capa: false });
    }
  };

  const handleUploadArquivo = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading({ ...uploading, arquivo: true });
    try {
      const response = await cursoService.uploadArquivo(file);
      if (response.data.success) {
        setFormData({
          ...formData,
          arquivo_url: response.data.url,
          arquivo_nome: response.data.nome,
        });
        toast({
          title: 'Sucesso',
          description: 'Arquivo enviado com sucesso!',
        });
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: error.response?.data?.message || 'Erro ao fazer upload do arquivo',
        variant: 'destructive',
      });
    } finally {
      setUploading({ ...uploading, arquivo: false });
    }
  };

  const handleUploadVideo = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading({ ...uploading, video: true });
    try {
      const response = await cursoService.uploadVideo(file);
      if (response.data.success) {
        setFormData({
          ...formData,
          video_arquivo_url: response.data.url,
        });
        toast({
          title: 'Sucesso',
          description: 'Vídeo enviado com sucesso!',
        });
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: error.response?.data?.message || 'Erro ao fazer upload do vídeo',
        variant: 'destructive',
      });
    } finally {
      setUploading({ ...uploading, video: false });
    }
  };

  const toggleSetor = (setor) => {
    const setores = formData.setores_publico || [];
    if (setores.includes(setor)) {
      setFormData({ ...formData, setores_publico: setores.filter(s => s !== setor) });
    } else {
      setFormData({ ...formData, setores_publico: [...setores, setor] });
    }
  };

  const toggleSetorNotificacao = (setor) => {
    const setores = formData.setores_notificacao || [];
    if (setores.includes(setor)) {
      setFormData({ ...formData, setores_notificacao: setores.filter(s => s !== setor) });
    } else {
      setFormData({ ...formData, setores_notificacao: [...setores, setor] });
    }
  };

  const validarFormulario = () => {
    if (!formData.titulo.trim()) {
      toast({
        title: 'Erro',
        description: 'O título do treinamento é obrigatório',
        variant: 'destructive',
      });
      return false;
    }

    if (!formData.setor) {
      toast({
        title: 'Erro',
        description: 'Selecione uma área/setor',
        variant: 'destructive',
      });
      return false;
    }

    if (formData.tipo_liberacao === 'data_especifica' && !formData.data_liberacao) {
      toast({
        title: 'Erro',
        description: 'Selecione uma data de liberação',
        variant: 'destructive',
      });
      return false;
    }

    if (formData.tipo_liberacao === 'periodo') {
      if (!formData.data_inicio_periodo || !formData.data_fim_periodo) {
        toast({
          title: 'Erro',
          description: 'Selecione as datas de início e fim do período',
          variant: 'destructive',
        });
        return false;
      }
    }

    if (formData.tipo_notificacao === 'area_especifica' && (!formData.setores_notificacao || formData.setores_notificacao.length === 0)) {
      toast({
        title: 'Erro',
        description: 'Selecione pelo menos um setor para notificar',
        variant: 'destructive',
      });
      return false;
    }

    return true;
  };

  const handleSalvarRascunho = async () => {
    if (!validarFormulario()) return;

    setLoading(true);
    try {
      const data = {
        ...formData,
        status: 'rascunho',
      };
      await cursoService.create(data);
      toast({
        title: 'Sucesso',
        description: 'Rascunho salvo com sucesso!',
      });
      navigate('/ferramentas/treinamento-interno');
    } catch (error) {
      toast({
        title: 'Erro',
        description: error.response?.data?.message || 'Erro ao salvar rascunho',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePublicar = async () => {
    if (!validarFormulario()) return;

    // Validar se tem prova final mas não foi configurada
    if (formData.possui_prova_final) {
      toast({
        title: 'Atenção',
        description: 'Após salvar, configure a prova final na página de treinamentos.',
        variant: 'default',
      });
    }

    setLoading(true);
    try {
      const data = {
        ...formData,
        status: 'publicado',
      };
      const response = await cursoService.create(data);
      toast({
        title: 'Sucesso',
        description: 'Treinamento publicado com sucesso!',
      });
      
      // Se tem prova final, redirecionar para a página de treinamentos onde pode configurar
      if (formData.possui_prova_final && response.data.data?.id) {
        navigate(`/ferramentas/treinamento-interno?configurarProva=${response.data.data.id}`);
      } else {
        navigate('/ferramentas/treinamento-interno');
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: error.response?.data?.message || 'Erro ao publicar treinamento',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const formatarDataHora = (dataHora) => {
    if (!dataHora) return '';
    const date = new Date(dataHora);
    const dia = String(date.getDate()).padStart(2, '0');
    const mes = String(date.getMonth() + 1).padStart(2, '0');
    const ano = date.getFullYear();
    const hora = String(date.getHours()).padStart(2, '0');
    const minuto = String(date.getMinutes()).padStart(2, '0');
    return `${dia}/${mes}/${ano} ${hora}:${minuto}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <GraduationCap className="h-8 w-8 text-primary" />
              <h1 className="text-2xl font-bold">Cadastrar Novo Treinamento</h1>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-medium">Gráfica Imagine!</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Bell className="h-6 w-6 text-gray-600" />
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">3</span>
                </div>
                <span className="text-sm font-medium">Administrador</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Coluna Principal */}
          <div className="lg:col-span-2 space-y-6">
            {/* 1. Informações Básicas */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">1</span>
                  Informações Básicas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Título do Treinamento *</Label>
                  <Input
                    placeholder="Ex: Introdução ao Sistema Interno"
                    value={formData.titulo}
                    onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                  />
                </div>

                <div>
                  <Label>Área/Setor *</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {SETORES.map((setor) => (
                      <Button
                        key={setor.value}
                        type="button"
                        variant={formData.setor === setor.value ? 'default' : 'outline'}
                        className={formData.setor === setor.value ? 'bg-green-500 hover:bg-green-600' : ''}
                        onClick={() => setFormData({ ...formData, setor: setor.value })}
                      >
                        {formData.setor === setor.value && <Check className="h-4 w-4 mr-1" />}
                        {setor.label}
                        {formData.setor === setor.value && <X className="h-4 w-4 ml-1" />}
                      </Button>
                    ))}
                  </div>
                </div>

                <div>
                  <Label>Descrição Resumida</Label>
                  <Textarea
                    placeholder="Digite uma breve descrição..."
                    value={formData.descricao}
                    onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                    rows={3}
                  />
                </div>

                <div>
                  <Label>Capa do Treinamento</Label>
                  {formData.capa_url ? (
                    <div className="mt-2 relative">
                      <img
                        src={formData.capa_url}
                        alt="Capa"
                        className="w-full h-48 object-cover rounded-lg"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="absolute top-2 right-2"
                        onClick={() => setFormData({ ...formData, capa_url: null })}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="mt-2">
                      <label className="cursor-pointer">
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-primary transition-colors">
                          <ImageIcon className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                          <p className="text-sm text-gray-600">Clique para enviar ou arraste a imagem</p>
                          <p className="text-xs text-gray-400 mt-1">Tamanho: 1280x720</p>
                        </div>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleUploadCapa}
                          disabled={uploading.capa}
                        />
                      </label>
                    </div>
                  )}
                  {uploading.capa && (
                    <div className="mt-2 flex items-center gap-2 text-sm text-gray-600">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Enviando...
                    </div>
                  )}
                </div>

                <div>
                  <Label>Nível</Label>
                  <div className="flex gap-2 mt-2">
                    {NIVELS.map((nivel) => (
                      <Button
                        key={nivel.value}
                        type="button"
                        variant={formData.nivel === nivel.value ? 'default' : 'outline'}
                        className={formData.nivel === nivel.value ? 'bg-green-500 hover:bg-green-600' : ''}
                        onClick={() => setFormData({ ...formData, nivel: nivel.value })}
                      >
                        {nivel.icon} {nivel.label}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <Label>Treinamento Obrigatório</Label>
                  <Switch
                    checked={formData.obrigatorio}
                    onCheckedChange={(checked) => setFormData({ ...formData, obrigatorio: checked })}
                  />
                </div>
              </CardContent>
            </Card>

            {/* 2. Tipo de Conteúdo */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">2</span>
                  Tipo de Conteúdo
                </CardTitle>
                <CardDescription>Selecione pelo menos um tipo de conteúdo</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Button
                    type="button"
                    variant={formData.tipo_conteudo === 'texto' ? 'default' : 'outline'}
                    className={formData.tipo_conteudo === 'texto' ? 'bg-green-500 hover:bg-green-600' : ''}
                    onClick={() => setFormData({ ...formData, tipo_conteudo: 'texto' })}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Texto no Sistema
                  </Button>

                  <Button
                    type="button"
                    variant={formData.tipo_conteudo === 'arquivo' ? 'default' : 'outline'}
                    onClick={() => setFormData({ ...formData, tipo_conteudo: 'arquivo' })}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload de Arquivo
                  </Button>

                  <Button
                    type="button"
                    variant={formData.tipo_conteudo === 'video' || formData.tipo_conteudo === 'link_video' ? 'default' : 'outline'}
                    className={formData.tipo_conteudo === 'video' || formData.tipo_conteudo === 'link_video' ? 'bg-green-500 hover:bg-green-600 border-green-500' : ''}
                    onClick={() => setFormData({ ...formData, tipo_conteudo: 'video' })}
                  >
                    <Video className="h-4 w-4 mr-2" />
                    Upload de Vídeo
                  </Button>
                </div>

                {formData.tipo_conteudo === 'texto' && (
                  <div>
                    <Label>Conteúdo</Label>
                    <Textarea
                      placeholder="Digite o conteúdo do treinamento..."
                      value={formData.conteudo_texto}
                      onChange={(e) => setFormData({ ...formData, conteudo_texto: e.target.value })}
                      rows={10}
                    />
                  </div>
                )}

                {formData.tipo_conteudo === 'arquivo' && (
                  <div>
                    <Label>Upload de Arquivo (Word, PowerPoint, PDF)</Label>
                    {formData.arquivo_url ? (
                      <div className="mt-2 p-4 border rounded-lg flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <File className="h-5 w-5" />
                          <span>{formData.arquivo_nome}</span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setFormData({ ...formData, arquivo_url: null, arquivo_nome: null })}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="mt-2">
                        <label className="cursor-pointer">
                          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-primary transition-colors">
                            <Upload className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                            <p className="text-sm text-gray-600">Arraste o arquivo aqui ou Clique para enviar</p>
                            <p className="text-xs text-gray-400 mt-1">Word, PowerPoint, PDF</p>
                          </div>
                          <input
                            type="file"
                            accept=".doc,.docx,.ppt,.pptx,.pdf"
                            className="hidden"
                            onChange={handleUploadArquivo}
                            disabled={uploading.arquivo}
                          />
                        </label>
                      </div>
                    )}
                    {uploading.arquivo && (
                      <div className="mt-2 flex items-center gap-2 text-sm text-gray-600">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Enviando...
                      </div>
                    )}
                  </div>
                )}

                {(formData.tipo_conteudo === 'video' || formData.tipo_conteudo === 'link_video') && (
                  <div className="space-y-4">
                    <RadioGroup
                      value={formData.tipo_conteudo}
                      onValueChange={(value) => setFormData({ ...formData, tipo_conteudo: value })}
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="video" id="video-file" />
                        <Label htmlFor="video-file">Enviar Arquivo (MP4, até 500MB)</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="link_video" id="video-link" />
                        <Label htmlFor="video-link">Ou informar Link (YouTube, Vimeo)</Label>
                      </div>
                    </RadioGroup>

                    {formData.tipo_conteudo === 'video' && (
                      <div>
                        {formData.video_arquivo_url ? (
                          <div className="mt-2 p-4 border rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium">Vídeo enviado</span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setFormData({ ...formData, video_arquivo_url: null })}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                            <video 
                              src={formData.video_arquivo_url} 
                              controls 
                              className="w-full rounded-lg"
                              disablePictureInPicture
                              onLoadedMetadata={(e) => {
                                // Prevenir erro do MediaSession com enterpictureinpicture
                                try {
                                  if (navigator.mediaSession && e.target) {
                                    const validActions = ['play', 'pause', 'seekbackward', 'seekforward', 'previoustrack', 'nexttrack', 'skipad', 'stop', 'seekto'];
                                    validActions.forEach(action => {
                                      try {
                                        if (navigator.mediaSession.setActionHandler) {
                                          navigator.mediaSession.setActionHandler(action, null);
                                        }
                                      } catch (err) {
                                        // Ignorar erros
                                      }
                                    });
                                  }
                                } catch (err) {
                                  console.warn('Erro ao configurar MediaSession:', err);
                                }
                              }}
                            />
                          </div>
                        ) : (
                          <div className="mt-2">
                            <label className="cursor-pointer">
                              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-primary transition-colors">
                                <Video className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                                <p className="text-sm text-gray-600">Arraste o vídeo aqui ou Clique para enviar</p>
                                <p className="text-xs text-gray-400 mt-1">MP4, até 500MB</p>
                              </div>
                              <input
                                type="file"
                                accept="video/*"
                                className="hidden"
                                onChange={handleUploadVideo}
                                disabled={uploading.video}
                              />
                            </label>
                          </div>
                        )}
                        {uploading.video && (
                          <div className="mt-2 flex items-center gap-2 text-sm text-gray-600">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Enviando...
                          </div>
                        )}
                      </div>
                    )}

                    {formData.tipo_conteudo === 'link_video' && (
                      <div>
                        <Input
                          placeholder="https://youtube.com/..."
                          value={formData.video_url || ''}
                          onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
                        />
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 3. Continuação de Treinamento */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">3</span>
                  Continuação de Treinamento
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Este treinamento é continuação de outro?</Label>
                  <RadioGroup
                    value={formData.eh_continuacao ? 'sim' : 'nao'}
                    onValueChange={(value) => setFormData({ ...formData, eh_continuacao: value === 'sim' })}
                    className="mt-2"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="nao" id="continuacao-nao" />
                      <Label htmlFor="continuacao-nao">Não</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="sim" id="continuacao-sim" />
                      <Label htmlFor="continuacao-sim">Sim</Label>
                    </div>
                  </RadioGroup>
                </div>

                {formData.eh_continuacao && (
                  <>
                    <div>
                      <Label>Treinamento Anterior</Label>
                      <select
                        className="w-full mt-2 px-3 py-2 border rounded-md"
                        value={formData.treinamento_anterior_id || ''}
                        onChange={(e) => setFormData({ ...formData, treinamento_anterior_id: e.target.value ? parseInt(e.target.value) : null })}
                      >
                        <option value="">Selecione...</option>
                        {cursosParaContinuacao.map((curso) => (
                          <option key={curso.id} value={curso.id}>
                            {curso.titulo}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <Label>Parte / Módulo</Label>
                      <Input
                        placeholder="Ex: Parte 2 - Módulo 1"
                        value={formData.parte_modulo}
                        onChange={(e) => setFormData({ ...formData, parte_modulo: e.target.value })}
                      />
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* 4. Regras de Liberação */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">4</span>
                  Regras de Liberação
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Quando liberar? *</Label>
                  <RadioGroup
                    value={formData.tipo_liberacao}
                    onValueChange={(value) => setFormData({ ...formData, tipo_liberacao: value })}
                    className="mt-2"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="agora" id="liberacao-agora" />
                      <Label htmlFor="liberacao-agora">Liberar Agora</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="data_especifica" id="liberacao-data" />
                      <Label htmlFor="liberacao-data">Data Específica</Label>
                    </div>
                    {formData.tipo_liberacao === 'data_especifica' && (
                      <div className="ml-6 mt-2">
                        <Input
                          type="datetime-local"
                          value={formData.data_liberacao || ''}
                          onChange={(e) => setFormData({ ...formData, data_liberacao: e.target.value })}
                        />
                      </div>
                    )}
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="periodo" id="liberacao-periodo" />
                      <Label htmlFor="liberacao-periodo">Por Período</Label>
                    </div>
                    {formData.tipo_liberacao === 'periodo' && (
                      <div className="ml-6 mt-2 space-y-2">
                        <div>
                          <Label>Início:</Label>
                          <Input
                            type="datetime-local"
                            value={formData.data_inicio_periodo || ''}
                            onChange={(e) => setFormData({ ...formData, data_inicio_periodo: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label>Fim:</Label>
                          <Input
                            type="datetime-local"
                            value={formData.data_fim_periodo || ''}
                            onChange={(e) => setFormData({ ...formData, data_fim_periodo: e.target.value })}
                          />
                        </div>
                      </div>
                    )}
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="sempre_ativo" id="liberacao-sempre" />
                      <Label htmlFor="liberacao-sempre">Sempre Ativo</Label>
                    </div>
                  </RadioGroup>
                </div>
              </CardContent>
            </Card>

            {/* 5. Público-alvo */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">5</span>
                  Público-alvo
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Quem deve receber este treinamento? *</Label>
                  <RadioGroup
                    value={formData.publico_alvo}
                    onValueChange={(value) => setFormData({ ...formData, publico_alvo: value })}
                    className="mt-2"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="todos" id="publico-todos" />
                      <Label htmlFor="publico-todos">Todos os colaboradores</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="area_especifica" id="publico-area" />
                      <Label htmlFor="publico-area">Apenas uma área</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="usuarios_especificos" id="publico-usuarios" />
                      <Label htmlFor="publico-usuarios">Usuários específicos</Label>
                    </div>
                  </RadioGroup>
                </div>

                {formData.publico_alvo === 'area_especifica' && (
                  <div>
                    <Label>Selecione os Setores</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {SETORES.map((setor) => (
                        <div key={setor.value} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id={`setor-publico-${setor.value}`}
                            checked={(formData.setores_publico || []).includes(setor.value)}
                            onChange={() => toggleSetor(setor.value)}
                            className="h-4 w-4"
                          />
                          <Label htmlFor={`setor-publico-${setor.value}`} className="cursor-pointer">
                            {setor.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 6. Notificação */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">6</span>
                  Notificação ao Publicar
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Ao publicar, deseja notificar? *</Label>
                  <RadioGroup
                    value={formData.tipo_notificacao}
                    onValueChange={(value) => setFormData({ ...formData, tipo_notificacao: value })}
                    className="mt-2"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="todos" id="notif-todos" />
                      <Label htmlFor="notif-todos">Notificar todos</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="area_especifica" id="notif-area" />
                      <Label htmlFor="notif-area">Notificar área específica</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="nenhum" id="notif-nenhum" />
                      <Label htmlFor="notif-nenhum">Não notificar</Label>
                    </div>
                  </RadioGroup>
                </div>

                {formData.tipo_notificacao === 'area_especifica' && (
                  <div>
                    <Label>Selecione os Setores *</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {SETORES.map((setor) => (
                        <div key={setor.value} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id={`setor-notif-${setor.value}`}
                            checked={(formData.setores_notificacao || []).includes(setor.value)}
                            onChange={() => toggleSetorNotificacao(setor.value)}
                            className="h-4 w-4"
                          />
                          <Label htmlFor={`setor-notif-${setor.value}`} className="cursor-pointer">
                            {setor.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 7. Configurações Extras */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">7</span>
                  Configurações Extras
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Exigir Confirmação de Leitura</Label>
                  <div className="flex items-center gap-2">
                    <RadioGroup
                      value={formData.exigir_confirmacao_leitura ? 'sim' : 'nao'}
                      onValueChange={(value) => setFormData({ ...formData, exigir_confirmacao_leitura: value === 'sim' })}
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="nao" id="conf-leitura-nao" />
                        <Label htmlFor="conf-leitura-nao">Não</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="sim" id="conf-leitura-sim" />
                        <Label htmlFor="conf-leitura-sim">Sim</Label>
                      </div>
                    </RadioGroup>
                    <input
                      type="checkbox"
                      checked={formData.exigir_confirmacao_leitura}
                      onChange={(e) => setFormData({ ...formData, exigir_confirmacao_leitura: e.target.checked })}
                      className="h-4 w-4"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <Label>Exigir Conclusão Obrigatória</Label>
                  <div className="flex items-center gap-4">
                    <input
                      type="checkbox"
                      checked={formData.exigir_conclusao_obrigatoria}
                      onChange={(e) => setFormData({ ...formData, exigir_conclusao_obrigatoria: e.target.checked })}
                      className="h-4 w-4"
                    />
                    {formData.exigir_conclusao_obrigatoria && (
                      <Input
                        type="date"
                        value={formData.prazo_conclusao || ''}
                        onChange={(e) => setFormData({ ...formData, prazo_conclusao: e.target.value })}
                        className="w-40"
                      />
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <Label>Permitir Comentários</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.permitir_comentarios}
                      onChange={(e) => setFormData({ ...formData, permitir_comentarios: e.target.checked })}
                      className="h-4 w-4"
                    />
                    <Switch
                      checked={formData.permitir_comentarios}
                      onCheckedChange={(checked) => setFormData({ ...formData, permitir_comentarios: checked })}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <Label>Permitir Download do Material</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.permitir_download}
                      onChange={(e) => setFormData({ ...formData, permitir_download: e.target.checked })}
                      className="h-4 w-4"
                    />
                    <Switch
                      checked={formData.permitir_download}
                      onCheckedChange={(checked) => setFormData({ ...formData, permitir_download: checked })}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <Label>Ativar Certificado ao Final</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.ativar_certificado}
                      onChange={(e) => setFormData({ ...formData, ativar_certificado: e.target.checked })}
                      className="h-4 w-4"
                    />
                    <Switch
                      checked={formData.ativar_certificado}
                      onCheckedChange={(checked) => setFormData({ ...formData, ativar_certificado: checked })}
                    />
                  </div>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Este treinamento possui prova final</Label>
                    <p className="text-xs text-gray-500 mt-1">
                      Ao marcar, será necessário configurar a prova antes de publicar
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={formData.possui_prova_final}
                      onCheckedChange={(checked) => setFormData({ ...formData, possui_prova_final: checked })}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Coluna Lateral - Resumo */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Resumo da Publicação</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {formData.capa_url && (
                  <img
                    src={formData.capa_url}
                    alt="Capa"
                    className="w-full h-32 object-cover rounded-lg"
                  />
                )}
                <div className="space-y-2">
                  <div>
                    <span className="text-sm font-medium">Área:</span>
                    <Badge className="ml-2 bg-yellow-100 text-yellow-800">
                      {SETORES.find(s => s.value === formData.setor)?.label || 'Comercial'}
                    </Badge>
                  </div>
                  <div>
                    <span className="text-sm font-medium">Nível:</span>
                    <Badge className="ml-2 bg-blue-100 text-blue-800">
                      {NIVELS.find(n => n.value === formData.nivel)?.label || 'Básico'}
                    </Badge>
                  </div>
                  <div>
                    <span className="text-sm font-medium">Liberação:</span>
                    <p className="text-sm text-gray-600 mt-1">
                      {formData.tipo_liberacao === 'agora' && 'Imediata'}
                      {formData.tipo_liberacao === 'data_especifica' && formData.data_liberacao && formatarDataHora(formData.data_liberacao)}
                      {formData.tipo_liberacao === 'periodo' && formData.data_inicio_periodo && formData.data_fim_periodo && 
                        `${formatarDataHora(formData.data_inicio_periodo)} - ${formatarDataHora(formData.data_fim_periodo)}`}
                      {formData.tipo_liberacao === 'sempre_ativo' && 'Sempre Ativo'}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm font-medium">Notificação:</span>
                    <p className="text-sm text-gray-600 mt-1">
                      {formData.tipo_notificacao === 'todos' && 'Todos os colaboradores'}
                      {formData.tipo_notificacao === 'area_especifica' && 
                        `${(formData.setores_notificacao || []).length} Setor(es) Selecionado(s)`}
                      {formData.tipo_notificacao === 'nenhum' && 'Não notificar'}
                    </p>
                  </div>
                </div>
                <Button className="w-full bg-green-500 hover:bg-green-600">
                  <Eye className="h-4 w-4 mr-2" />
                  Visualizar
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Botões de Ação */}
        <div className="mt-6 flex justify-end gap-4">
          <Button
            variant="outline"
            onClick={() => navigate('/ferramentas/treinamento-interno')}
          >
            Cancelar
          </Button>
          <Button
            variant="outline"
            onClick={handleSalvarRascunho}
            disabled={loading}
          >
            <Save className="h-4 w-4 mr-2" />
            {loading ? 'Salvando...' : 'Salvar Rascunho'}
          </Button>
          <Button
            onClick={handlePublicar}
            disabled={loading}
            className="bg-green-500 hover:bg-green-600"
          >
            <GraduationCap className="h-4 w-4 mr-2" />
            {loading ? 'Publicando...' : 'Publicar Treinamento'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NovoTreinamentoPage;
