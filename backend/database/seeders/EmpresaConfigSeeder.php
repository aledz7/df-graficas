<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Configuracao;
use App\Models\Tenant;

class EmpresaConfigSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Obter o ID do primeiro tenant (assumindo que existe pelo menos um)
        $tenant = Tenant::first();
        
        if (!$tenant) {
            $this->command->error('Nenhum tenant encontrado. Execute o DatabaseSeeder principal primeiro.');
            return;
        }
        
        $tenant_id = $tenant->id;
        $configuracoes = [
            [
                'chave' => 'empresa_nome',
                'valor' => 'Sistema Gráficasssões',
                'tipo' => 'string',
                'grupo' => 'empresa',
                'nome' => 'Nome da Empresa',
                'descricao' => 'Nome completo da empresa',
                'editavel' => true,
                'visivel' => true,
                'ordem' => 1
            ],
            [
                'chave' => 'empresa_cnpj',
                'valor' => '',
                'tipo' => 'string',
                'grupo' => 'empresa',
                'nome' => 'CNPJ',
                'descricao' => 'CNPJ da empresa',
                'editavel' => true,
                'visivel' => true,
                'ordem' => 2
            ],
            [
                'chave' => 'empresa_endereco',
                'valor' => '',
                'tipo' => 'string',
                'grupo' => 'empresa',
                'nome' => 'Endereço',
                'descricao' => 'Endereço completo da empresa',
                'editavel' => true,
                'visivel' => true,
                'ordem' => 3
            ],
            [
                'chave' => 'empresa_telefone',
                'valor' => '',
                'tipo' => 'string',
                'grupo' => 'empresa',
                'nome' => 'Telefone',
                'descricao' => 'Telefone principal da empresa',
                'editavel' => true,
                'visivel' => true,
                'ordem' => 4
            ],
            [
                'chave' => 'empresa_email',
                'valor' => '',
                'tipo' => 'string',
                'grupo' => 'empresa',
                'nome' => 'E-mail',
                'descricao' => 'E-mail principal da empresa',
                'editavel' => true,
                'visivel' => true,
                'ordem' => 5
            ],
            [
                'chave' => 'empresa_logo',
                'valor' => '',
                'tipo' => 'string',
                'grupo' => 'empresa',
                'nome' => 'Logo',
                'descricao' => 'URL da logo da empresa',
                'editavel' => true,
                'visivel' => true,
                'ordem' => 6
            ],
            [
                'chave' => 'empresa_site',
                'valor' => '',
                'tipo' => 'string',
                'grupo' => 'empresa',
                'nome' => 'Site',
                'descricao' => 'Site da empresa',
                'editavel' => true,
                'visivel' => true,
                'ordem' => 7
            ],
        ];

        foreach ($configuracoes as $config) {
            // Adicionar tenant_id a cada configuração
            $config['tenant_id'] = $tenant_id;
            
            Configuracao::updateOrCreate(
                ['chave' => $config['chave'], 'tenant_id' => $tenant_id],
                $config
            );
        }
    }
}
