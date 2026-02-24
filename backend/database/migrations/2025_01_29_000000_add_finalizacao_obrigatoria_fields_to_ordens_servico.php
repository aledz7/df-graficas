<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (!Schema::hasTable('ordens_servico')) {
            return;
        }

        Schema::table('ordens_servico', function (Blueprint $table) {
            // Arte pronta
            if (!Schema::hasColumn('ordens_servico', 'tem_arte_pronta')) {
                $table->boolean('tem_arte_pronta')->nullable()->after('observacoes_gerais_os');
            }
            
            // Destino da OS
            if (!Schema::hasColumn('ordens_servico', 'destino_os')) {
                $table->enum('destino_os', ['CRIACAO', 'PRODUCAO'])->nullable()->after('tem_arte_pronta');
            }
            
            // Tipo de prazo
            if (!Schema::hasColumn('ordens_servico', 'prazo_tipo')) {
                $table->enum('prazo_tipo', ['PADRAO', 'ESPECIFICO'])->nullable()->after('destino_os');
            }
            
            // Data e hora do prazo específico
            if (!Schema::hasColumn('ordens_servico', 'prazo_datahora')) {
                $table->timestamp('prazo_datahora')->nullable()->after('prazo_tipo');
            }
            
            // Responsável pela criação (se destino for CRIACAO)
            if (!Schema::hasColumn('ordens_servico', 'responsavel_criacao')) {
                $table->unsignedBigInteger('responsavel_criacao')->nullable()->after('prazo_datahora');
            }
        });

        // Garante FK somente se ainda não existir
        $fkExists = DB::selectOne("
            SELECT CONSTRAINT_NAME
            FROM information_schema.KEY_COLUMN_USAGE
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = 'ordens_servico'
              AND COLUMN_NAME = 'responsavel_criacao'
              AND REFERENCED_TABLE_NAME IS NOT NULL
            LIMIT 1
        ");

        if (!$fkExists && Schema::hasColumn('ordens_servico', 'responsavel_criacao') && Schema::hasTable('users')) {
            Schema::table('ordens_servico', function (Blueprint $table) {
                $table->foreign('responsavel_criacao')->references('id')->on('users')->onDelete('set null');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (!Schema::hasTable('ordens_servico')) {
            return;
        }

        $fkExists = DB::selectOne("
            SELECT CONSTRAINT_NAME
            FROM information_schema.KEY_COLUMN_USAGE
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = 'ordens_servico'
              AND COLUMN_NAME = 'responsavel_criacao'
              AND REFERENCED_TABLE_NAME IS NOT NULL
            LIMIT 1
        ");

        Schema::table('ordens_servico', function (Blueprint $table) use ($fkExists) {
            if ($fkExists && Schema::hasColumn('ordens_servico', 'responsavel_criacao')) {
                $table->dropForeign(['responsavel_criacao']);
            }

            if (Schema::hasColumn('ordens_servico', 'responsavel_criacao')) {
                $table->dropColumn('responsavel_criacao');
            }
            if (Schema::hasColumn('ordens_servico', 'prazo_datahora')) {
                $table->dropColumn('prazo_datahora');
            }
            if (Schema::hasColumn('ordens_servico', 'prazo_tipo')) {
                $table->dropColumn('prazo_tipo');
            }
            if (Schema::hasColumn('ordens_servico', 'destino_os')) {
                $table->dropColumn('destino_os');
            }
            if (Schema::hasColumn('ordens_servico', 'tem_arte_pronta')) {
                $table->dropColumn('tem_arte_pronta');
            }
        });
    }
};
