<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\Empresa;
use App\Models\Tenant;

class EmpresaSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Buscar todos os tenants existentes
        $tenants = Tenant::all();
        
        foreach ($tenants as $tenant) {
            // Verificar se já existe uma empresa para este tenant
            $empresaExistente = Empresa::where('tenant_id', $tenant->id)->first();
            
            if (!$empresaExistente) {
                Empresa::create([
                    'tenant_id' => $tenant->id,
                    'nome_fantasia' => 'Sua Empresa',
                    'razao_social' => '',
                    'cnpj' => '',
                    'inscricao_estadual' => '',
                    'inscricao_municipal' => '',
                    'email' => 'contato@suaempresa.com',
                    'telefone' => '',
                    'whatsapp' => '',
                    'endereco_completo' => '',
                    'instagram' => '',
                    'site' => '',
                    'logo_url' => null,
                    'nome_sistema' => 'GráficaPro',
                    'mensagem_rodape' => 'Obrigado pela preferência!',
                    'senha_supervisor' => null,
                    'termos_servico' => 'Termos de serviço padrão da empresa...',
                    'politica_privacidade' => 'Política de privacidade padrão da empresa...',
                    'usuario_cadastro_id' => null,
                    'usuario_alteracao_id' => null,
                ]);
                
                $this->command->info("Empresa criada para o tenant: {$tenant->nome}");
            } else {
                $this->command->info("Empresa já existe para o tenant: {$tenant->nome}");
            }
        }
    }
}
