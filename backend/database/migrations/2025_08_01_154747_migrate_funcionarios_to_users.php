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
        // Migrar dados dos funcionários para users
        $funcionarios = DB::table('funcionarios')->get();
        
        foreach ($funcionarios as $funcionario) {
            // Verificar se já existe um user com o mesmo email
            $existingUser = DB::table('users')->where('email', $funcionario->email)->first();
            
            if ($existingUser) {
                // Atualizar user existente com dados do funcionário
                DB::table('users')->where('id', $existingUser->id)->update([
                    'data_nascimento' => $funcionario->data_nascimento,
                    'cpf' => $funcionario->cpf,
                    'rg' => $funcionario->rg,
                    'emissor_rg' => $funcionario->emissor_rg,
                    'cep' => $funcionario->cep,
                    'endereco' => $funcionario->endereco,
                    'numero' => $funcionario->numero,
                    'complemento' => $funcionario->complemento,
                    'bairro' => $funcionario->bairro,
                    'cidade' => $funcionario->cidade,
                    'uf' => $funcionario->uf,
                    'cargo' => $funcionario->cargo,
                    'telefone' => $funcionario->telefone,
                    'whatsapp' => $funcionario->whatsapp,
                    'celular' => $funcionario->celular,
                    'comissao_dropshipping' => $funcionario->comissao_dropshipping,
                    'comissao_servicos' => $funcionario->comissao_servicos,
                    'permite_receber_comissao' => $funcionario->permite_receber_comissao,
                    'salario_base' => $funcionario->salario_base,
                    'vales' => $funcionario->vales,
                    'faltas' => $funcionario->faltas,
                    'permissions' => $funcionario->permissions,
                    'login' => $funcionario->login,
                    'senha' => $funcionario->senha,
                    'status' => $funcionario->status,
                    'foto_url' => $funcionario->foto_url,
                    'usuario_cadastro_id' => $funcionario->usuario_cadastro_id,
                    'usuario_alteracao_id' => $funcionario->usuario_alteracao_id,
                    'updated_at' => now(),
                ]);
            } else {
                // Criar novo user com dados do funcionário
                DB::table('users')->insert([
                    'tenant_id' => $funcionario->tenant_id,
                    'name' => $funcionario->nome,
                    'email' => $funcionario->email,
                    'password' => bcrypt($funcionario->senha ?? 'password123'),
                    'data_nascimento' => $funcionario->data_nascimento,
                    'cpf' => $funcionario->cpf,
                    'rg' => $funcionario->rg,
                    'emissor_rg' => $funcionario->emissor_rg,
                    'cep' => $funcionario->cep,
                    'endereco' => $funcionario->endereco,
                    'numero' => $funcionario->numero,
                    'complemento' => $funcionario->complemento,
                    'bairro' => $funcionario->bairro,
                    'cidade' => $funcionario->cidade,
                    'uf' => $funcionario->uf,
                    'cargo' => $funcionario->cargo,
                    'telefone' => $funcionario->telefone,
                    'whatsapp' => $funcionario->whatsapp,
                    'celular' => $funcionario->celular,
                    'comissao_dropshipping' => $funcionario->comissao_dropshipping,
                    'comissao_servicos' => $funcionario->comissao_servicos,
                    'permite_receber_comissao' => $funcionario->permite_receber_comissao,
                    'salario_base' => $funcionario->salario_base,
                    'vales' => $funcionario->vales,
                    'faltas' => $funcionario->faltas,
                    'permissions' => $funcionario->permissions,
                    'login' => $funcionario->login,
                    'senha' => $funcionario->senha,
                    'status' => $funcionario->status,
                    'foto_url' => $funcionario->foto_url,
                    'usuario_cadastro_id' => $funcionario->usuario_cadastro_id,
                    'usuario_alteracao_id' => $funcionario->usuario_alteracao_id,
                    'created_at' => $funcionario->created_at,
                    'updated_at' => $funcionario->updated_at,
                ]);
            }
        }
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
