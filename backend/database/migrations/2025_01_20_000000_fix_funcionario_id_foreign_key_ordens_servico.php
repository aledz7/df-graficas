<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('ordens_servico', function (Blueprint $table) {
            // Primeiro, adicionar a coluna funcionario_id se ela não existir
            if (!Schema::hasColumn('ordens_servico', 'funcionario_id')) {
                $table->unsignedBigInteger('funcionario_id')->nullable()->after('cliente_id');
            }
        });
        
        Schema::table('ordens_servico', function (Blueprint $table) {
            // Verificar se a foreign key existe antes de tentar removê-la
            $foreignKeys = $this->getForeignKeys('ordens_servico');
            
            if (in_array('os_funcionario_id_fk', $foreignKeys)) {
                $table->dropForeign('os_funcionario_id_fk');
            }
            
            // Remover o índice antigo se existir
            $indexes = $this->getIndexes('ordens_servico');
            if (in_array('os_funcionario_id_idx', $indexes)) {
                $table->dropIndex('os_funcionario_id_idx');
            }
        });
        
        // Recriar a foreign key apontando para users
        Schema::table('ordens_servico', function (Blueprint $table) {
            $table->foreign('funcionario_id', 'os_funcionario_id_fk')
                ->references('id')->on('users')
                ->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('ordens_servico', function (Blueprint $table) {
            // Remover a foreign key para users
            $table->dropForeign('os_funcionario_id_fk');
            
            // Recriar a foreign key antiga para funcionarios (se a tabela existir)
            if (Schema::hasTable('funcionarios')) {
                $table->foreign('funcionario_id', 'os_funcionario_id_fk')
                    ->references('id')->on('funcionarios')
                    ->nullOnDelete();
            }
        });
    }

    /**
     * Obter lista de foreign keys de uma tabela
     */
    private function getForeignKeys($tableName)
    {
        $foreignKeys = [];
        $connection = Schema::getConnection();
        
        try {
            $results = $connection->select("
                SELECT CONSTRAINT_NAME 
                FROM information_schema.TABLE_CONSTRAINTS 
                WHERE TABLE_SCHEMA = DATABASE() 
                AND TABLE_NAME = ? 
                AND CONSTRAINT_TYPE = 'FOREIGN KEY'
            ", [$tableName]);
            
            foreach ($results as $result) {
                $foreignKeys[] = $result->CONSTRAINT_NAME;
            }
        } catch (\Exception $e) {
            // Se não conseguir obter as foreign keys, retorna array vazio
        }
        
        return $foreignKeys;
    }

    /**
     * Obter lista de índices de uma tabela
     */
    private function getIndexes($tableName)
    {
        $indexes = [];
        $connection = Schema::getConnection();
        
        try {
            $results = $connection->select("
                SELECT INDEX_NAME 
                FROM information_schema.STATISTICS 
                WHERE TABLE_SCHEMA = DATABASE() 
                AND TABLE_NAME = ?
                AND INDEX_NAME IS NOT NULL
            ", [$tableName]);
            
            foreach ($results as $result) {
                $indexes[] = $result->INDEX_NAME;
            }
        } catch (\Exception $e) {
            // Se não conseguir obter os índices, retorna array vazio
        }
        
        return $indexes;
    }
};
