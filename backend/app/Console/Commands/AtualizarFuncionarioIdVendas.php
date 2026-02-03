<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Venda;
use App\Models\OrdemServico;
use App\Models\Funcionario;
use App\Models\User;

class AtualizarFuncionarioIdVendas extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'vendas:atualizar-funcionario-id';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Atualiza funcionario_id nas vendas e OS existentes baseado no usuario_id';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Iniciando atualização de funcionario_id...');
        
        // Atualizar vendas
        $this->atualizarVendas();
        
        // Atualizar ordens de serviço
        $this->atualizarOrdensServico();
        
        // Atualizar envelopamentos
        $this->atualizarEnvelopamentos();
        
        // Atualizar compromissos
        $this->atualizarCompromissos();
        
        $this->info('Atualização concluída!');
    }
    
    private function atualizarVendas()
    {
        $this->info('Atualizando vendas...');
        
        $vendas = Venda::whereNull('funcionario_id')
            ->whereNotNull('usuario_id')
            ->get();
            
        $atualizadas = 0;
        
        foreach ($vendas as $venda) {
            // Buscar funcionário pelo user_id
            $funcionario = Funcionario::where('user_id', $venda->usuario_id)
                ->where('tenant_id', $venda->tenant_id)
                ->where('status', true)
                ->first();
                
            if ($funcionario) {
                $venda->funcionario_id = $funcionario->id;
                // Também preencher vendedor_id se estiver NULL
                if (!$venda->vendedor_id) {
                    $venda->vendedor_id = $venda->usuario_id;
                    $venda->vendedor_nome = \App\Models\User::find($venda->usuario_id)->name ?? 'Usuário';
                }
                $venda->save();
                $atualizadas++;
                
                $this->line("Venda ID {$venda->id} atualizada com funcionario_id: {$funcionario->id} e vendedor_id: {$venda->vendedor_id}");
            } else {
                $this->warn("Funcionário não encontrado para venda ID {$venda->id} (usuario_id: {$venda->usuario_id})");
            }
        }
        
        $this->info("Vendas atualizadas: {$atualizadas}");
    }
    
    private function atualizarOrdensServico()
    {
        $this->info('Atualizando ordens de serviço...');
        
        $ordens = OrdemServico::whereNull('funcionario_id')
            ->whereNotNull('vendedor_id')
            ->get();
            
        $atualizadas = 0;
        
        foreach ($ordens as $os) {
            // Buscar funcionário pelo vendedor_id (que é o user_id)
            $funcionario = Funcionario::where('user_id', $os->vendedor_id)
                ->where('tenant_id', $os->tenant_id)
                ->where('status', true)
                ->first();
                
            if ($funcionario) {
                $os->funcionario_id = $funcionario->id;
                // vendedor_id já está preenchido nas OS, não precisa alterar
                $os->save();
                $atualizadas++;
                
                $this->line("OS ID {$os->id_os} atualizada com funcionario_id: {$funcionario->id}");
            } else {
                $this->warn("Funcionário não encontrado para OS ID {$os->id_os} (vendedor_id: {$os->vendedor_id})");
            }
        }
        
        $this->info("Ordens de serviço atualizadas: {$atualizadas}");
    }
    
    private function atualizarEnvelopamentos()
    {
        $this->info('Atualizando envelopamentos...');
        
        $envelopamentos = \App\Models\Envelopamento::whereNull('funcionario_id')
            ->whereNotNull('vendedor_id')
            ->get();
            
        $atualizadas = 0;
        
        foreach ($envelopamentos as $env) {
            // Buscar funcionário pelo vendedor_id (que é o user_id)
            $funcionario = Funcionario::where('user_id', $env->vendedor_id)
                ->where('tenant_id', $env->tenant_id)
                ->where('status', true)
                ->first();
                
            if ($funcionario) {
                $env->funcionario_id = $funcionario->id;
                $env->save();
                $atualizadas++;
                
                $this->line("Envelopamento ID {$env->id} atualizado com funcionario_id: {$funcionario->id}");
            } else {
                $this->warn("Funcionário não encontrado para envelopamento ID {$env->id} (vendedor_id: {$env->vendedor_id})");
            }
        }
        
        $this->info("Envelopamentos atualizados: {$atualizadas}");
    }
    
    private function atualizarCompromissos()
    {
        $this->info('Atualizando compromissos...');
        
        $compromissos = \App\Models\Compromisso::whereNull('funcionario_id')
            ->whereNotNull('user_id')
            ->get();
            
        $atualizadas = 0;
        
        foreach ($compromissos as $comp) {
            // Buscar funcionário pelo user_id
            $funcionario = Funcionario::where('user_id', $comp->user_id)
                ->where('tenant_id', $comp->tenant_id)
                ->where('status', true)
                ->first();
                
            if ($funcionario) {
                $comp->funcionario_id = $funcionario->id;
                $comp->save();
                $atualizadas++;
                
                $this->line("Compromisso ID {$comp->id} atualizado com funcionario_id: {$funcionario->id}");
            } else {
                $this->warn("Funcionário não encontrado para compromisso ID {$comp->id} (user_id: {$comp->user_id})");
            }
        }
        
        $this->info("Compromissos atualizados: {$atualizadas}");
    }
}
