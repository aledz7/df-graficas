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
        Schema::create('categorias', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->onDelete('cascade');
            $table->string('nome');
            $table->string('tipo')->default('produto'); // produto, servico, etc.
            $table->string('icone')->nullable();
            $table->string('cor')->default('#3b82f6'); // Cor padrão azio
            $table->boolean('ativo')->default(true);
            $table->integer('ordem')->default(0);
            $table->string('slug');
            $table->text('descricao')->nullable();
            $table->string('imagem')->nullable();
            $table->json('metadados')->nullable();
            $table->timestamps();
            $table->softDeletes();
            
            // Unique constraint per tenant
            $table->unique(['tenant_id', 'slug']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('categorias');
    }
};
