<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Database\Seeders\MigrarPrecosEnvelopamentoSeeder;

class MigrarPrecosEnvelopamento extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'envelopamento:migrar-precos';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Migra os preços de envelopamento da tabela dados_usuario para admin_configuracoes';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('🚀 Iniciando migração dos preços de envelopamento...');
        $this->newLine();

        try {
            // Executar a migração diretamente no comando
            $this->migrarPrecosEnvelopamento();

            $this->newLine();
            $this->info('✅ Migração concluída com sucesso!');
            $this->newLine();
            
            $this->info('📋 Resumo da migração:');
            $this->info('   • Os preços de envelopamento foram migrados para a tabela admin_configuracoes');
            $this->info('   • Cada empresa (tenant) agora tem suas configurações globais');
            $this->info('   • Os preços são compartilhados entre todos os usuários da empresa');
            $this->newLine();
            
            $this->info('🔧 Próximos passos:');
            $this->info('   • Execute: php artisan migrate (para aplicar a migração da tabela)');
            $this->info('   • Teste a nova funcionalidade no frontend');
            $this->info('   • Após confirmar que tudo está funcionando, pode remover os dados antigos');
            
        } catch (\Exception $e) {
            $this->error('❌ Erro durante a migração: ' . $e->getMessage());
            $this->error('Stack trace: ' . $e->getTraceAsString());
            return 1;
        }

        return 0;
    }

    /**
     * Executa a migração dos preços de envelopamento
     */
    private function migrarPrecosEnvelopamento()
    {
        // Buscar todos os tenants
        $tenants = \App\Models\Tenant::all();

        foreach ($tenants as $tenant) {
            $this->info("Processando tenant: {$tenant->nome} (ID: {$tenant->id})");

            // Buscar configurações existentes na tabela admin_configuracoes
            $adminConfig = \App\Models\AdminConfiguracao::where('tenant_id', $tenant->id)->first();

            if (!$adminConfig) {
                $this->info("Criando nova configuração para tenant {$tenant->id}");
                $adminConfig = \App\Models\AdminConfiguracao::create([
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
            $dadosUsuario = \Illuminate\Support\Facades\DB::table('dados_usuario')
                ->join('users', 'dados_usuario.user_id', '=', 'users.id')
                ->where('users.tenant_id', $tenant->id)
                ->where('dados_usuario.chave', 'adminAdicionaisSettings')
                ->first();

            if ($dadosUsuario) {
                $this->info("Encontrados dados existentes para tenant {$tenant->id}");

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

                    $this->info("Preços migrados com sucesso para tenant {$tenant->id}");
                } else {
                    $this->warn("Dados inválidos encontrados para tenant {$tenant->id}");
                }
            } else {
                $this->info("Nenhum dado existente encontrado para tenant {$tenant->id}, usando valores padrão");
            }
        }
    }
}
