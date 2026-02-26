<?php

namespace App\Services;

use App\Models\QuickAction;
use App\Models\QuickActionPermission;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class QuickActionService
{
    /**
     * Obter ações rápidas disponíveis para um usuário
     */
    public function getActionsDisponiveis(int $tenantId, int $userId = null): array
    {
        $user = $userId ? User::find($userId) : null;
        $userAreas = $user ? $this->getUserAreas($user) : [];

        $actions = QuickAction::where('tenant_id', $tenantId)
            ->where('ativo', true)
            ->orderBy('ordem')
            ->get();

        $actionsDisponiveis = [];

        foreach ($actions as $action) {
            $podeVer = true;
            
            if ($userId) {
                $podeVer = QuickActionPermission::podeVerAction($tenantId, $userId, $action->codigo, $userAreas);
            }

            // Verificar também permissão do sistema se houver
            if ($podeVer && $action->permissao_codigo && $user) {
                // Se for owner (tem config_sistema), tem todas as permissões
                $isOwner = $user->is_owner; // Usa o getter getIsOwnerAttribute
                
                if ($isOwner) {
                    $podeVer = true;
                } else {
                    // Verificar permissões do usuário diretamente
                    $userPermissions = [];
                    
                    // Primeiro tenta permissões diretamente no user
                    if ($user->permissions && is_array($user->permissions)) {
                        $userPermissions = $user->permissions;
                    } else {
                        // Fallback: verificar via funcionário associado
                        $funcionario = $user->funcionario;
                        if ($funcionario && $funcionario->permissions) {
                            $userPermissions = is_array($funcionario->permissions) 
                                ? $funcionario->permissions 
                                : json_decode($funcionario->permissions, true) ?? [];
                        }
                    }
                    
                    // Verificar se tem a permissão específica
                    if (!isset($userPermissions[$action->permissao_codigo]) || !$userPermissions[$action->permissao_codigo]) {
                        $podeVer = false;
                    }
                }
            }

            if ($podeVer) {
                $actionsDisponiveis[] = [
                    'id' => $action->id,
                    'codigo' => $action->codigo,
                    'nome' => $action->nome,
                    'descricao' => $action->descricao,
                    'categoria' => $action->categoria,
                    'icone' => $action->icone,
                    'cor_padrao' => $action->cor_padrao,
                    'rota' => $action->rota,
                    'estado' => $action->estado,
                ];
            }
        }

        return $actionsDisponiveis;
    }

    /**
     * Obter todas as ações rápidas (para configuração)
     */
    public function getAllActions(int $tenantId = null): array
    {
        $query = QuickAction::orderBy('ordem');
        if ($tenantId) {
            $query->where('tenant_id', $tenantId);
        }
        $actions = $query->get();

        return $actions->map(function ($action) {
            return [
                'id' => $action->id,
                'codigo' => $action->codigo,
                'nome' => $action->nome,
                'descricao' => $action->descricao,
                'categoria' => $action->categoria,
                'icone' => $action->icone,
                'cor_padrao' => $action->cor_padrao,
                'rota' => $action->rota,
                'estado' => $action->estado,
                'ativo' => $action->ativo,
                'ordem' => $action->ordem,
                'permissao_codigo' => $action->permissao_codigo,
            ];
        })->toArray();
    }

    /**
     * Criar nova ação rápida
     */
    public function criarAction(array $dados): QuickAction
    {
        return QuickAction::create($dados);
    }

    /**
     * Atualizar ação rápida
     */
    public function atualizarAction(int $id, array $dados): bool
    {
        $action = QuickAction::find($id);
        if (!$action) {
            return false;
        }

        return $action->update($dados);
    }

    /**
     * Deletar ação rápida
     */
    public function deletarAction(int $id): bool
    {
        $action = QuickAction::find($id);
        if (!$action) {
            return false;
        }

        return $action->delete();
    }

    /**
     * Obter áreas do usuário
     */
    private function getUserAreas(User $user): array
    {
        $areas = [];
        
        if ($user->areas) {
            $areas = is_array($user->areas) ? $user->areas : json_decode($user->areas, true) ?? [];
        }

        return $areas;
    }
}
