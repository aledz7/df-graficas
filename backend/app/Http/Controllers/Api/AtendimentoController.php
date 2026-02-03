<?php

namespace App\Http\Controllers\Api;

use App\Models\Atendimento;
use App\Models\Cliente;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Http\JsonResponse;

class AtendimentoController extends ResourceController
{
    protected $model = Atendimento::class;
    
    protected $storeRules = [
        'cliente_id' => 'required|exists:clientes,id',
        'canal' => 'required|in:WhatsApp,Presencial,Telefone,Outro',
        'observacao' => 'required|string|min:1',
    ];

    protected $updateRules = [
        'canal' => 'sometimes|in:WhatsApp,Presencial,Telefone,Outro',
        'observacao' => 'sometimes|string|min:1',
    ];

    /**
     * Armazenar um atendimento recém-criado
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), $this->storeRules);

        if ($validator->fails()) {
            return $this->validationError($validator->errors());
        }

        try {
            // Verificar se o cliente pertence ao tenant do usuário logado
            $cliente = Cliente::where('id', $request->cliente_id)
                ->where('tenant_id', auth()->user()->tenant_id)
                ->first();

            if (!$cliente) {
                return $this->error('Cliente não encontrado ou não pertence ao seu tenant.', 404);
            }

            $atendimento = Atendimento::create([
                'tenant_id' => auth()->user()->tenant_id,
                'cliente_id' => $request->cliente_id,
                'user_id' => auth()->id(),
                'canal' => $request->canal,
                'observacao' => $request->observacao,
                'metadados' => $request->metadados ?? null,
            ]);

            // Carregar relacionamentos para a resposta
            $atendimento->load(['user', 'cliente']);

            return $this->success($atendimento, 'Atendimento registrado com sucesso!', 201);
        } catch (\Exception $e) {
            return $this->error('Erro ao registrar atendimento: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Atualizar um atendimento existente
     *
     * @param Request $request
     * @param int $id
     * @return JsonResponse
     */
    public function update(Request $request, $id): JsonResponse
    {
        $validator = Validator::make($request->all(), $this->updateRules);

        if ($validator->fails()) {
            return $this->validationError($validator->errors());
        }

        try {
            $atendimento = Atendimento::where('id', $id)
                ->where('tenant_id', auth()->user()->tenant_id)
                ->first();

            if (!$atendimento) {
                return $this->error('Atendimento não encontrado.', 404);
            }

            // Verificar se o usuário pode editar este atendimento (próprio atendimento ou admin)
            if ($atendimento->user_id !== auth()->id() && !auth()->user()->is_admin) {
                return $this->error('Você não tem permissão para editar este atendimento.', 403);
            }

            $atendimento->update($request->only(['canal', 'observacao', 'metadados']));

            // Carregar relacionamentos para a resposta
            $atendimento->load(['user', 'cliente']);

            return $this->success($atendimento, 'Atendimento atualizado com sucesso!');
        } catch (\Exception $e) {
            return $this->error('Erro ao atualizar atendimento: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Remover um atendimento
     *
     * @param int $id
     * @return JsonResponse
     */
    public function destroy($id): JsonResponse
    {
        try {
            $atendimento = Atendimento::where('id', $id)
                ->where('tenant_id', auth()->user()->tenant_id)
                ->first();

            if (!$atendimento) {
                return $this->error('Atendimento não encontrado.', 404);
            }

            // Verificar se o usuário pode excluir este atendimento (próprio atendimento ou admin)
            if ($atendimento->user_id !== auth()->id() && !auth()->user()->is_admin) {
                return $this->error('Você não tem permissão para excluir este atendimento.', 403);
            }

            $atendimento->delete();

            return $this->success(null, 'Atendimento removido com sucesso!');
        } catch (\Exception $e) {
            return $this->error('Erro ao remover atendimento: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Obter atendimentos de um cliente específico
     *
     * @param Request $request
     * @param int $clienteId
     * @return JsonResponse
     */
    public function porCliente(Request $request, $clienteId): JsonResponse
    {
        try {
            // Verificar se o cliente pertence ao tenant do usuário logado
            $cliente = Cliente::where('id', $clienteId)
                ->where('tenant_id', auth()->user()->tenant_id)
                ->first();

            if (!$cliente) {
                return $this->error('Cliente não encontrado ou não pertence ao seu tenant.', 404);
            }

            $atendimentos = Atendimento::where('cliente_id', $clienteId)
                ->where('tenant_id', auth()->user()->tenant_id)
                ->with(['user:id,name,email', 'cliente:id,nome_completo,apelido_fantasia'])
                ->orderBy('created_at', 'desc')
                ->get();

            return $this->success($atendimentos, 'Atendimentos do cliente recuperados com sucesso!');
        } catch (\Exception $e) {
            return $this->error('Erro ao buscar atendimentos: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Aplicar filtros na consulta
     *
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @param Request $request
     * @return \Illuminate\Database\Eloquent\Builder
     */
    protected function applyFilters($query, Request $request)
    {
        // Filtro por cliente
        if ($request->has('cliente_id')) {
            $query->where('cliente_id', $request->cliente_id);
        }

        // Filtro por canal
        if ($request->has('canal')) {
            $query->where('canal', $request->canal);
        }

        // Filtro por usuário responsável
        if ($request->has('user_id')) {
            $query->where('user_id', $request->user_id);
        }

        // Filtro por data (período)
        if ($request->has('data_inicio')) {
            $query->whereDate('created_at', '>=', $request->data_inicio);
        }

        if ($request->has('data_fim')) {
            $query->whereDate('created_at', '<=', $request->data_fim);
        }

        // Busca por texto na observação
        if ($request->has('busca')) {
            $query->where('observacao', 'like', '%' . $request->busca . '%');
        }

        return $query;
    }

    /**
     * Sobrescrever o método index para incluir relacionamentos
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $query = $this->model::where('tenant_id', auth()->user()->tenant_id)
                ->with(['user:id,name,email', 'cliente:id,nome_completo,apelido_fantasia']);

            $query = $this->applyFilters($query, $request);

            // Ordenação padrão por data de criação (mais recentes primeiro)
            $query->orderBy('created_at', 'desc');

            $atendimentos = $query->paginate($request->get('per_page', 15));

            return $this->success($atendimentos, 'Atendimentos recuperados com sucesso!');
        } catch (\Exception $e) {
            return $this->error('Erro ao buscar atendimentos: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Sobrescrever o método show para incluir relacionamentos
     *
     * @param int $id
     * @return JsonResponse
     */
    public function show($id): JsonResponse
    {
        try {
            $atendimento = $this->model::where('id', $id)
                ->where('tenant_id', auth()->user()->tenant_id)
                ->with(['user:id,name,email', 'cliente:id,nome_completo,apelido_fantasia'])
                ->first();

            if (!$atendimento) {
                return $this->error('Atendimento não encontrado.', 404);
            }

            return $this->success($atendimento, 'Atendimento recuperado com sucesso!');
        } catch (\Exception $e) {
            return $this->error('Erro ao buscar atendimento: ' . $e->getMessage(), 500);
        }
    }
} 