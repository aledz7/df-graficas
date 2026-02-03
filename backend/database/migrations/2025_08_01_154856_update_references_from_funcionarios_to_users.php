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
        // Atualizar comissões_os para usar user_id em vez de funcionario_id
        if (Schema::hasTable('comissoes_os')) {
            // Migrar dados: funcionario_id -> user_id
            $comissoes = DB::table('comissoes_os')->get();
            foreach ($comissoes as $comissao) {
                $funcionario = DB::table('funcionarios')->find($comissao->funcionario_id);
                if ($funcionario) {
                    $user = DB::table('users')->where('email', $funcionario->email)->first();
                    if ($user) {
                        DB::table('comissoes_os')
                            ->where('id', $comissao->id)
                            ->update(['user_id' => $user->id]);
                    }
                }
            }
            
            // Manter ambas as colunas por enquanto para compatibilidade
            // A remoção será feita em uma migração separada
        }
        
        // Atualizar ordens_servico para usar user_id em vez de vendedor_id
        if (Schema::hasTable('ordens_servico')) {
            // vendedor_id já é user_id, então não precisa mudar
            // Apenas garantir que os dados estão corretos
        }
        
        // Atualizar outras tabelas que referenciam funcionarios
        // (compromissos já tem user_id, então não precisa mudar)
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Não é possível reverter esta migração de forma segura
        // Os dados já foram migrados e podem ter sido modificados
    }
};
