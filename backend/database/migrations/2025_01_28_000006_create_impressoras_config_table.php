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
        if (Schema::hasTable('impressoras_config')) {
            return;
        }

        Schema::create('impressoras_config', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->onDelete('cascade');
            $table->string('nome')->comment('Nome da impressora ou configuração');
            $table->decimal('margem_superior_mm', 5, 2)->default(0)->comment('Margem superior não imprimível em mm');
            $table->decimal('margem_inferior_mm', 5, 2)->default(0)->comment('Margem inferior não imprimível em mm');
            $table->decimal('margem_esquerda_mm', 5, 2)->default(0)->comment('Margem esquerda não imprimível em mm');
            $table->decimal('margem_direita_mm', 5, 2)->default(0)->comment('Margem direita não imprimível em mm');
            $table->boolean('padrao')->default(false)->comment('Se é a configuração padrão');
            $table->boolean('ativo')->default(true);
            $table->timestamps();
            $table->softDeletes();

            // Índices
            $table->index(['tenant_id', 'ativo']);
            $table->index(['tenant_id', 'padrao']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('impressoras_config');
    }
};
