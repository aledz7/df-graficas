<?php

namespace App\Http\Controllers\Api;

use App\Models\User;
use Illuminate\Http\Request;

class UserController extends BaseController
{
    /**
     * Lista todos os usuários ativos do tenant
     */
    public function index(Request $request)
    {
        try {
            $query = User::where('tenant_id', auth()->user()->tenant_id);

            // Filtro para usuários ativos (se o campo existir)
            if ($request->has('ativo') && $request->ativo) {
                $query->where(function($q) {
                    $q->where('ativo', true)
                      ->orWhereNull('ativo')
                      ->orWhere('ativo', 1);
                });
            }

            // Filtro para vendedores (usuários que podem receber comissão)
            if ($request->has('permite_comissao') && $request->permite_comissao) {
                $query->where(function($q) {
                    $q->where('permite_receber_comissao', true)
                      ->orWhere('cargo', 'Vendedor')
                      ->orWhere('cargo', 'vendedor')
                      ->orWhere('is_admin', true);
                });
            }

            // Filtro por cargo
            if ($request->has('cargo')) {
                $query->where('cargo', $request->cargo);
            }

            // Filtro por nome
            if ($request->has('search')) {
                $query->where('name', 'like', '%' . $request->search . '%');
            }

            $users = $query->select(
                'id', 
                'name', 
                'email', 
                'is_admin',
                'cargo',
                'permite_receber_comissao',
                'comissao_servicos',
                'comissao_dropshipping',
                'telefone',
                'celular',
                'whatsapp',
                'ativo'
            )
            ->orderBy('name')
            ->get();

            \Log::info('Usuários encontrados', [
                'total' => $users->count(),
                'tenant_id' => auth()->user()->tenant_id,
                'permite_comissao' => $request->has('permite_comissao') ? $request->permite_comissao : 'não informado',
                'ativo' => $request->has('ativo') ? $request->ativo : 'não informado',
                'usuarios' => $users->pluck('name', 'id')->toArray()
            ]);

            return $this->success($users);
        } catch (\Exception $e) {
            return $this->error('Erro ao buscar usuários: ' . $e->getMessage());
        }
    }
} 