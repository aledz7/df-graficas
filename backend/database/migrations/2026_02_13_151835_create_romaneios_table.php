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
        Schema::create('romaneios', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->onDelete('cascade');
            $table->string('numero_romaneio', 50)->unique();
            $table->foreignId('entregador_id')->nullable()->constrained('entregadores')->onDelete('set null');
            $table->date('data_romaneio');
            $table->time('hora_saida')->nullable();
            $table->time('hora_retorno')->nullable();
            $table->enum('status', ['aberto', 'em_rota', 'finalizado', 'cancelado'])->default('aberto');
            $table->integer('quantidade_entregas')->default(0);
            $table->integer('entregas_realizadas')->default(0);
            $table->integer('entregas_pendentes')->default(0);
            $table->text('observacoes')->nullable();
            $table->json('rota_sugerida')->nullable()->comment('Ordem sugerida dos endereços');
            $table->decimal('distancia_total_km', 10, 2)->nullable();
            $table->integer('tempo_estimado_minutos')->nullable();
            $table->string('endereco_origem', 255)->nullable()->comment('Endereço da gráfica (ponto de partida)');
            $table->foreignId('usuario_criacao_id')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamps();
            $table->softDeletes();
            
            $table->index(['tenant_id', 'data_romaneio']);
            $table->index(['entregador_id', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('romaneios');
    }
};
