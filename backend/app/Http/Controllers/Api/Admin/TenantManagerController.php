<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Api\BaseController;
use App\Models\Tenant;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class TenantManagerController extends BaseController
{
    /**
     * Listar todos os tenants (clientes do sistema) com filtros e paginação.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Tenant::query()
            ->withCount(['users', 'produtos', 'clientes', 'vendas', 'orcamentos']);

        if ($request->has('ativo') && $request->ativo !== '' && $request->ativo !== null) {
            $query->where('ativo', filter_var($request->ativo, FILTER_VALIDATE_BOOLEAN));
        }

        if ($request->filled('plano')) {
            $query->where('plano', $request->plano);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('nome', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('razao_social', 'like', "%{$search}%");
            });
        }

        $sortBy = $request->get('sort_by', 'nome');
        $sortDir = $request->get('sort_dir', 'asc');
        if (in_array($sortBy, ['nome', 'email', 'plano', 'ativo', 'created_at'])) {
            $query->orderBy($sortBy, $sortDir === 'desc' ? 'desc' : 'asc');
        }

        $perPage = min((int) $request->get('per_page', 15), 100);
        $tenants = $query->paginate($perPage);

        return $this->success($tenants, 'Lista de tenants obtida com sucesso.');
    }

    /**
     * Exibir um tenant com todas as informações e contagens.
     */
    public function show(int $id): JsonResponse
    {
        $tenant = Tenant::withCount(['users', 'produtos', 'clientes', 'vendas', 'orcamentos'])
            ->find($id);

        if (!$tenant) {
            return $this->notFound('Tenant não encontrado.');
        }

        $tenant->makeVisible(['created_at', 'updated_at']);

        return $this->success($tenant, 'Tenant obtido com sucesso.');
    }

    /**
     * Atualizar um tenant.
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $tenant = Tenant::find($id);

        if (!$tenant) {
            return $this->notFound('Tenant não encontrado.');
        }

        $validated = $request->validate([
            'nome' => 'sometimes|string|max:255',
            'razao_social' => 'nullable|string|max:255',
            'cnpj' => 'nullable|string|max:20|unique:tenants,cnpj,' . $id,
            'inscricao_estadual' => 'nullable|string|max:20',
            'email' => 'sometimes|email|unique:tenants,email,' . $id,
            'telefone' => 'nullable|string|max:20',
            'celular' => 'nullable|string|max:20',
            'cep' => 'nullable|string|max:10',
            'logradouro' => 'nullable|string',
            'numero' => 'nullable|string|max:20',
            'complemento' => 'nullable|string',
            'bairro' => 'nullable|string',
            'cidade' => 'nullable|string',
            'uf' => 'nullable|string|max:2',
            'tema' => 'nullable|string|max:50',
            'logo_url' => 'nullable|string',
            'ativo' => 'sometimes|boolean',
            'data_ativacao' => 'nullable|date',
            'data_expiracao' => 'nullable|date',
            'plano' => 'nullable|string|max:50',
            'limite_usuarios' => 'nullable|integer|min:0',
            'limite_armazenamento_mb' => 'nullable|integer|min:0',
            'dominio' => 'nullable|string|max:255',
        ]);

        $tenant->update($validated);
        $tenant->makeVisible(['created_at', 'updated_at']);

        return $this->success($tenant, 'Tenant atualizado com sucesso.');
    }

    /**
     * Alternar status ativo do tenant (bloquear/desbloquear).
     */
    public function toggleAtivo(int $id): JsonResponse
    {
        $tenant = Tenant::find($id);

        if (!$tenant) {
            return $this->notFound('Tenant não encontrado.');
        }

        $tenant->ativo = !$tenant->ativo;
        $tenant->save();
        $tenant->makeVisible(['created_at', 'updated_at']);

        return $this->success(
            $tenant,
            $tenant->ativo ? 'Tenant ativado com sucesso.' : 'Tenant bloqueado com sucesso.'
        );
    }
}
