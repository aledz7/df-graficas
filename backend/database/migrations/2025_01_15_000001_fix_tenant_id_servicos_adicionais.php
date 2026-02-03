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
        // Atualizar todos os serviços que têm tenant_id = 0 para tenant_id = 1
        // Isso corrige serviços antigos que foram criados antes da implementação do tenant_id
        DB::table('servicos_adicionais')
            ->where('tenant_id', 0)
            ->update(['tenant_id' => 1]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Não fazemos rollback desta migration pois pode causar perda de dados
        // Os serviços devem manter o tenant_id = 1
    }
};
