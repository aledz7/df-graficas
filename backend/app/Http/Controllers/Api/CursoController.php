<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Curso;
use App\Models\User;
use App\Models\Notificacao;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class CursoController extends Controller
{
    /**
     * Listar cursos
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $tenantId = $request->user()->tenant_id;
            $user = $request->user();

            $query = Curso::where('tenant_id', $tenantId);

            // Filtrar por status
            if ($request->has('status') && $request->status !== 'todos') {
                $query->where('status', $request->status);
            } elseif (!$user->is_admin) {
                $query->publicados();
            }

            // Filtrar por setor
            if ($request->has('setor') && $request->setor !== 'todos') {
                $query->porSetor($request->setor);
            }

            // Filtrar por nível
            if ($request->has('nivel') && $request->nivel !== 'todos') {
                $query->porNivel($request->nivel);
            }

            // Buscar por palavra-chave
            if ($request->has('busca') && $request->busca) {
                $query->where(function($q) use ($request) {
                    $q->where('titulo', 'like', "%{$request->busca}%")
                      ->orWhere('descricao', 'like', "%{$request->busca}%");
                });
            }

            // Ordenar
            $cursos = $query->orderBy('created_at', 'desc')
                ->with(['usuarioCriacao:id,name', 'usuarioEdicao:id,name', 'treinamentoAnterior:id,titulo'])
                ->get();

            return response()->json([
                'success' => true,
                'data' => $cursos
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro ao listar cursos',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Criar novo curso
     */
    public function store(Request $request): JsonResponse
    {
        try {
            $validator = Validator::make($request->all(), [
                'titulo' => 'required|string|max:255',
                'descricao' => 'nullable|string',
                'setor' => 'required|in:administrativo,financeiro,comercial,criacao,producao,logistica,efc',
                'nivel' => 'nullable|in:basico,intermediario,avancado',
                'obrigatorio' => 'boolean',
                'tipo_conteudo' => 'required|in:texto,arquivo,video,link_video',
                'conteudo_texto' => 'nullable|string',
                'eh_continuacao' => 'boolean',
                'treinamento_anterior_id' => 'nullable|exists:cursos,id',
                'parte_modulo' => 'nullable|string|max:255',
                'tipo_liberacao' => 'required|in:agora,data_especifica,periodo,sempre_ativo',
                'data_liberacao' => 'nullable|date',
                'data_inicio_periodo' => 'nullable|date',
                'data_fim_periodo' => 'nullable|date|after_or_equal:data_inicio_periodo',
                'publico_alvo' => 'required|in:todos,area_especifica,usuarios_especificos',
                'setores_publico' => 'nullable|array',
                'usuarios_publico' => 'nullable|array',
                'tipo_notificacao' => 'required|in:todos,area_especifica,nenhum',
                'setores_notificacao' => 'nullable|array',
                'exigir_confirmacao_leitura' => 'boolean',
                'exigir_conclusao_obrigatoria' => 'boolean',
                'prazo_conclusao' => 'nullable|date',
                'permitir_comentarios' => 'boolean',
                'permitir_download' => 'boolean',
                'ativar_certificado' => 'boolean',
                'dividir_em_modulos' => 'boolean',
                'permitir_anexos_adicionais' => 'boolean',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Erro de validação',
                    'errors' => $validator->errors()
                ], 422);
            }

            $data = $validator->validated();
            $data['tenant_id'] = $request->user()->tenant_id;
            $data['usuario_criacao_id'] = $request->user()->id;
            $data['status'] = $request->input('status', 'rascunho');

            // Validar regras de liberação
            if ($data['tipo_liberacao'] === 'data_especifica' && !$data['data_liberacao']) {
                return response()->json([
                    'success' => false,
                    'message' => 'Data de liberação é obrigatória quando o tipo é "data_especifica"',
                    'errors' => ['data_liberacao' => ['Campo obrigatório']]
                ], 422);
            }

            if ($data['tipo_liberacao'] === 'periodo') {
                if (!$data['data_inicio_periodo'] || !$data['data_fim_periodo']) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Data de início e fim são obrigatórias quando o tipo é "periodo"',
                        'errors' => ['data_inicio_periodo' => ['Campo obrigatório'], 'data_fim_periodo' => ['Campo obrigatório']]
                    ], 422);
                }
            }

            // Validar notificação
            if ($data['tipo_notificacao'] === 'area_especifica' && empty($data['setores_notificacao'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'Selecione pelo menos um setor para notificar',
                    'errors' => ['setores_notificacao' => ['Campo obrigatório']]
                ], 422);
            }

            $curso = Curso::create($data);

            // Se for publicado e tiver notificação, criar notificações
            if ($data['status'] === 'publicado' && $data['tipo_notificacao'] !== 'nenhum') {
                $this->criarNotificacoes($curso, $request->user()->tenant_id);
            }

            return response()->json([
                'success' => true,
                'message' => 'Curso criado com sucesso',
                'data' => $curso->load(['usuarioCriacao:id,name', 'usuarioEdicao:id,name'])
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro ao criar curso',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Exibir curso específico
     */
    public function show(Request $request, $id): JsonResponse
    {
        try {
            $tenantId = $request->user()->tenant_id;
            $curso = Curso::where('tenant_id', $tenantId)
                ->with(['usuarioCriacao:id,name', 'usuarioEdicao:id,name', 'treinamentoAnterior:id,titulo', 'continuacoes'])
                ->findOrFail($id);

            return response()->json([
                'success' => true,
                'data' => $curso
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Curso não encontrado',
                'error' => $e->getMessage()
            ], 404);
        }
    }

    /**
     * Atualizar curso
     */
    public function update(Request $request, $id): JsonResponse
    {
        try {
            $tenantId = $request->user()->tenant_id;
            $curso = Curso::where('tenant_id', $tenantId)->findOrFail($id);

            $validator = Validator::make($request->all(), [
                'titulo' => 'sometimes|string|max:255',
                'descricao' => 'nullable|string',
                'setor' => 'sometimes|in:administrativo,financeiro,comercial,criacao,producao,logistica,efc',
                'nivel' => 'nullable|in:basico,intermediario,avancado',
                'obrigatorio' => 'boolean',
                'tipo_conteudo' => 'sometimes|in:texto,arquivo,video,link_video',
                'conteudo_texto' => 'nullable|string',
                'eh_continuacao' => 'boolean',
                'treinamento_anterior_id' => 'nullable|exists:cursos,id',
                'parte_modulo' => 'nullable|string|max:255',
                'tipo_liberacao' => 'sometimes|in:agora,data_especifica,periodo,sempre_ativo',
                'data_liberacao' => 'nullable|date',
                'data_inicio_periodo' => 'nullable|date',
                'data_fim_periodo' => 'nullable|date|after_or_equal:data_inicio_periodo',
                'publico_alvo' => 'sometimes|in:todos,area_especifica,usuarios_especificos',
                'setores_publico' => 'nullable|array',
                'usuarios_publico' => 'nullable|array',
                'tipo_notificacao' => 'sometimes|in:todos,area_especifica,nenhum',
                'setores_notificacao' => 'nullable|array',
                'exigir_confirmacao_leitura' => 'boolean',
                'exigir_conclusao_obrigatoria' => 'boolean',
                'prazo_conclusao' => 'nullable|date',
                'permitir_comentarios' => 'boolean',
                'permitir_download' => 'boolean',
                'ativar_certificado' => 'boolean',
                'dividir_em_modulos' => 'boolean',
                'permitir_anexos_adicionais' => 'boolean',
                'status' => 'sometimes|in:rascunho,publicado,arquivado',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Erro de validação',
                    'errors' => $validator->errors()
                ], 422);
            }

            $data = $validator->validated();
            $data['usuario_edicao_id'] = $request->user()->id;

            $statusAnterior = $curso->status;
            $curso->update($data);

            // Se mudou de rascunho para publicado e tiver notificação, criar notificações
            if ($statusAnterior === 'rascunho' && $data['status'] === 'publicado' && $curso->tipo_notificacao !== 'nenhum' && !$curso->notificacao_enviada) {
                $this->criarNotificacoes($curso, $tenantId);
                $curso->update(['notificacao_enviada' => true, 'data_notificacao' => now()]);
            }

            return response()->json([
                'success' => true,
                'message' => 'Curso atualizado com sucesso',
                'data' => $curso->fresh()->load(['usuarioCriacao:id,name', 'usuarioEdicao:id,name'])
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro ao atualizar curso',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Excluir curso
     */
    public function destroy(Request $request, $id): JsonResponse
    {
        try {
            $tenantId = $request->user()->tenant_id;
            $curso = Curso::where('tenant_id', $tenantId)->findOrFail($id);
            $curso->delete();

            return response()->json([
                'success' => true,
                'message' => 'Curso excluído com sucesso'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro ao excluir curso',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Upload de capa
     */
    public function uploadCapa(Request $request): JsonResponse
    {
        try {
            $validator = Validator::make($request->all(), [
                'capa' => 'required|image|mimes:jpeg,png,jpg,gif,webp|max:5120', // 5MB
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Erro de validação',
                    'errors' => $validator->errors()
                ], 422);
            }

            $file = $request->file('capa');
            $tenantId = $request->user()->tenant_id;
            $filename = 'capa_curso_' . time() . '_' . Str::random(10) . '.' . $file->getClientOriginalExtension();
            $path = Storage::disk('public')->putFileAs(
                "tenants/{$tenantId}/cursos/capas",
                $file,
                $filename
            );

            return response()->json([
                'success' => true,
                'url' => url('/storage/' . $path),
                'path' => $path
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro ao fazer upload da capa',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Upload de arquivo (Word, PowerPoint, PDF)
     */
    public function uploadArquivo(Request $request): JsonResponse
    {
        try {
            $validator = Validator::make($request->all(), [
                'arquivo' => 'required|file|mimes:doc,docx,ppt,pptx,pdf|max:10240', // 10MB
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Erro de validação',
                    'errors' => $validator->errors()
                ], 422);
            }

            $file = $request->file('arquivo');
            $tenantId = $request->user()->tenant_id;
            $filename = 'arquivo_curso_' . time() . '_' . Str::random(10) . '.' . $file->getClientOriginalExtension();
            $path = Storage::disk('public')->putFileAs(
                "tenants/{$tenantId}/cursos/arquivos",
                $file,
                $filename
            );

            return response()->json([
                'success' => true,
                'url' => url('/storage/' . $path),
                'path' => $path,
                'nome' => $file->getClientOriginalName(),
                'tamanho' => $file->getSize()
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro ao fazer upload do arquivo',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Upload de vídeo
     */
    public function uploadVideo(Request $request): JsonResponse
    {
        try {
            $validator = Validator::make($request->all(), [
                'video' => 'required|file|mimes:mp4,avi,mov,wmv|max:512000', // 500MB
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Erro de validação',
                    'errors' => $validator->errors()
                ], 422);
            }

            $file = $request->file('video');
            $tenantId = $request->user()->tenant_id;
            $filename = 'video_curso_' . time() . '_' . Str::random(10) . '.' . $file->getClientOriginalExtension();
            $path = Storage::disk('public')->putFileAs(
                "tenants/{$tenantId}/cursos/videos",
                $file,
                $filename
            );

            return response()->json([
                'success' => true,
                'url' => url('/storage/' . $path),
                'path' => $path,
                'nome' => $file->getClientOriginalName(),
                'tamanho' => $file->getSize()
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro ao fazer upload do vídeo',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Listar cursos disponíveis para continuação
     */
    public function listarParaContinuacao(Request $request): JsonResponse
    {
        try {
            $tenantId = $request->user()->tenant_id;
            $cursos = Curso::where('tenant_id', $tenantId)
                ->where('status', 'publicado')
                ->select('id', 'titulo', 'setor', 'nivel')
                ->orderBy('titulo')
                ->get();

            return response()->json([
                'success' => true,
                'data' => $cursos
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro ao listar cursos',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Criar notificações para os usuários
     */
    private function criarNotificacoes(Curso $curso, $tenantId)
    {
        $usuarios = [];

        if ($curso->tipo_notificacao === 'todos') {
            $usuarios = User::where('tenant_id', $tenantId)->get();
        } elseif ($curso->tipo_notificacao === 'area_especifica' && $curso->setores_notificacao) {
            // Buscar usuários dos setores selecionados
            // Assumindo que o setor do usuário está em um campo 'setor' ou 'cargo'
            // Ajustar conforme a estrutura real do banco
            $usuarios = User::where('tenant_id', $tenantId)
                ->where(function($query) use ($curso) {
                    foreach ($curso->setores_notificacao as $setor) {
                        $query->orWhere('cargo', 'like', "%{$setor}%")
                              ->orWhere('setor', $setor);
                    }
                })
                ->get();
        }

        foreach ($usuarios as $usuario) {
            Notificacao::create([
                'tenant_id' => $tenantId,
                'user_id' => $usuario->id,
                'tipo' => 'treinamento',
                'titulo' => 'Novo Treinamento Disponível',
                'mensagem' => "Um novo treinamento foi publicado: {$curso->titulo}",
                'dados_adicionais' => [
                    'curso_id' => $curso->id,
                    'curso_titulo' => $curso->titulo,
                    'setor' => $curso->setor,
                    'nivel' => $curso->nivel,
                ],
                'prioridade' => $curso->obrigatorio ? 'alta' : 'normal',
                'lida' => false,
                'data_criacao' => now(),
            ]);
        }
    }
}
