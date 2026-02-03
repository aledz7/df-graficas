<?php

namespace App\Http\Controllers\Api;

use App\Models\Compromisso;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Carbon\Carbon;

class CompromissoController extends ResourceController
{
    protected $model = Compromisso::class;
    
    protected $storeRules = [
        'title' => 'required|string|max:255',
        'start' => 'required|date',
        'end' => 'required|date|after:start',
        'all_day' => 'boolean',
        'cliente_id' => 'nullable|integer|exists:clientes,id',
        'funcionario_id' => 'nullable|integer|exists:users,id',
        'observacoes' => 'nullable|string',
        'status' => 'nullable|in:agendado,confirmado,cancelado,realizado',
        'cor' => 'nullable|string|max:7',
        'local' => 'nullable|string|max:255',
        'descricao' => 'nullable|string',
    ];

    protected $updateRules = [
        'title' => 'sometimes|string|max:255',
        'start' => 'sometimes|date',
        'end' => 'sometimes|date|after:start',
        'all_day' => 'boolean',
        'cliente_id' => 'nullable|exists:clientes,id',
        'funcionario_id' => 'nullable|exists:users,id',
        'observacoes' => 'nullable|string',
        'status' => 'nullable|in:agendado,confirmado,cancelado,realizado',
        'cor' => 'nullable|string|max:7',
        'local' => 'nullable|string|max:255',
        'descricao' => 'nullable|string',
    ];

    protected $with = ['cliente', 'funcionario', 'user'];

    /**
     * Lista compromissos com filtros opcionais
     */
    public function index(Request $request): \Illuminate\Http\JsonResponse
    {
        try {
            $query = $this->model::query();

            // Filtros
            if ($request->has('data_inicio') && $request->has('data_fim')) {
                $query->noPeriodo($request->data_inicio, $request->data_fim);
            }

            if ($request->has('funcionario_id')) {
                $query->doFuncionario($request->funcionario_id);
            }

            if ($request->has('cliente_id')) {
                $query->doCliente($request->cliente_id);
            }

            if ($request->has('status')) {
                $query->where('status', $request->status);
            }

            if ($request->has('hoje') && $request->hoje) {
                $query->hoje();
            }

            if ($request->has('futuros') && $request->futuros) {
                $query->futuros();
            }

            $compromissos = $query->with($this->with)
                ->orderBy('start')
                ->get();

            return $this->success($compromissos);
        } catch (\Exception $e) {
            return $this->error('Erro ao buscar compromissos: ' . $e->getMessage());
        }
    }

    /**
     * Cria um novo compromisso
     */
    public function store(Request $request): \Illuminate\Http\JsonResponse
    {
        // Validação customizada considerando tenant_id
        $rules = $this->storeRules;
        
        // Validação de cliente com tenant_id
        if ($request->has('cliente_id') && $request->cliente_id) {
            $rules['cliente_id'] = 'nullable|integer|exists:clientes,id,tenant_id,' . auth()->user()->tenant_id;
        }
        
        // Validação de funcionário com tenant_id
        if ($request->has('funcionario_id') && $request->funcionario_id) {
            $rules['funcionario_id'] = 'nullable|integer|exists:users,id,tenant_id,' . auth()->user()->tenant_id;
        }

        $validator = Validator::make($request->all(), $rules);

        if ($validator->fails()) {
            return $this->validationError($validator->errors());
        }

        try {
            $dados = $request->all();
            $dados['user_id'] = auth()->id();
            $dados['tenant_id'] = auth()->user()->tenant_id;

            $compromisso = $this->model::create($dados);
            $compromisso->load($this->with);

            return $this->success($compromisso, 'Compromisso criado com sucesso', 201);
        } catch (\Exception $e) {
            return $this->error('Erro ao criar compromisso: ' . $e->getMessage());
        }
    }

    /**
     * Atualiza um compromisso
     */
    public function update(Request $request, $id): \Illuminate\Http\JsonResponse
    {
        $compromisso = $this->model::find($id);

        if (!$compromisso) {
            return $this->notFound();
        }

        $validator = Validator::make($request->all(), $this->updateRules);

        if ($validator->fails()) {
            return $this->validationError($validator->errors());
        }

        try {
            $compromisso->update($request->all());
            $compromisso->load($this->with);

            return $this->success($compromisso, 'Compromisso atualizado com sucesso');
        } catch (\Exception $e) {
            return $this->error('Erro ao atualizar compromisso: ' . $e->getMessage());
        }
    }

    /**
     * Remove um compromisso
     */
    public function destroy($id): \Illuminate\Http\JsonResponse
    {
        try {
            $compromisso = $this->model::find($id);

            if (!$compromisso) {
                return $this->notFound();
            }

            $compromisso->delete();

            return $this->success(null, 'Compromisso removido com sucesso');
        } catch (\Exception $e) {
            return $this->error('Erro ao remover compromisso: ' . $e->getMessage());
        }
    }

    /**
     * Confirma um compromisso
     */
    public function confirmar($id)
    {
        try {
            $compromisso = $this->model::find($id);

            if (!$compromisso) {
                return $this->notFound();
            }

            $compromisso->update(['status' => 'confirmado']);
            $compromisso->load($this->with);

            return $this->success($compromisso, 'Compromisso confirmado com sucesso');
        } catch (\Exception $e) {
            return $this->error('Erro ao confirmar compromisso: ' . $e->getMessage());
        }
    }

    /**
     * Cancela um compromisso
     */
    public function cancelar($id)
    {
        try {
            $compromisso = $this->model::find($id);

            if (!$compromisso) {
                return $this->notFound();
            }

            $compromisso->update(['status' => 'cancelado']);
            $compromisso->load($this->with);

            return $this->success($compromisso, 'Compromisso cancelado com sucesso');
        } catch (\Exception $e) {
            return $this->error('Erro ao cancelar compromisso: ' . $e->getMessage());
        }
    }

    /**
     * Marca um compromisso como realizado
     */
    public function realizar($id)
    {
        try {
            $compromisso = $this->model::find($id);

            if (!$compromisso) {
                return $this->notFound();
            }

            $compromisso->update(['status' => 'realizado']);
            $compromisso->load($this->with);

            return $this->success($compromisso, 'Compromisso marcado como realizado');
        } catch (\Exception $e) {
            return $this->error('Erro ao marcar compromisso como realizado: ' . $e->getMessage());
        }
    }

    /**
     * Retorna estatísticas dos compromissos
     */
    public function estatisticas(Request $request)
    {
        try {
            $query = $this->model::query();

            if ($request->has('data_inicio') && $request->has('data_fim')) {
                $query->noPeriodo($request->data_inicio, $request->data_fim);
            }

            $total = $query->count();
            $confirmados = $query->where('status', 'confirmado')->count();
            $cancelados = $query->where('status', 'cancelado')->count();
            $realizados = $query->where('status', 'realizado')->count();
            $hoje = $this->model::hoje()->count();
            $futuros = $this->model::futuros()->count();

            $estatisticas = [
                'total' => $total,
                'confirmados' => $confirmados,
                'cancelados' => $cancelados,
                'realizados' => $realizados,
                'hoje' => $hoje,
                'futuros' => $futuros,
                'taxa_confirmacao' => $total > 0 ? round(($confirmados / $total) * 100, 2) : 0,
                'taxa_realizacao' => $total > 0 ? round(($realizados / $total) * 100, 2) : 0,
            ];

            return $this->success($estatisticas);
        } catch (\Exception $e) {
            return $this->error('Erro ao buscar estatísticas: ' . $e->getMessage());
        }
    }
} 