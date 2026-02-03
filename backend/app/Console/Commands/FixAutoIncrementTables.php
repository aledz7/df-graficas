<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class FixAutoIncrementTables extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'fix:auto-increment';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Corrige campos id que não são auto-incremento nas tabelas do banco de dados';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Corrigindo campos id para auto-incremento...');
        
        // Desabilitar temporariamente o modo strict
        DB::statement("SET sql_mode = ''");
        
        $tables = ['migrations', 'personal_access_tokens'];
        $fixed = 0;
        $errors = 0;
        
        foreach ($tables as $tableName) {
            try {
                if (Schema::hasTable($tableName)) {
                    // Verificar se o campo id existe e não é auto-incremento
                    $columns = DB::select("SHOW COLUMNS FROM `{$tableName}` WHERE Field = 'id'");
                    
                    if (!empty($columns)) {
                        $column = $columns[0];
                        $isAutoIncrement = strpos($column->Extra ?? '', 'auto_increment') !== false;
                        
                        if (!$isAutoIncrement) {
                            $this->line("Corrigindo tabela: {$tableName}");
                            DB::statement("ALTER TABLE `{$tableName}` MODIFY COLUMN `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT");
                            $this->info("✓ Tabela {$tableName} corrigida com sucesso!");
                            $fixed++;
                        } else {
                            $this->line("Tabela {$tableName} já está correta.");
                        }
                    } else {
                        $this->warn("Tabela {$tableName} não possui campo 'id'.");
                    }
                } else {
                    $this->line("Tabela {$tableName} não existe.");
                }
            } catch (\Exception $e) {
                $this->error("Erro ao corrigir tabela {$tableName}: " . $e->getMessage());
                $errors++;
            }
        }
        
        // Reabilitar o modo strict
        DB::statement("SET sql_mode = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION'");
        
        $this->newLine();
        if ($fixed > 0) {
            $this->info("✓ {$fixed} tabela(s) corrigida(s) com sucesso!");
        }
        if ($errors > 0) {
            $this->error("✗ {$errors} erro(s) encontrado(s).");
        }
        
        if ($fixed === 0 && $errors === 0) {
            $this->info("Todas as tabelas já estão corretas!");
        }
        
        return Command::SUCCESS;
    }
}
