<?php

namespace App\Http\Controllers\Api;

use App\Models\PermissionProfile;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Validation\ValidationException;

class PermissionProfileController extends BaseController
{
    /**
     * Lista todos os perfis de permissões do tenant
     */
    public function index(Request $request)
    {
        try {
            $tenantId = auth()->user()->tenant_id;
            
            $profiles = PermissionProfile::where('tenant_id', $tenantId)
                ->orderBy('nome', 'asc')
                ->get();
            
            return $this->success($profiles, 'Perfis de permissões carregados com sucesso');
        } catch (\Exception $e) {
            \Log::error('Erro ao buscar perfis de permissões: ' . $e->getMessage());
            return $this->error('Erro ao buscar perfis de permissões: ' . $e->getMessage());
        }
    }

    /**
     * Cria um novo perfil de permissões
     */
    public function store(Request $request)
    {
        try {
            $validated = $request->validate([
                'nome' => 'required|string|max:100',
                'descricao' => 'nullable|string|max:255',
                'permissions' => 'required|array',
            ]);
            
            $tenantId = auth()->user()->tenant_id;
            
            // Verificar se já existe um perfil com o mesmo nome
            $exists = PermissionProfile::where('tenant_id', $tenantId)
                ->where('nome', $validated['nome'])
                ->exists();
                
            if ($exists) {
                return $this->error('Já existe um perfil com este nome.', Response::HTTP_UNPROCESSABLE_ENTITY);
            }
            
            $profile = PermissionProfile::create([
                'tenant_id' => $tenantId,
                'nome' => $validated['nome'],
                'descricao' => $validated['descricao'] ?? null,
                'permissions' => $validated['permissions'],
            ]);
            
            return $this->success($profile, 'Perfil de permissão criado com sucesso', Response::HTTP_CREATED);
        } catch (ValidationException $e) {
            return $this->validationError($e->errors(), 'Erro de validação');
        } catch (\Exception $e) {
            \Log::error('Erro ao criar perfil de permissão: ' . $e->getMessage());
            return $this->error('Erro ao criar perfil de permissão: ' . $e->getMessage());
        }
    }

    /**
     * Exibe um perfil de permissões específico
     */
    public function show($id)
    {
        try {
            $tenantId = auth()->user()->tenant_id;
            
            $profile = PermissionProfile::where('tenant_id', $tenantId)
                ->where('id', $id)
                ->first();
                
            if (!$profile) {
                return $this->notFound('Perfil de permissão não encontrado');
            }
            
            return $this->success($profile);
        } catch (\Exception $e) {
            \Log::error('Erro ao buscar perfil de permissão: ' . $e->getMessage());
            return $this->error('Erro ao buscar perfil de permissão: ' . $e->getMessage());
        }
    }

    /**
     * Atualiza um perfil de permissões
     */
    public function update(Request $request, $id)
    {
        try {
            $tenantId = auth()->user()->tenant_id;
            
            $profile = PermissionProfile::where('tenant_id', $tenantId)
                ->where('id', $id)
                ->first();
                
            if (!$profile) {
                return $this->notFound('Perfil de permissão não encontrado');
            }
            
            $validated = $request->validate([
                'nome' => 'required|string|max:100',
                'descricao' => 'nullable|string|max:255',
                'permissions' => 'required|array',
            ]);
            
            // Verificar se já existe outro perfil com o mesmo nome
            $exists = PermissionProfile::where('tenant_id', $tenantId)
                ->where('nome', $validated['nome'])
                ->where('id', '!=', $id)
                ->exists();
                
            if ($exists) {
                return $this->error('Já existe outro perfil com este nome.', Response::HTTP_UNPROCESSABLE_ENTITY);
            }
            
            $profile->update([
                'nome' => $validated['nome'],
                'descricao' => $validated['descricao'] ?? null,
                'permissions' => $validated['permissions'],
            ]);
            
            return $this->success($profile, 'Perfil de permissão atualizado com sucesso');
        } catch (ValidationException $e) {
            return $this->validationError($e->errors(), 'Erro de validação');
        } catch (\Exception $e) {
            \Log::error('Erro ao atualizar perfil de permissão: ' . $e->getMessage());
            return $this->error('Erro ao atualizar perfil de permissão: ' . $e->getMessage());
        }
    }

    /**
     * Remove um perfil de permissões
     */
    public function destroy($id)
    {
        try {
            $tenantId = auth()->user()->tenant_id;
            
            $profile = PermissionProfile::where('tenant_id', $tenantId)
                ->where('id', $id)
                ->first();
                
            if (!$profile) {
                return $this->notFound('Perfil de permissão não encontrado');
            }
            
            $profile->delete();
            
            return $this->success(null, 'Perfil de permissão excluído com sucesso');
        } catch (\Exception $e) {
            \Log::error('Erro ao excluir perfil de permissão: ' . $e->getMessage());
            return $this->error('Erro ao excluir perfil de permissão: ' . $e->getMessage());
        }
    }
}
