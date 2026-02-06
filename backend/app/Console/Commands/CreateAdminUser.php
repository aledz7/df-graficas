<?php

namespace App\Console\Commands;

use App\Models\User;
use App\Models\Tenant;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;

class CreateAdminUser extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'admin:create 
                            {email? : O email do administrador}
                            {password? : A senha do administrador}
                            {--name= : O nome do administrador}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Cria um novo usuário administrador do sistema (super admin para gerenciar tenants)';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('');
        $this->info('╔══════════════════════════════════════════════════════════════╗');
        $this->info('║           CRIAÇÃO DE ADMINISTRADOR DO SISTEMA                ║');
        $this->info('║   Este usuário terá acesso ao painel de gestão de tenants    ║');
        $this->info('╚══════════════════════════════════════════════════════════════╝');
        $this->info('');

        // Obter ou solicitar email
        $email = $this->argument('email');
        if (!$email) {
            $email = $this->ask('Email do administrador');
        }

        // Validar email
        $validator = Validator::make(['email' => $email], [
            'email' => 'required|email',
        ]);

        if ($validator->fails()) {
            $this->error('Email inválido: ' . $email);
            return 1;
        }

        // Verificar se já existe
        $existingUser = User::where('email', $email)->first();
        if ($existingUser) {
            if ($existingUser->is_admin) {
                $this->warn('Este email já está cadastrado como administrador.');
                
                if ($this->confirm('Deseja atualizar a senha deste administrador?')) {
                    $password = $this->argument('password') ?? $this->secret('Nova senha');
                    
                    if (strlen($password) < 6) {
                        $this->error('A senha deve ter pelo menos 6 caracteres.');
                        return 1;
                    }
                    
                    $existingUser->password = Hash::make($password);
                    $existingUser->save();
                    
                    $this->info('');
                    $this->info('✓ Senha do administrador atualizada com sucesso!');
                    return 0;
                }
                
                return 0;
            } else {
                $this->warn('Este email já está cadastrado como usuário comum.');
                
                if ($this->confirm('Deseja promover este usuário a administrador?')) {
                    $existingUser->is_admin = true;
                    $existingUser->save();
                    
                    $this->info('');
                    $this->info('✓ Usuário promovido a administrador com sucesso!');
                    $this->info('  Email: ' . $existingUser->email);
                    return 0;
                }
                
                return 0;
            }
        }

        // Obter nome
        $name = $this->option('name');
        if (!$name) {
            $name = $this->ask('Nome do administrador', 'Administrador');
        }

        // Obter senha
        $password = $this->argument('password');
        if (!$password) {
            $password = $this->secret('Senha (mínimo 6 caracteres)');
        }

        if (strlen($password) < 6) {
            $this->error('A senha deve ter pelo menos 6 caracteres.');
            return 1;
        }

        // Obter ou criar tenant admin (opcional)
        $tenant = Tenant::where('nome', 'Sistema Admin')->first();
        if (!$tenant) {
            $tenant = Tenant::create([
                'nome' => 'Sistema Admin',
                'email' => $email,
                'ativo' => true,
                'plano' => 'admin',
            ]);
            $this->info('Tenant "Sistema Admin" criado.');
        }

        // Criar o administrador
        $admin = User::create([
            'name' => $name,
            'email' => $email,
            'password' => Hash::make($password),
            'is_admin' => true,
            'is_active' => true,
            'tenant_id' => $tenant->id,
            'theme' => 'light',
        ]);

        $this->info('');
        $this->info('╔══════════════════════════════════════════════════════════════╗');
        $this->info('║              ADMINISTRADOR CRIADO COM SUCESSO!               ║');
        $this->info('╚══════════════════════════════════════════════════════════════╝');
        $this->info('');
        $this->table(
            ['Campo', 'Valor'],
            [
                ['ID', $admin->id],
                ['Nome', $admin->name],
                ['Email', $admin->email],
                ['Tipo', 'Super Administrador'],
                ['Acesso', '/admin/login'],
            ]
        );
        $this->info('');
        $this->warn('⚠️  Guarde a senha em local seguro. Ela não será exibida novamente.');
        $this->info('');

        return 0;
    }
}
