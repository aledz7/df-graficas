<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use App\Models\AdminConfiguracao;
use App\Models\Tenant;

class MigrarPrecosEnvelopamentoSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Verificar se estamos sendo executados por um comando Artisan
        if (app()->runningInConsole() && app('Illuminate\Console\Output\OutputInterface')) {
            $output = app('Illuminate\Console\Output\OutputInterface');
            $output->info('Iniciando migração dos preços de envelopamento...');
        }

        try {
            // Buscar todos os tenants
            $tenants = Tenant::all();

            foreach ($tenants as $tenant) {
                if (isset($output)) {
                    $output->info("Processando tenant: {$tenant->nome} (ID: {$tenant->id})");
                }

                // Buscar configurações existentes na tabela admin_configuracoes
                $adminConfig = AdminConfiguracao::where('tenant_id', $tenant->id)->first();

                if (!$adminConfig) {
                    if (isset($output)) {
                        $output->info("Criando nova configuração para tenant {$tenant->id}");
                    }
                    $adminConfig = AdminConfiguracao::create([
                        'tenant_id' => $tenant->id,
                        'nome_sistema' => 'GráficaPro',
                        'backup_automatico' => false,
                        'intervalo_backup_dias' => 7,
                        'log_alteracoes' => true,
                        'notificacoes_email' => false,
                        'tempo_sessao_minutos' => 480,
                        'sessao_unica' => false,
                        'forcar_logout_inativo' => true,
                        'tema_padrao' => 'light',
                        'idioma_padrao' => 'pt-BR',
                        'modo_escuro_padrao' => false,
                        'exigir_senha_forte' => true,
                        'tentativas_login_max' => 5,
                        'bloqueio_temporario_minutos' => 30,
                        'autenticacao_2fatores' => false,
                        'preco_aplicacao_envelopamento' => 10.00,
                        'preco_remocao_envelopamento' => 5.00,
                        'preco_lixamento_envelopamento' => 8.00,
                        'preco_pelicula_envelopamento' => 40.00,
                    ]);
                }

                // Buscar dados existentes na tabela dados_usuario para este tenant
                $dadosUsuario = DB::table('dados_usuario')
                    ->join('users', 'dados_usuario.user_id', '=', 'users.id')
                    ->where('users.tenant_id', $tenant->id)
                    ->where('dados_usuario.chave', 'adminAdicionaisSettings')
                    ->first();

                if ($dadosUsuario) {
                    if (isset($output)) {
                        $output->info("Encontrados dados existentes para tenant {$tenant->id}");
                    }

                    // Decodificar o JSON dos dados existentes
                    $valorDecodificado = json_decode($dadosUsuario->valor, true);

                    if ($valorDecodificado && is_array($valorDecodificado)) {
                        // Atualizar a configuração com os valores existentes
                        $adminConfig->update([
                            'preco_aplicacao_envelopamento' => $valorDecodificado['preco_aplicacao'] ?? 10.00,
                            'preco_remocao_envelopamento' => $valorDecodificado['preco_remocao'] ?? 5.00,
                            'preco_lixamento_envelopamento' => $valorDecodificado['preco_lixamento'] ?? 8.00,
                            'preco_pelicula_envelopamento' => $valorDecodificado['preco_pelicula'] ?? 40.00,
                        ]);

                        if (isset($output)) {
                            $output->info("Preços migrados com sucesso para tenant {$tenant->id}");
                        }
                    } else {
                        if (isset($output)) {
                            $output->warn("Dados inválidos encontrados para tenant {$tenant->id}");
                        }
                    }
                } else {
                    if (isset($output)) {
                        $output->info("Nenhum dado existente encontrado para tenant {$tenant->id}, usando valores padrão");
                    }
                }
            }

            if (isset($output)) {
                $output->info('Migração concluída com sucesso!');
            }
        } catch (\Exception $e) {
            if (isset($output)) {
                $output->error('Erro durante a migração: ' . $e->getMessage());
            }
            throw $e;
        }
    }
}
