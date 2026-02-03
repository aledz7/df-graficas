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
        // Atualizar os dados: funcionario_id -> user_id
        // Para registros onde user_id é null mas funcionario_id tem valor
        DB::statement('
            UPDATE comissoes_os 
            SET user_id = funcionario_id 
            WHERE user_id IS NULL AND funcionario_id IS NOT NULL
        ');

        // Corrigir o tipo da coluna funcionario_id para unsigned
        Schema::table('comissoes_os', function (Blueprint $table) {
            $table->unsignedBigInteger('funcionario_id')->nullable()->change();
        });

        // Verificar se a foreign key já existe antes de tentar criá-la
        $foreignKeys = DB::select("
            SELECT CONSTRAINT_NAME 
            FROM information_schema.KEY_COLUMN_USAGE 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'comissoes_os' 
            AND COLUMN_NAME = 'funcionario_id' 
            AND REFERENCED_TABLE_NAME IS NOT NULL
        ");
        
        $foreignKeyExists = collect($foreignKeys)->contains('CONSTRAINT_NAME', 'comissoes_os_funcionario_id_foreign');
        
        if (!$foreignKeyExists) {
            // Adicionar nova foreign key constraint para funcionario_id que referencia users
            Schema::table('comissoes_os', function (Blueprint $table) {
                $table->foreign('funcionario_id')->references('id')->on('users')->onDelete('set null');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Remover a nova foreign key
        Schema::table('comissoes_os', function (Blueprint $table) {
            $table->dropForeign(['funcionario_id']);
        });

        // Restaurar funcionario_id como NOT NULL
        Schema::table('comissoes_os', function (Blueprint $table) {
            $table->unsignedBigInteger('funcionario_id')->nullable(false)->change();
        });

        // Restaurar a foreign key original (se a tabela funcionarios existir)
        if (Schema::hasTable('funcionarios')) {
            Schema::table('comissoes_os', function (Blueprint $table) {
                $table->foreign('funcionario_id')->references('id')->on('funcionarios')->onDelete('cascade');
            });
        }
    }
};
