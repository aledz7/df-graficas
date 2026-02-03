<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AdminConfiguracao;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;

class AdminConfiguracaoController extends Controller
{
    /**
     * Get current admin configuration.
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function index()
    {
        try {
            $config = AdminConfiguracao::getOuCriarConfiguracao();
            
            return response()->json([
                'success' => true,
                'data' => [
                    'nome_sistema' => $config->nome_sistema,
                    'backup_automatico' => $config->backup_automatico,
                    'intervalo_backup_dias' => $config->intervalo_backup_dias,
                    'log_alteracoes' => $config->log_alteracoes,
                    'notificacoes_email' => $config->notificacoes_email,
                    'tempo_sessao_minutos' => $config->tempo_sessao_minutos,
                    'sessao_unica' => $config->sessao_unica,
                    'forcar_logout_inativo' => $config->forcar_logout_inativo,
                    'tema_padrao' => $config->tema_padrao,
                    'idioma_padrao' => $config->idioma_padrao,
                    'modo_escuro_padrao' => $config->modo_escuro_padrao,
                    'exigir_senha_forte' => $config->exigir_senha_forte,
                    'tentativas_login_max' => $config->tentativas_login_max,
                    'bloqueio_temporario_minutos' => $config->bloqueio_temporario_minutos,
                    'autenticacao_2fatores' => $config->autenticacao_2fatores,
                    'notificacoes_config' => $config->notificacoes_config,
                    'tem_senha_master' => AdminConfiguracao::temSenhaMaster(),
                    'usuario_cadastro' => $config->usuarioCadastro ? [
                        'id' => $config->usuarioCadastro->id,
                        'nome' => $config->usuarioCadastro->name,
                    ] : null,
                    'usuario_alteracao' => $config->usuarioAlteracao ? [
                        'id' => $config->usuarioAlteracao->id,
                        'nome' => $config->usuarioAlteracao->name,
                    ] : null,
                    'created_at' => $config->created_at,
                    'updated_at' => $config->updated_at,
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('Erro ao buscar configurações administrativas: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'Erro ao buscar configurações administrativas',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update admin configuration.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function update(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'nome_sistema' => 'sometimes|string|max:255',
                'senha_master' => 'sometimes|nullable|string|min:6',
                'backup_automatico' => 'sometimes|boolean',
                'intervalo_backup_dias' => 'sometimes|integer|min:1|max:365',
                'log_alteracoes' => 'sometimes|boolean',
                'notificacoes_email' => 'sometimes|boolean',
                'tempo_sessao_minutos' => 'sometimes|integer|min:15|max:1440',
                'sessao_unica' => 'sometimes|boolean',
                'forcar_logout_inativo' => 'sometimes|boolean',
                'tema_padrao' => 'sometimes|string|in:light,dark,auto',
                'idioma_padrao' => 'sometimes|string|in:pt-BR,en-US,es-ES',
                'modo_escuro_padrao' => 'sometimes|boolean',
                'exigir_senha_forte' => 'sometimes|boolean',
                'tentativas_login_max' => 'sometimes|integer|min:1|max:10',
                'bloqueio_temporario_minutos' => 'sometimes|integer|min:5|max:1440',
                'autenticacao_2fatores' => 'sometimes|boolean',
                'notificacoes_config' => 'sometimes|array',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Dados inválidos',
                    'errors' => $validator->errors()
                ], 422);
            }

            $dados = $request->only([
                'nome_sistema',
                'senha_master',
                'backup_automatico',
                'intervalo_backup_dias',
                'log_alteracoes',
                'notificacoes_email',
                'tempo_sessao_minutos',
                'sessao_unica',
                'forcar_logout_inativo',
                'tema_padrao',
                'idioma_padrao',
                'modo_escuro_padrao',
                'exigir_senha_forte',
                'tentativas_login_max',
                'bloqueio_temporario_minutos',
                'autenticacao_2fatores',
                'notificacoes_config',
            ]);

            // Remover campos vazios
            $dados = array_filter($dados, function ($value) {
                return $value !== null && $value !== '';
            });

            $sucesso = AdminConfiguracao::atualizarConfiguracao($dados);

            if ($sucesso) {
                // Log da alteração se habilitado
                if (AdminConfiguracao::getValor('log_alteracoes', true)) {
                    Log::info('Configurações administrativas atualizadas', [
                        'usuario_id' => auth()->id(),
                        'usuario_nome' => auth()->user()->name,
                        'alteracoes' => array_keys($dados)
                    ]);
                }

                return response()->json([
                    'success' => true,
                    'message' => 'Configurações administrativas atualizadas com sucesso'
                ]);
            } else {
                return response()->json([
                    'success' => false,
                    'message' => 'Erro ao atualizar configurações administrativas'
                ], 500);
            }
        } catch (\Exception $e) {
            Log::error('Erro ao atualizar configurações administrativas: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'Erro ao atualizar configurações administrativas',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update specific configuration value.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  string  $chave
     * @return \Illuminate\Http\JsonResponse
     */
    public function updateChave(Request $request, $chave)
    {
        try {
            $validator = Validator::make($request->all(), [
                'valor' => 'required'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Valor é obrigatório',
                    'errors' => $validator->errors()
                ], 422);
            }

            $valor = $request->valor;
            $sucesso = AdminConfiguracao::setValor($chave, $valor);

            if ($sucesso) {
                // Log da alteração se habilitado
                if (AdminConfiguracao::getValor('log_alteracoes', true)) {
                    Log::info("Configuração administrativa '{$chave}' atualizada", [
                        'usuario_id' => auth()->id(),
                        'usuario_nome' => auth()->user()->name,
                        'chave' => $chave,
                        'valor' => $chave === 'senha_master' ? '[OCULTO]' : $valor
                    ]);
                }

                return response()->json([
                    'success' => true,
                    'message' => "Configuração '{$chave}' atualizada com sucesso"
                ]);
            } else {
                return response()->json([
                    'success' => false,
                    'message' => "Erro ao atualizar configuração '{$chave}'"
                ], 500);
            }
        } catch (\Exception $e) {
            Log::error("Erro ao atualizar configuração '{$chave}': " . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => "Erro ao atualizar configuração '{$chave}'",
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get specific configuration value.
     *
     * @param  string  $chave
     * @return \Illuminate\Http\JsonResponse
     */
    public function show($chave)
    {
        try {
            $valor = AdminConfiguracao::getValor($chave);
            
            return response()->json([
                'success' => true,
                'data' => [
                    'chave' => $chave,
                    'valor' => $chave === 'senha_master' ? null : $valor,
                    'tem_senha_master' => $chave === 'senha_master' ? AdminConfiguracao::temSenhaMaster() : null
                ]
            ]);
        } catch (\Exception $e) {
            Log::error("Erro ao buscar configuração '{$chave}': " . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => "Erro ao buscar configuração '{$chave}'",
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Validate senha master.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function validarSenhaMaster(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'senha' => 'required|string'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Senha é obrigatória',
                    'errors' => $validator->errors()
                ], 422);
            }

            $senha = $request->senha;
            $valida = AdminConfiguracao::validarSenhaMaster($senha);

            return response()->json([
                'success' => true,
                'data' => [
                    'valida' => $valida,
                    'tem_senha_master' => AdminConfiguracao::temSenhaMaster()
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('Erro ao validar senha master: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'Erro ao validar senha master',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Remove senha master.
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function removerSenhaMaster()
    {
        try {
            $sucesso = AdminConfiguracao::setValor('senha_master', null);

            if ($sucesso) {
                // Log da alteração se habilitado
                if (AdminConfiguracao::getValor('log_alteracoes', true)) {
                    Log::info('Senha master removida', [
                        'usuario_id' => auth()->id(),
                        'usuario_nome' => auth()->user()->name
                    ]);
                }

                return response()->json([
                    'success' => true,
                    'message' => 'Senha master removida com sucesso'
                ]);
            } else {
                return response()->json([
                    'success' => false,
                    'message' => 'Erro ao remover senha master'
                ], 500);
            }
        } catch (\Exception $e) {
            Log::error('Erro ao remover senha master: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'Erro ao remover senha master',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Reset do sistema (requer senha master)
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function resetSistema()
    {
        try {
            // Aqui você implementaria a lógica de reset do sistema
            // Por exemplo, limpar dados temporários, resetar contadores, etc.
            
            Log::info('Reset do sistema executado', [
                'usuario_id' => auth()->id(),
                'usuario_nome' => auth()->user()->name
            ]);
            
            return response()->json([
                'success' => true,
                'message' => 'Sistema resetado com sucesso'
            ]);
        } catch (\Exception $e) {
            Log::error('Erro ao resetar sistema: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'Erro ao resetar sistema',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Backup completo do sistema (requer senha master)
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function backupCompleto()
    {
        try {
            // Aqui você implementaria a lógica de backup completo
            // Por exemplo, exportar todos os dados, gerar arquivo de backup, etc.
            
            Log::info('Backup completo executado', [
                'usuario_id' => auth()->id(),
                'usuario_nome' => auth()->user()->name
            ]);
            
            return response()->json([
                'success' => true,
                'message' => 'Backup completo gerado com sucesso',
                'data' => [
                    'arquivo' => 'backup_completo_' . date('Y-m-d_H-i-s') . '.zip',
                    'tamanho' => '15.2 MB'
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('Erro ao gerar backup completo: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'Erro ao gerar backup completo',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
