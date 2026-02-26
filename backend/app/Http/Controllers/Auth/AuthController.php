<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Tenant;
use App\Models\Empresa;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    /**
     * Permissões completas para o dono da empresa nova (cadastro = empresa nova).
     * Chaves devem coincidir com as usadas no frontend (usePermissions e routePermissions do Sidebar).
     */
    protected static function getAllPermissions(): array
    {
        $mainPermissions = [
            'acessar_dashboard' => true,
            'acessar_agenda' => true,
            'acessar_pdv' => true,
            'acessar_marketplace' => true,
            'acessar_calculadora' => true,
            'acessar_os' => true,
            'acessar_envelopamento' => true,
            'acessar_feed' => true,
            'acessar_entrada_estoque' => true,
            'acessar_financeiro' => true,
            'gerenciar_produtos' => true,
            'gerenciar_clientes' => true,
            'gerenciar_fornecedores' => true,
            'gerenciar_funcionarios' => true,
            'gerenciar_caixa' => true,
            'gerenciar_lixeira' => true,
            'ver_relatorios' => true,
            'ver_auditoria' => true,
            'config_sistema' => true,
            'config_aparencia' => true,
            'config_empresa' => true,
            'config_precos_env' => true,
            'config_acabamentos_os' => true,
            'gerar_etiquetas' => true,
        ];

        $subPermissions = array_fill_keys([
            'dashboard_ver_vendas',
            'dashboard_ver_os',
            'dashboard_ver_financeiro',
            'dashboard_ver_graficos',
            'agenda_ver',
            'agenda_criar',
            'envelopamento_ver',
            'pdv_criar_venda',
            'pdv_aplicar_desconto',
            'pdv_cancelar_venda',
            'pdv_alterar_preco',
            'os_criar',
            'os_editar',
            'os_cancelar',
            'os_alterar_status',
            'os_aplicar_desconto',
            'os_alterar_preco',
            'os_excluir',
            'env_criar_orcamento',
            'env_editar',
            'env_converter_os',
            'marketplace_ver',
            'marketplace_processar',
            'marketplace_cancelar',
            'clientes_cadastrar',
            'clientes_editar',
            'clientes_ativar_desativar',
            'clientes_alterar_senha',
            'clientes_desconto',
            'clientes_excluir',
            'clientes_logar_como',
            'clientes_exportar',
            'produtos_cadastrar',
            'produtos_editar',
            'produtos_ver_custo',
            'produtos_alterar_preco',
            'produtos_alterar_estoque',
            'produtos_excluir',
            'fornecedores_cadastrar',
            'fornecedores_editar',
            'fornecedores_excluir',
            'estoque_registrar_entrada',
            'estoque_ver_historico',
            'estoque_cancelar_entrada',
            'feed_ver',
            'feed_atualizar_status',
            'agenda_ver',
            'agenda_criar',
            'agenda_editar',
            'financeiro_contas_pagar',
            'financeiro_contas_receber',
            'financeiro_fluxo_caixa',
            'financeiro_baixar_titulos',
            'financeiro_estornar',
            'caixa_abrir',
            'caixa_fechar',
            'caixa_sangria',
            'caixa_suprimento',
            'caixa_ver_outros',
            'relatorios_vendas',
            'relatorios_financeiros',
            'relatorios_estoque',
            'relatorios_clientes',
            'relatorios_exportar',
            'lixeira_ver',
            'lixeira_restaurar',
            'lixeira_excluir_permanente',
            'config_geral',
            'config_impostos',
            'config_formas_pagto',
            'funcionarios_cadastrar',
            'funcionarios_editar',
            'funcionarios_permissoes',
            'funcionarios_excluir',
        ], true);

        return array_merge($mainPermissions, $subPermissions);
    }

    public function register(Request $request)
    {
        $validatedData = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => 'required|string|min:8|confirmed',
        ]);

        // Cadastro é de uma EMPRESA NOVA: criar novo tenant e empresa com dados zerados
        // Tudo dentro de uma transação para garantir atomicidade
        [$tenant, $user, $token] = DB::transaction(function () use ($validatedData) {
            $tenant = new Tenant();
            $tenant->nome = $validatedData['name'];
            $tenant->razao_social = $validatedData['name'];
            $tenant->email = $validatedData['email'];
            $tenant->telefone = null;
            $tenant->celular = null;
            $tenant->ativo = true;
            $tenant->tema = 'light';
            $tenant->plano = 'gratuito';
            $tenant->limite_usuarios = 1;
            $tenant->limite_armazenamento_mb = 100;
            $tenant->saveQuietly();

            $user = User::create([
                'name' => $validatedData['name'],
                'email' => $validatedData['email'],
                'password' => Hash::make($validatedData['password']),
                'tenant_id' => $tenant->id,
                'is_admin' => false,
                'ativo' => true,
                'permissions' => self::getAllPermissions(),
            ]);

            // Criar empresa para este tenant somente se ainda não existir
            // (pode já existir como dado pré-populado para o tenant)
            Empresa::withoutTenant()->firstOrCreate(
                ['tenant_id' => $tenant->id],
                [
                    'nome_fantasia' => $validatedData['name'],
                    'razao_social' => $validatedData['name'],
                    'cnpj' => null,
                    'inscricao_estadual' => null,
                    'inscricao_municipal' => null,
                    'email' => $validatedData['email'],
                    'telefone' => null,
                    'whatsapp' => null,
                    'endereco_completo' => null,
                    'instagram' => null,
                    'site' => null,
                    'logo_url' => null,
                    'nome_sistema' => 'Sistema Gráficas',
                    'mensagem_rodape' => 'Obrigado pela preferência!',
                    'senha_supervisor' => null,
                    'termos_servico' => 'Termos de serviço padrão da empresa...',
                    'politica_privacidade' => 'Política de privacidade padrão da empresa...',
                ]
            );

            $token = $user->createToken('auth_token')->plainTextToken;

            return [$tenant, $user, $token];
        });

        unset($tenant); // não mais necessário

        return response()->json([
            'access_token' => $token,
            'token_type' => 'Bearer',
            'user' => $user
        ]);
    }

    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required',
        ]);

        $user = User::where('email', $request->email)->first();

        if (! $user || ! Hash::check($request->password, $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['As credenciais fornecidas estão incorretas.'],
            ]);
        }

        // Bloquear login se o tenant do usuário estiver inativo
        if ($user->tenant_id) {
            $tenant = Tenant::find($user->tenant_id);
            if ($tenant && !$tenant->isActive()) {
                throw ValidationException::withMessages([
                    'email' => ['Acesso bloqueado. Entre em contato com o suporte.'],
                ]);
            }
        }

        // Se o usuário tem 2FA ativado, enviar código e não criar token ainda
        if ($user->two_factor_enabled) {
            // Gerar e enviar código 2FA
            $code = str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT);
            $expiresAt = now()->addMinutes(10);
            
            $user->update([
                'two_factor_code' => Hash::make($code),
                'two_factor_code_expires_at' => $expiresAt
            ]);

            // Enviar email com o código APÓS retornar a resposta (não bloqueia o request)
            $userEmail = $user->email;
            $userName = $user->name;
            $expiresFormatted = $expiresAt->format('d/m/Y H:i');
            
            defer(function () use ($code, $userEmail, $userName, $expiresFormatted) {
                try {
                    Mail::send('emails.two-factor-code', [
                        'code' => $code,
                        'user' => (object) ['name' => $userName, 'email' => $userEmail],
                        'expires_at' => $expiresFormatted
                    ], function ($message) use ($userEmail, $userName) {
                        $message->to($userEmail, $userName)
                                ->subject('Código de Verificação - Autenticação de Dois Fatores');
                    });
                } catch (\Exception $e) {
                    \Log::error('Erro ao enviar código 2FA: ' . $e->getMessage());
                }
            });

            return response()->json([
                'success' => true,
                'requires_two_factor' => true,
                'message' => 'Código de verificação enviado para seu email.',
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'two_factor_enabled' => true
                ]
            ]);
        }

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'access_token' => $token,
            'token_type' => 'Bearer',
            'user' => $user,
            'requires_two_factor' => false
        ]);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'message' => 'Logged out successfully'
        ]);
    }

    public function me(Request $request)
    {
        $user = $request->user();
        
        // Buscar funcionário associado e suas permissões
        $funcionario = $user->funcionario;
        
        if ($funcionario) {
            $user->funcionario_permissions = $funcionario->permissions;
            $user->funcionario_nome = $funcionario->nome;
            $user->funcionario_cargo = $funcionario->cargo;
        }
        
        return response()->json($user);
    }

    public function changePassword(Request $request)
    {
        $request->validate([
            'current_password' => 'required|string',
            'new_password' => 'required|string|min:8|confirmed',
        ]);

        $user = $request->user();

        // Verificar se a senha atual está correta
        if (!Hash::check($request->current_password, $user->password)) {
            return response()->json([
                'success' => false,
                'message' => 'A senha atual está incorreta.'
            ], 422);
        }

        // Atualizar a senha
        $user->update([
            'password' => Hash::make($request->new_password)
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Senha alterada com sucesso!'
        ]);
    }

    public function toggleTwoFactor(Request $request)
    {
        $request->validate([
            'enabled' => 'required|boolean'
        ]);

        $user = $request->user();
        $enabled = $request->enabled;

        \Log::info('Toggle 2FA request', [
            'user_id' => $user->id,
            'user_email' => $user->email,
            'enabled' => $enabled,
            'current_2fa_status' => $user->two_factor_enabled
        ]);

        if ($enabled) {
            // Ativar 2FA
            $updated = $user->update(['two_factor_enabled' => true]);
            
            \Log::info('2FA activation result', [
                'user_id' => $user->id,
                'update_result' => $updated,
                'new_2fa_status' => $user->fresh()->two_factor_enabled
            ]);
            
            return response()->json([
                'success' => true,
                'message' => 'Autenticação de dois fatores ativada com sucesso!',
                'two_factor_enabled' => true
            ]);
        } else {
            // Desativar 2FA
            $updated = $user->update([
                'two_factor_enabled' => false,
                'two_factor_code' => null,
                'two_factor_code_expires_at' => null
            ]);
            
            \Log::info('2FA deactivation result', [
                'user_id' => $user->id,
                'update_result' => $updated,
                'new_2fa_status' => $user->fresh()->two_factor_enabled
            ]);
            
            return response()->json([
                'success' => true,
                'message' => 'Autenticação de dois fatores desativada com sucesso!',
                'two_factor_enabled' => false
            ]);
        }
    }

    public function getTwoFactorStatus(Request $request)
    {
        $user = $request->user();
        
        return response()->json([
            'success' => true,
            'two_factor_enabled' => $user->two_factor_enabled
        ]);
    }

    public function sendTwoFactorCode(Request $request)
    {
        $request->validate([
            'email' => 'required|email'
        ]);

        $user = User::where('email', $request->email)->first();
        
        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Usuário não encontrado.'
            ], 404);
        }

        if (!$user->two_factor_enabled) {
            return response()->json([
                'success' => false,
                'message' => 'Autenticação de dois fatores não está ativada para este usuário.'
            ], 400);
        }

        // Gerar código de 6 dígitos
        $code = str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT);
        
        // Definir expiração (10 minutos)
        $expiresAt = now()->addMinutes(10);
        
        // Salvar código no banco
        $user->update([
            'two_factor_code' => Hash::make($code),
            'two_factor_code_expires_at' => $expiresAt
        ]);

        // Enviar email com o código APÓS retornar a resposta (não bloqueia o request)
        $userEmail = $user->email;
        $userName = $user->name;
        $expiresFormatted = $expiresAt->format('d/m/Y H:i');

        defer(function () use ($code, $userEmail, $userName, $expiresFormatted) {
            try {
                Mail::send('emails.two-factor-code', [
                    'code' => $code,
                    'user' => (object) ['name' => $userName, 'email' => $userEmail],
                    'expires_at' => $expiresFormatted
                ], function ($message) use ($userEmail, $userName) {
                    $message->to($userEmail, $userName)
                            ->subject('Código de Verificação - Autenticação de Dois Fatores');
                });
            } catch (\Exception $e) {
                \Log::error('Erro ao enviar código 2FA: ' . $e->getMessage());
            }
        });

        return response()->json([
            'success' => true,
            'message' => 'Código de verificação enviado para seu email.'
        ]);
    }

    public function verifyTwoFactorCode(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'code' => 'required|string|size:6'
        ]);

        $user = User::where('email', $request->email)->first();
        
        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Usuário não encontrado.'
            ], 404);
        }

        if (!$user->two_factor_enabled) {
            return response()->json([
                'success' => false,
                'message' => 'Autenticação de dois fatores não está ativada.'
            ], 400);
        }

        // Verificar se o código existe e não expirou
        if (!$user->two_factor_code || !$user->two_factor_code_expires_at) {
            return response()->json([
                'success' => false,
                'message' => 'Código de verificação não encontrado ou expirado.'
            ], 400);
        }

        if (now()->isAfter($user->two_factor_code_expires_at)) {
            return response()->json([
                'success' => false,
                'message' => 'Código de verificação expirado.'
            ], 400);
        }

        // Verificar se o código está correto
        if (!Hash::check($request->code, $user->two_factor_code)) {
            return response()->json([
                'success' => false,
                'message' => 'Código de verificação inválido.'
            ], 400);
        }

        // Limpar o código após verificação bem-sucedida
        $user->update([
            'two_factor_code' => null,
            'two_factor_code_expires_at' => null
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Código verificado com sucesso!'
        ]);
    }

    public function completeTwoFactorLogin(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'code' => 'required|string|size:6'
        ]);

        \Log::info('Complete 2FA Login request', [
            'email' => $request->email,
            'code' => $request->code
        ]);

        $user = User::where('email', $request->email)->first();
        
        if (!$user) {
            \Log::warning('User not found for 2FA completion', ['email' => $request->email]);
            return response()->json([
                'success' => false,
                'message' => 'Usuário não encontrado.'
            ], 404);
        }

        \Log::info('User found for 2FA completion', [
            'user_id' => $user->id,
            'two_factor_enabled' => $user->two_factor_enabled,
            'has_code' => !is_null($user->two_factor_code),
            'code_expires_at' => $user->two_factor_code_expires_at
        ]);

        if (!$user->two_factor_enabled) {
            \Log::warning('2FA not enabled for user', ['user_id' => $user->id]);
            return response()->json([
                'success' => false,
                'message' => 'Autenticação de dois fatores não está ativada.'
            ], 400);
        }

        // Verificar se o código existe e não expirou
        if (!$user->two_factor_code || !$user->two_factor_code_expires_at) {
            \Log::warning('No 2FA code found or expired', [
                'user_id' => $user->id,
                'has_code' => !is_null($user->two_factor_code),
                'has_expires_at' => !is_null($user->two_factor_code_expires_at)
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Código de verificação não encontrado ou expirado.'
            ], 400);
        }

        if (now()->isAfter($user->two_factor_code_expires_at)) {
            \Log::warning('2FA code expired', [
                'user_id' => $user->id,
                'expires_at' => $user->two_factor_code_expires_at,
                'now' => now()
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Código de verificação expirado.'
            ], 400);
        }

        // Verificar se o código está correto
        if (!Hash::check($request->code, $user->two_factor_code)) {
            \Log::warning('Invalid 2FA code', [
                'user_id' => $user->id,
                'provided_code' => $request->code
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Código de verificação inválido.'
            ], 400);
        }

        \Log::info('2FA code verified successfully', ['user_id' => $user->id]);

        // Bloquear login se o tenant do usuário estiver inativo
        if ($user->tenant_id) {
            $tenant = Tenant::find($user->tenant_id);
            if ($tenant && !$tenant->isActive()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Acesso bloqueado. Entre em contato com o suporte.'
                ], 403);
            }
        }

        // Limpar o código após verificação bem-sucedida
        $user->update([
            'two_factor_code' => null,
            'two_factor_code_expires_at' => null
        ]);

        // Criar token de autenticação
        $token = $user->createToken('auth_token')->plainTextToken;

        \Log::info('2FA login completed successfully', [
            'user_id' => $user->id,
            'token_created' => true
        ]);

        return response()->json([
            'access_token' => $token,
            'token_type' => 'Bearer',
            'user' => $user,
            'success' => true,
            'message' => 'Login realizado com sucesso!'
        ]);
    }
}
