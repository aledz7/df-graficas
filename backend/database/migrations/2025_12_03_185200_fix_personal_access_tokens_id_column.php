<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Desabilitar temporariamente o modo strict para permitir a correção
        DB::statement("SET sql_mode = ''");
        
        try {
            // Corrigir tabela migrations primeiro (se necessário)
            if (Schema::hasTable('migrations')) {
                try {
                    DB::statement("ALTER TABLE `migrations` MODIFY COLUMN `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT");
                } catch (\Exception $e) {
                    // Ignorar se já estiver correto ou se não houver campo id
                }
            }
            
            // Corrigir tabela personal_access_tokens
            $tableName = 'personal_access_tokens';
            
            if (Schema::hasTable($tableName)) {
                // Alterar o campo id para ser auto-incremento
                DB::statement("ALTER TABLE `{$tableName}` MODIFY COLUMN `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT");
            } else {
                // Se a tabela não existe, criá-la
                Schema::create($tableName, function (Blueprint $table) {
                    $table->id();
                    $table->morphs('tokenable');
                    $table->string('name');
                    $table->string('token', 64)->unique();
                    $table->text('abilities')->nullable();
                    $table->timestamp('last_used_at')->nullable();
                    $table->timestamp('expires_at')->nullable();
                    $table->timestamps();
                });
            }
        } finally {
            // Reabilitar o modo strict
            DB::statement("SET sql_mode = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION'");
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Não fazer nada no down, pois queremos manter a correção
    }
};

