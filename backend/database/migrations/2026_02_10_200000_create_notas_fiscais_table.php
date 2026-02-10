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
        Schema::create('notas_fiscais', function (Blueprint $table) {
            $table->id();
            $table->string('tenant_id');
            $table->unsignedBigInteger('ordem_servico_id')->nullable();
            
            // Tipo e Referência
            $table->enum('tipo', ['nfe', 'nfse'])->default('nfe');
            $table->string('referencia')->unique(); // Referência única na API externa
            
            // Dados da nota autorizada
            $table->integer('numero')->nullable();
            $table->string('serie', 10)->nullable();
            $table->enum('status', [
                'processando_autorizacao',
                'autorizada',
                'erro_autorizacao',
                'cancelada'
            ])->default('processando_autorizacao');
            
            // Chaves e protocolos
            $table->string('chave_nfe', 50)->nullable();
            $table->string('protocolo', 50)->nullable();
            
            // URLs e caminhos
            $table->text('caminho_xml_nota_fiscal')->nullable();
            $table->text('caminho_danfe')->nullable();
            $table->text('url_nota_fiscal')->nullable();
            
            // Valores
            $table->decimal('valor_total', 15, 2)->default(0);
            
            // Payloads completos (para debug e auditoria)
            $table->json('dados_envio')->nullable();
            $table->json('dados_retorno')->nullable();
            
            // Erro
            $table->text('mensagem_erro')->nullable();
            
            // Datas
            $table->dateTime('data_emissao')->nullable();
            $table->dateTime('data_cancelamento')->nullable();
            $table->string('justificativa_cancelamento')->nullable();
            
            // Auditoria
            $table->foreignId('usuario_cadastro_id')->nullable()->constrained('users')->onDelete('set null');
            $table->foreignId('usuario_alteracao_id')->nullable()->constrained('users')->onDelete('set null');
            
            $table->timestamps();
            $table->softDeletes();
            
            // Foreign keys
            $table->foreign('ordem_servico_id')->references('id')->on('ordens_servico')->onDelete('set null');
            
            // Índices
            $table->index(['tenant_id']);
            $table->index(['tenant_id', 'ordem_servico_id']);
            $table->index(['tenant_id', 'status']);
            $table->index(['tenant_id', 'tipo']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('notas_fiscais');
    }
};
