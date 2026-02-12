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
        Schema::create('pos_venda_transferencias', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('tenant_id');
            $table->unsignedBigInteger('pos_venda_id');
            $table->unsignedBigInteger('usuario_origem_id');
            $table->unsignedBigInteger('usuario_destino_id');
            $table->text('motivo');
            $table->unsignedBigInteger('usuario_transferencia_id');
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
            $table->foreign('pos_venda_id')->references('id')->on('pos_venda')->onDelete('cascade');
            $table->foreign('usuario_origem_id')->references('id')->on('users')->onDelete('restrict');
            $table->foreign('usuario_destino_id')->references('id')->on('users')->onDelete('restrict');
            $table->foreign('usuario_transferencia_id')->references('id')->on('users')->onDelete('restrict');
            
            $table->index(['tenant_id', 'pos_venda_id']);
            $table->index(['tenant_id', 'usuario_destino_id']);
            $table->index(['pos_venda_id', 'created_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('pos_venda_transferencias');
    }
};
