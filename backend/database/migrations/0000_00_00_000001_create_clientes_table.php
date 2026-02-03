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
        Schema::create('clientes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->onDelete('cascade');
            $table->string('codigo_cliente', 20)->unique();
            $table->string('nome_completo');
            $table->string('apelido_fantasia')->nullable();
            $table->enum('tipo_pessoa', ['Pessoa Física', 'Pessoa Jurídica'])->default('Pessoa Física');
            $table->string('cpf_cnpj', 20)->nullable()->unique();
            $table->string('rg_ie', 20)->nullable();
            $table->date('data_nascimento_abertura')->nullable();
            $table->enum('sexo', ['Masculino', 'Feminino', 'Outro', 'Prefiro não informar'])->default('Prefiro não informar');
            $table->string('email')->nullable();
            $table->string('telefone_principal', 20);
            $table->string('whatsapp', 20)->nullable();
            
            // Endereço
            $table->string('cep', 10)->nullable();
            $table->string('logradouro')->nullable();
            $table->string('numero', 20)->nullable();
            $table->string('complemento', 100)->nullable();
            $table->string('bairro', 100)->nullable();
            $table->string('cidade', 100)->nullable();
            $table->char('estado', 2)->nullable();
            
            $table->text('observacoes')->nullable();
            $table->boolean('autorizado_prazo')->default(false);
            $table->boolean('status')->default(true);
            $table->string('foto_url')->nullable();
            $table->string('classificacao_cliente', 50)->default('Padrão');
            $table->decimal('desconto_fixo_os_terceirizado', 5, 2)->default(0);
            $table->boolean('is_terceirizado')->default(false);
            
            // Pontos de fidelidade
            $table->integer('total_pontos_ganhos')->default(0);
            $table->integer('pontos_utilizados')->default(0);
            $table->integer('pontos_expirados')->default(0);
            $table->integer('saldo_pontos_atual')->default(0);
            
            $table->json('metadados')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('clientes');
    }
};
