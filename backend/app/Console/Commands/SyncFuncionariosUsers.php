<?php

namespace App\Console\Commands;

use App\Models\Funcionario;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class SyncFuncionariosUsers extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'funcionarios:sync-users {--tenant= : ID do tenant específico} {--dry-run : Executar sem fazer alterações}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Sincroniza funcionários com a tabela users';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $tenantId = $this->option('tenant');
        $dryRun = $this->option('dry-run');

        if ($dryRun) {
            $this->info('🔍 Modo DRY RUN - Nenhuma alteração será feita');
        }

        $this->info('🔄 Iniciando sincronização de funcionários com usuários...');

        try {
            DB::beginTransaction();

            // Buscar funcionários
            $query = Funcionario::query();
            if ($tenantId) {
                $query->where('tenant_id', $tenantId);
            }
            
            $funcionarios = $query->get();
            
            $this->info("📋 Encontrados {$funcionarios->count()} funcionários");

            $created = 0;
            $updated = 0;
            $skipped = 0;
            $errors = 0;

            foreach ($funcionarios as $funcionario) {
                try {
                    $this->line("Processando: {$funcionario->nome} (ID: {$funcionario->id})");

                    // Determinar email
                    $email = $funcionario->email;
                    if (!$email) {
                        $email = $this->generateEmailFromName($funcionario->nome);
                        if (!$dryRun) {
                            $funcionario->update(['email' => $email]);
                        }
                        $this->line("  📧 Email gerado: {$email}");
                    }

                    // Verificar se já existe usuário
                    $user = User::where('email', $email)
                               ->where('tenant_id', $funcionario->tenant_id)
                               ->first();

                    if ($user) {
                        // Atualizar usuário existente
                        if (!$dryRun) {
                            $user->update([
                                'name' => $funcionario->nome,
                                'ativo' => $funcionario->status,
                            ]);
                        }
                        $updated++;
                        $this->line("  ✅ Usuário atualizado (ID: {$user->id})");
                    } else {
                        // Criar novo usuário
                        if (!$dryRun) {
                            $userData = [
                                'name' => $funcionario->nome,
                                'email' => $email,
                                'password' => !empty($funcionario->senha) ? Hash::make($funcionario->senha) : Hash::make('123456'),
                                'tenant_id' => $funcionario->tenant_id,
                                'is_admin' => false,
                                'ativo' => $funcionario->status,
                            ];
                            
                            $user = User::create($userData);
                        }
                        $created++;
                        $this->line("  ➕ Usuário criado");
                    }

                } catch (\Exception $e) {
                    $errors++;
                    $this->error("  ❌ Erro ao processar funcionário {$funcionario->id}: {$e->getMessage()}");
                }
            }

            if (!$dryRun) {
                DB::commit();
            }

            // Relatório final
            $this->newLine();
            $this->info('📊 Relatório de Sincronização:');
            $this->line("  ➕ Usuários criados: {$created}");
            $this->line("  ✅ Usuários atualizados: {$updated}");
            $this->line("  ⏭️  Funcionários ignorados: {$skipped}");
            $this->line("  ❌ Erros: {$errors}");

            if ($dryRun) {
                $this->warn('⚠️  Modo DRY RUN - Nenhuma alteração foi feita no banco de dados');
            } else {
                $this->info('🎉 Sincronização concluída com sucesso!');
            }

        } catch (\Exception $e) {
            DB::rollBack();
            $this->error("❌ Erro durante a sincronização: {$e->getMessage()}");
            return 1;
        }

        return 0;
    }

    /**
     * Gerar email baseado no nome do funcionário
     */
    private function generateEmailFromName($nome)
    {
        $baseName = Str::slug($nome, '');
        $baseName = preg_replace('/[^a-zA-Z0-9]/', '', $baseName);
        $baseName = strtolower($baseName);
        
        // Verificar se já existe um usuário com este email base
        $counter = 1;
        $email = $baseName . '@empresa.com';
        
        while (User::where('email', $email)->exists()) {
            $email = $baseName . $counter . '@empresa.com';
            $counter++;
        }
        
        return $email;
    }
} 