<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (Schema::hasTable('quick_actions')) {
            // Adicionar tenant_id se não existir
            if (!Schema::hasColumn('quick_actions', 'tenant_id')) {
                Schema::table('quick_actions', function (Blueprint $table) {
                    $table->unsignedBigInteger('tenant_id')->nullable()->after('id');
                });
                
                // Atribuir tenant_id para registros existentes (usar o primeiro tenant ou criar um padrão)
                $firstTenant = DB::table('tenants')->first();
                if ($firstTenant) {
                    DB::table('quick_actions')->whereNull('tenant_id')->update(['tenant_id' => $firstTenant->id]);
                }
                
                // Tornar tenant_id obrigatório
                Schema::table('quick_actions', function (Blueprint $table) {
                    $table->unsignedBigInteger('tenant_id')->nullable(false)->change();
                });
                
                // Adicionar foreign key
                Schema::table('quick_actions', function (Blueprint $table) {
                    $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
                });
            }
            
            // Remover unique do codigo e criar unique composto
            if (Schema::hasColumn('quick_actions', 'codigo')) {
                // Verificar se existe índice unique no codigo
                $indexes = DB::select("SHOW INDEX FROM quick_actions WHERE Column_name = 'codigo' AND Non_unique = 0");
                if (count($indexes) > 0) {
                    Schema::table('quick_actions', function (Blueprint $table) {
                        $table->dropUnique(['codigo']);
                    });
                }
                
                // Adicionar unique composto
                $compositeIndex = DB::select("SHOW INDEX FROM quick_actions WHERE Key_name = 'quick_actions_tenant_id_codigo_unique'");
                if (count($compositeIndex) === 0) {
                    Schema::table('quick_actions', function (Blueprint $table) {
                        $table->unique(['tenant_id', 'codigo']);
                    });
                }
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('quick_actions')) {
            // Remover foreign key
            Schema::table('quick_actions', function (Blueprint $table) {
                $table->dropForeign(['tenant_id']);
            });
            
            // Remover unique composto
            $compositeIndex = DB::select("SHOW INDEX FROM quick_actions WHERE Key_name = 'quick_actions_tenant_id_codigo_unique'");
            if (count($compositeIndex) > 0) {
                Schema::table('quick_actions', function (Blueprint $table) {
                    $table->dropUnique(['tenant_id', 'codigo']);
                });
            }
            
            // Remover coluna tenant_id
            if (Schema::hasColumn('quick_actions', 'tenant_id')) {
                Schema::table('quick_actions', function (Blueprint $table) {
                    $table->dropColumn('tenant_id');
                });
            }
            
            // Restaurar unique no codigo
            Schema::table('quick_actions', function (Blueprint $table) {
                $table->unique('codigo');
            });
        }
    }
};
