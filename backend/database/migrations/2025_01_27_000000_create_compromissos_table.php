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
        Schema::create('compromissos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->onDelete('cascade');
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->string('title');
            $table->dateTime('start');
            $table->dateTime('end');
            $table->boolean('all_day')->default(false);
            $table->foreignId('cliente_id')->nullable()->constrained('clientes')->onDelete('set null');
            $table->foreignId('funcionario_id')->nullable()->constrained('users')->onDelete('set null');
            $table->text('observacoes')->nullable();
            $table->string('status')->default('agendado'); // agendado, confirmado, cancelado, realizado
            $table->string('cor')->nullable(); // cor do evento no calendário
            $table->string('local')->nullable(); // local do compromisso
            $table->text('descricao')->nullable(); // descrição detalhada
            $table->json('metadados')->nullable(); // dados adicionais em formato JSON
            $table->timestamps();
            $table->softDeletes();

            // Índices
            $table->index(['tenant_id', 'start']);
            $table->index(['tenant_id', 'cliente_id']);
            $table->index(['tenant_id', 'funcionario_id']);
            $table->index(['tenant_id', 'status']);
            $table->index(['start', 'end']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('compromissos');
    }
}; 