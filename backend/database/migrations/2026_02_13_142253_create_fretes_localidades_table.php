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
        if (Schema::hasTable('fretes_localidades')) {
            return;
        }

        Schema::create('fretes_localidades', function (Blueprint $table) {
            $table->id();
            $table->foreignId('opcao_frete_id')->constrained('opcoes_frete')->onDelete('cascade');
            $table->string('estado', 2)->nullable();
            $table->string('cidade')->nullable();
            $table->string('bairro')->nullable();
            $table->timestamps();
            
            $table->index(['opcao_frete_id']);
            $table->index(['estado', 'cidade', 'bairro']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('fretes_localidades');
    }
};
