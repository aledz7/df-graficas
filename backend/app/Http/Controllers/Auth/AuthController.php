<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Tenant;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function register(Request $request)
    {
        $validatedData = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => 'required|string|min:8|confirmed',
        ]);
        
        // Verificar se existe um tenant, se não, criar um tenant padrão
        $tenant = Tenant::first();
        if (!$tenant) {
            // Desativar temporariamente os eventos do modelo para evitar o erro com o campo 'dominio'
            $tenant = new Tenant();
            $tenant->nome = 'Nome da sua Empresa';
            $tenant->razao_social = 'Nome da sua Empresa Ltda';
            $tenant->email = 'contato@empresa.com';
            $tenant->telefone = '(00) 0000-0000';
            $tenant->ativo = true;
            $tenant->tema = 'light';
            $tenant->plano = 'gratuito';
            $tenant->limite_usuarios = 1;
            $tenant->limite_armazenamento_mb = 100;
            $tenant->saveQuietly(); // Salva sem disparar eventos
        }

        $user = User::create([
            'name' => $validatedData['name'],
            'email' => $validatedData['email'],
            'password' => Hash::make($validatedData['password']),
            'tenant_id' => $tenant->id, // Usando o ID do tenant existente ou recém-criado
        ]);

        $token = $user->createToken('auth_token')->plainTextToken;

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
                'email' => ['The provided credentials are incorrect.'],
            ]);
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

            // Enviar email com o código
            try {
                Mail::send('emails.two-factor-code', [
                    'code' => $code,
                    'user' => $user,
                    'expires_at' => $expiresAt->format('d/m/Y H:i')
                ], function ($message) use ($user) {
                    $message->to($user->email, $user->name)
                            ->subject('Código de Verificação - Autenticação de Dois Fatores');
                });
            } catch (\Exception $e) {
                // Log do erro, mas não falhar o login
                \Log::error('Erro ao enviar código 2FA: ' . $e->getMessage());
            }

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

        // Enviar email com o código
        try {
            Mail::send('emails.two-factor-code', [
                'code' => $code,
                'user' => $user,
                'expires_at' => $expiresAt->format('d/m/Y H:i')
            ], function ($message) use ($user) {
                $message->to($user->email, $user->name)
                        ->subject('Código de Verificação - Autenticação de Dois Fatores');
            });

            return response()->json([
                'success' => true,
                'message' => 'Código de verificação enviado para seu email.'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro ao enviar código de verificação. Tente novamente.'
            ], 500);
        }
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
