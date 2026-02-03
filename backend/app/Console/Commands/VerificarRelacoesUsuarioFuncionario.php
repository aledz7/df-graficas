<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\User;
use App\Models\Funcionario;

class VerificarRelacoesUsuarioFuncionario extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'relacoes:verificar {--corrigir : Corrigir relações automaticamente}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Verificar e corrigir relações entre usuários e funcionários';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('🔍 Verificando relações entre usuários e funcionários...');

        $users = User::all();
        $funcionarios = Funcionario::all();

        $this->info("\n📋 Usuários encontrados:");
        foreach ($users as $user) {
            $funcionario = Funcionario::where('user_id', $user->id)->first();
            $status = $funcionario ? "✅ Relacionado com funcionário ID: {$funcionario->id}" : "❌ Sem funcionário relacionado";
            $this->line("  ID: {$user->id} | Nome: {$user->name} | Email: {$user->email} | {$status}");
        }

        $this->info("\n👥 Funcionários encontrados:");
        foreach ($funcionarios as $funcionario) {
            $user = User::find($funcionario->user_id);
            $status = $user ? "✅ Relacionado com usuário ID: {$user->id}" : "❌ Sem usuário relacionado";
            $this->line("  ID: {$funcionario->id} | Nome: {$funcionario->nome} | Email: {$funcionario->email} | {$status}");
        }

        // Verificar funcionários sem user_id
        $funcionariosSemUser = Funcionario::whereNull('user_id')->get();
        if ($funcionariosSemUser->count() > 0) {
            $this->warn("\n⚠️  Funcionários sem user_id:");
            foreach ($funcionariosSemUser as $funcionario) {
                $this->line("  ID: {$funcionario->id} | Nome: {$funcionario->nome} | Email: {$funcionario->email}");
            }

            if ($this->option('corrigir')) {
                $this->info("\n🔧 Corrigindo relações...");
                foreach ($funcionariosSemUser as $funcionario) {
                    $user = User::where('email', $funcionario->email)->first();
                    if ($user) {
                        $funcionario->user_id = $user->id;
                        $funcionario->save();
                        $this->info("  ✅ Funcionário {$funcionario->nome} relacionado com usuário {$user->name}");
                    } else {
                        $this->error("  ❌ Usuário não encontrado para funcionário {$funcionario->nome}");
                    }
                }
            }
        }

        // Verificar usuários sem funcionário
        $usersSemFuncionario = User::whereDoesntHave('funcionario')->get();
        if ($usersSemFuncionario->count() > 0) {
            $this->warn("\n⚠️  Usuários sem funcionário relacionado:");
            foreach ($usersSemFuncionario as $user) {
                $this->line("  ID: {$user->id} | Nome: {$user->name} | Email: {$user->email}");
            }
        }

        $this->info("\n✅ Verificação concluída!");
    }
}
