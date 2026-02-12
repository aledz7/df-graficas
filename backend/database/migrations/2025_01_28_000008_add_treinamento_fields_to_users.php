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
        Schema::table('users', function (Blueprint $table) {
            $table->enum('setor', ['atendimento', 'vendas', 'producao', 'design', 'financeiro', 'geral'])->nullable()->after('cargo');
            $table->enum('nivel_treinamento_liberado', ['iniciante', 'intermediario', 'avancado'])->default('iniciante')->after('setor');
            $table->decimal('progresso_treinamento', 5, 2)->default(0)->comment('Percentual de progresso no treinamento')->after('nivel_treinamento_liberado');
            $table->timestamp('ultimo_acesso_treinamento')->nullable()->after('progresso_treinamento');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['setor', 'nivel_treinamento_liberado', 'progresso_treinamento', 'ultimo_acesso_treinamento']);
        });
    }
};
