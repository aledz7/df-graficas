<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\AdminConfiguracao;
use App\Models\Tenant;

class AdminConfiguracaoSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $tenants = Tenant::all();
        
        foreach ($tenants as $tenant) {
            AdminConfiguracao::firstOrCreate(
                ['tenant_id' => $tenant->id],
                [
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
                    'notificacoes_config' => [
                        'email_vendas' => true,
                        'email_orcamentos' => true,
                        'email_contas_receber' => false,
                        'email_contas_pagar' => false,
                        'email_estoque_baixo' => true,
                        'email_backup' => false,
                    ],
                ]
            );
        }
        
        $this->command->info('Configurações administrativas criadas para todos os tenants.');
    }
}
