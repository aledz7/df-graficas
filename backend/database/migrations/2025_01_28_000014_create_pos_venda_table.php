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
        if (Schema::hasTable('pos_venda')) {
            return;
        }

        Schema::create('pos_venda', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('tenant_id');
            $table->unsignedBigInteger('cliente_id');
            $table->unsignedBigInteger('venda_id')->nullable(); // Pode ser venda ou OS
            $table->unsignedBigInteger('vendedor_id')->nullable(); // Vendedor responsável pela venda
            $table->unsignedBigInteger('responsavel_atual_id'); // Usuário responsável pelo pós-venda
            $table->enum('tipo', ['satisfacao', 'reclamacao', 'elogio', 'ajuste_retrabalho', 'nova_oportunidade', 'outro'])->default('satisfacao');
            $table->text('observacao');
            $table->integer('nota_satisfacao')->nullable()->comment('Nota de 1 a 5');
            $table->enum('status', ['pendente', 'em_andamento', 'resolvido'])->default('pendente');
            $table->dateTime('data_abertura');
            $table->dateTime('data_resolucao')->nullable();
            $table->unsignedBigInteger('usuario_abertura_id');
            $table->unsignedBigInteger('usuario_resolucao_id')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
            $table->foreign('cliente_id')->references('id')->on('clientes')->onDelete('cascade');
            $table->foreign('venda_id')->references('id')->on('vendas')->onDelete('set null');
            $table->foreign('vendedor_id')->references('id')->on('users')->onDelete('set null');
            $table->foreign('responsavel_atual_id')->references('id')->on('users')->onDelete('restrict');
            $table->foreign('usuario_abertura_id')->references('id')->on('users')->onDelete('restrict');
            $table->foreign('usuario_resolucao_id')->references('id')->on('users')->onDelete('set null');
            
            $table->index(['tenant_id', 'cliente_id']);
            $table->index(['tenant_id', 'vendedor_id']);
            $table->index(['tenant_id', 'status']);
            $table->index(['tenant_id', 'tipo']);
            $table->index(['tenant_id', 'data_abertura']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('pos_venda');
    }
};
