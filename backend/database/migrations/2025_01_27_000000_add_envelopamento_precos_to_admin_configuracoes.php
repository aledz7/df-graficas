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
        Schema::table('admin_configuracoes', function (Blueprint $table) {
            // Preços padrão para serviços de envelopamento (por metro quadrado)
            $table->decimal('preco_aplicacao_envelopamento', 10, 2)->default(10.00)->after('notificacoes_config');
            $table->decimal('preco_remocao_envelopamento', 10, 2)->default(5.00)->after('preco_aplicacao_envelopamento');
            $table->decimal('preco_lixamento_envelopamento', 10, 2)->default(8.00)->after('preco_remocao_envelopamento');
            $table->decimal('preco_pelicula_envelopamento', 10, 2)->default(40.00)->after('preco_lixamento_envelopamento');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('admin_configuracoes', function (Blueprint $table) {
            $table->dropColumn([
                'preco_aplicacao_envelopamento',
                'preco_remocao_envelopamento',
                'preco_lixamento_envelopamento',
                'preco_pelicula_envelopamento'
            ]);
        });
    }
};


