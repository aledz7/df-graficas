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
        if (Schema::hasTable('termometro_config')) {
            return;
        }

        Schema::create('termometro_config', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('tenant_id');
            $table->json('usuarios_permitidos')->nullable(); // Array de user_ids que podem ver o termômetro
            $table->boolean('todos_usuarios')->default(false); // Se true, todos podem ver
            $table->boolean('apenas_admin')->default(true); // Se true, apenas admins podem ver
            $table->json('configuracoes_limites')->nullable(); // Limites personalizados para cada indicador
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
            $table->unique('tenant_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('termometro_config');
    }
};
