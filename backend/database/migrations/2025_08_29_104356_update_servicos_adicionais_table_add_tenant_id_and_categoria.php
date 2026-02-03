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
        Schema::table('servicos_adicionais', function (Blueprint $table) {
            // Adicionar coluna categoria após unidade
            if (!Schema::hasColumn('servicos_adicionais', 'categoria')) {
                $table->string('categoria')->nullable()->after('unidade');
            }

            // Adicionar coluna ordem após categoria
            if (!Schema::hasColumn('servicos_adicionais', 'ordem')) {
                $table->integer('ordem')->default(0)->after('categoria');
            }

            // Adicionar coluna tenant_id após ordem
            if (!Schema::hasColumn('servicos_adicionais', 'tenant_id')) {
                $table->unsignedBigInteger('tenant_id')->after('ordem');
                $table->index('tenant_id');
            }
        });

        // Atualizar registros existentes com tenant_id baseado no user_id
        // Assumindo que o primeiro tenant tem ID 1
        DB::statement('UPDATE servicos_adicionais SET tenant_id = 1 WHERE tenant_id IS NULL');
        
        // Definir categoria padrão para registros existentes
        DB::statement("UPDATE servicos_adicionais SET categoria = 'outros' WHERE categoria IS NULL");
        
        // Definir ordem padrão para registros existentes
        DB::statement("UPDATE servicos_adicionais SET ordem = 0 WHERE ordem IS NULL");

        // Tornar tenant_id obrigatório após preencher os dados
        Schema::table('servicos_adicionais', function (Blueprint $table) {
            $table->unsignedBigInteger('tenant_id')->nullable(false)->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('servicos_adicionais', function (Blueprint $table) {
            // Remover coluna tenant_id se existir
            if (Schema::hasColumn('servicos_adicionais', 'tenant_id')) {
                $table->dropIndex(['tenant_id']);
                $table->dropColumn('tenant_id');
            }

            // Remover coluna ordem se existir
            if (Schema::hasColumn('servicos_adicionais', 'ordem')) {
                $table->dropColumn('ordem');
            }

            // Remover coluna categoria se existir
            if (Schema::hasColumn('servicos_adicionais', 'categoria')) {
                $table->dropColumn('categoria');
            }
        });
    }
};
