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
        Schema::create('pos_venda_agendamentos', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('tenant_id');
            $table->unsignedBigInteger('pos_venda_id');
            $table->unsignedBigInteger('responsavel_id');
            $table->dateTime('data_agendamento');
            $table->text('observacao')->nullable();
            $table->boolean('concluido')->default(false);
            $table->dateTime('data_conclusao')->nullable();
            $table->unsignedBigInteger('usuario_conclusao_id')->nullable();
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
            $table->foreign('pos_venda_id')->references('id')->on('pos_venda')->onDelete('cascade');
            $table->foreign('responsavel_id')->references('id')->on('users')->onDelete('restrict');
            $table->foreign('usuario_conclusao_id')->references('id')->on('users')->onDelete('set null');
            
            $table->index(['tenant_id', 'pos_venda_id']);
            $table->index(['tenant_id', 'responsavel_id']);
            $table->index(['tenant_id', 'data_agendamento', 'concluido'], 'idx_pos_venda_agend_tenant_data_concl');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('pos_venda_agendamentos');
    }
};
