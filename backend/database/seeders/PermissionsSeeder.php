<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;

class PermissionsSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Permissões padrão para administradores
        $adminPermissions = [
            'dashboard' => true,
            'usuarios' => true,
            'funcionarios' => true,
            'clientes' => true,
            'produtos' => true,
            'categorias' => true,
            'subcategorias' => true,
            'vendas' => true,
            'pdv' => true,
            'orcamentos' => true,
            'contas_receber' => true,
            'contas_pagar' => true,
            'caixa' => true,
            'lancamentos_caixa' => true,
            'relatorios' => true,
            'configuracoes' => true,
            'empresa' => true,
            'ordens_servico' => true,
            'envelopamentos' => true,
            'marketplace' => true,
            'comissoes' => true,
            'compromissos' => true,
            'notificacoes' => true,
            'backup' => true,
            'admin_config' => true,
            'salarios' => true,
            'historico_salarios' => true,
            'relatorios_salarios' => true,
        ];

        // Permissões padrão para funcionários
        $funcionarioPermissions = [
            'dashboard' => true,
            'pdv' => true,
            'vendas' => true,
            'clientes' => true,
            'produtos' => true,
            'orcamentos' => true,
            'ordens_servico' => true,
            'envelopamentos' => true,
            'comissoes' => true,
            'compromissos' => true,
            'notificacoes' => true,
        ];

        // Atualizar usuários admin
        $adminUsers = User::where('is_admin', true)->get();
        foreach ($adminUsers as $user) {
            $user->update(['permissions' => $adminPermissions]);
        }

        // Atualizar usuários não-admin (funcionários)
        $funcionarios = User::where('is_admin', false)->get();
        foreach ($funcionarios as $user) {
            $user->update(['permissions' => $funcionarioPermissions]);
        }

        $this->command->info('Permissões configuradas com sucesso!');
        $this->command->info('Administradores: ' . $adminUsers->count() . ' usuários');
        $this->command->info('Funcionários: ' . $funcionarios->count() . ' usuários');
    }
} 