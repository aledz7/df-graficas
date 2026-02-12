<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Treinamento;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;

class TreinamentoController extends Controller
{
    /**
     * Listar perguntas de treinamento
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $tenantId = $request->user()->tenant_id;
            $user = $request->user();

            $query = Treinamento::where('tenant_id', $tenantId);

            // Filtrar por setor (se não for admin, mostrar apenas do setor do usuário + gerais)
            $setorFiltro = $request->input('setor');
            if ($setorFiltro && $setorFiltro !== 'todos') {
                $query->porSetor($setorFiltro);
            } elseif (!$user->is_admin) {
                // Se não for admin, mostrar apenas do setor do usuário + gerais
                // Assumindo que o setor do usuário está em um campo (ajustar conforme necessário)
                $setorUsuario = $user->cargo ?? 'geral';
                $query->porSetor($setorUsuario);
            }

            // Filtrar por nível
            if ($request->has('nivel') && $request->nivel !== 'todos') {
                $query->porNivel($request->nivel);
            }

            // Buscar por palavra-chave
            if ($request->has('busca') && $request->busca) {
                $query->buscar($request->busca);
            }

            // Filtrar apenas ativos (se não for admin)
            if (!$user->is_admin) {
                $query->ativos();
            } elseif ($request->has('ativo')) {
                $query->where('ativo', $request->boolean('ativo'));
            }

            // Ordenar por ordem e depois por ID
            $treinamentos = $query->orderBy('ordem', 'asc')
                ->orderBy('id', 'asc')
                ->with(['usuarioCriacao:id,name', 'usuarioEdicao:id,name'])
                ->get();

            return response()->json([
                'success' => true,
                'data' => $treinamentos
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro ao listar treinamentos',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Criar nova pergunta
     */
    public function store(Request $request): JsonResponse
    {
        try {
            $validator = Validator::make($request->all(), [
                'pergunta' => 'required|string|max:500',
                'resposta' => 'required|string',
                'setor' => 'required|in:atendimento,vendas,producao,design,financeiro,geral',
                'nivel' => 'required|in:iniciante,intermediario,avancado',
                'ordem' => 'nullable|integer|min:0',
                'ativo' => 'boolean',
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
            $data['ordem'] = $data['ordem'] ?? 0;

            $treinamento = Treinamento::create($data);

            return response()->json([
                'success' => true,
                'message' => 'Pergunta criada com sucesso',
                'data' => $treinamento->load(['usuarioCriacao:id,name', 'usuarioEdicao:id,name'])
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro ao criar pergunta',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Atualizar pergunta
     */
    public function update(Request $request, $id): JsonResponse
    {
        try {
            $tenantId = $request->user()->tenant_id;
            $treinamento = Treinamento::where('tenant_id', $tenantId)->findOrFail($id);

            $validator = Validator::make($request->all(), [
                'pergunta' => 'sometimes|string|max:500',
                'resposta' => 'sometimes|string',
                'setor' => 'sometimes|in:atendimento,vendas,producao,design,financeiro,geral',
                'nivel' => 'sometimes|in:iniciante,intermediario,avancado',
                'ordem' => 'nullable|integer|min:0',
                'ativo' => 'boolean',
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

            $treinamento->update($data);

            return response()->json([
                'success' => true,
                'message' => 'Pergunta atualizada com sucesso',
                'data' => $treinamento->fresh()->load(['usuarioCriacao:id,name', 'usuarioEdicao:id,name'])
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro ao atualizar pergunta',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Excluir pergunta
     */
    public function destroy($id): JsonResponse
    {
        try {
            $tenantId = request()->user()->tenant_id;
            $treinamento = Treinamento::where('tenant_id', $tenantId)->findOrFail($id);
            $treinamento->delete();

            return response()->json([
                'success' => true,
                'message' => 'Pergunta excluída com sucesso'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro ao excluir pergunta',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obter estatísticas de treinamento
     */
    public function estatisticas(Request $request): JsonResponse
    {
        try {
            $tenantId = $request->user()->tenant_id;

            $total = Treinamento::where('tenant_id', $tenantId)->count();
            $ativos = Treinamento::where('tenant_id', $tenantId)->where('ativo', true)->count();
            
            $porSetor = Treinamento::where('tenant_id', $tenantId)
                ->where('ativo', true)
                ->selectRaw('setor, COUNT(*) as total')
                ->groupBy('setor')
                ->get()
                ->pluck('total', 'setor');

            $porNivel = Treinamento::where('tenant_id', $tenantId)
                ->where('ativo', true)
                ->selectRaw('nivel, COUNT(*) as total')
                ->groupBy('nivel')
                ->get()
                ->pluck('total', 'nivel');

            return response()->json([
                'success' => true,
                'data' => [
                    'total' => $total,
                    'ativos' => $ativos,
                    'inativos' => $total - $ativos,
                    'por_setor' => $porSetor,
                    'por_nivel' => $porNivel,
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro ao obter estatísticas',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
