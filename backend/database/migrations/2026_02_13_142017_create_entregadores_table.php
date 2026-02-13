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
        Schema::create('entregadores', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->onDelete('cascade');
            $table->string('nome');
            $table->string('telefone')->nullable();
            $table->enum('tipo', ['proprio', 'terceirizado'])->default('terceirizado');
            $table->decimal('valor_padrao_entrega', 10, 2)->nullable()->comment('Valor padrão por entrega');
            $table->string('chave_pix')->nullable();
            $table->foreignId('funcionario_id')->nullable()->constrained('users')->onDelete('set null')->comment('Se for próprio, vincular ao funcionário');
            $table->boolean('ativo')->default(true);
            $table->text('observacoes')->nullable();
            $table->timestamps();
            $table->softDeletes();
            
            $table->index(['tenant_id', 'ativo']);
            $table->index(['tenant_id', 'tipo']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('entregadores');
    }
};
