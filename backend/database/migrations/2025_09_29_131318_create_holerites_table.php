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
        if (Schema::hasTable('holerites')) {
            return;
        }
        
        Schema::create('holerites', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->onDelete('cascade');
            $table->foreignId('funcionario_id')->constrained('users')->onDelete('cascade');
            
            // Período do holerite
            $table->integer('mes');
            $table->integer('ano');
            
            // Dados do funcionário no momento do fechamento
            $table->decimal('salario_base', 10, 2);
            $table->json('vales')->nullable(); // Array de vales do mês
            $table->json('faltas')->nullable(); // Array de faltas do mês
            $table->decimal('total_vales', 10, 2)->default(0);
            $table->integer('total_faltas')->default(0);
            $table->decimal('desconto_faltas', 10, 2)->default(0);
            
            // Cálculos do holerite
            $table->decimal('salario_bruto', 10, 2);
            $table->decimal('total_descontos', 10, 2)->default(0);
            $table->decimal('salario_liquido', 10, 2);
            
            // Comissões (se aplicável)
            $table->decimal('comissao_dropshipping', 10, 2)->default(0);
            $table->decimal('comissao_servicos', 10, 2)->default(0);
            $table->decimal('total_comissoes', 10, 2)->default(0);
            
            // Status do holerite
            $table->boolean('fechado')->default(true);
            $table->timestamp('data_fechamento');
            $table->foreignId('usuario_fechamento_id')->nullable()->constrained('users')->onDelete('set null');
            
            // Observações
            $table->text('observacoes')->nullable();
            
            $table->timestamps();
            
            // Índices
            $table->index(['tenant_id', 'funcionario_id']);
            $table->index(['tenant_id', 'mes', 'ano']);
            $table->unique(['tenant_id', 'funcionario_id', 'mes', 'ano']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('holerites');
    }
};
