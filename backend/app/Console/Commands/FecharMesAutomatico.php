<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Tenant;
use App\Models\ConfiguracaoFechamentoMes;
use App\Models\User;
use App\Models\Holerite;
use App\Models\HistoricoFechamentoMes;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class FecharMesAutomatico extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'funcionarios:fechar-mes-automatico {--forcar : Força o fechamento mesmo que o dia não corresponda} {--ignorar-mes-anterior : Ignora a verificação do mês anterior}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Verifica e fecha automaticamente o mês para tenants com fechamento automático configurado';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('========================================');
        $this->info('Iniciando verificação de fechamento automático de mês...');
        $this->info('========================================');

        $hoje = Carbon::now();
        $diaAtual = $hoje->day;
        $mesAtual = $hoje->month;
        $anoAtual = $hoje->year;

        $this->info("Data atual: {$diaAtual}/{$mesAtual}/{$anoAtual}");

        // Buscar todas as configurações ativas (sem escopo de tenant para buscar todas)
        $configuracoes = ConfiguracaoFechamentoMes::withoutTenant()
            ->where('ativo', true)
            ->get();

        $this->info("Encontradas {$configuracoes->count()} configuração(ões) ativa(s).");
        
        \Log::info('🔍 Verificação de fechamento automático iniciada', [
            'data_atual' => $hoje->format('d/m/Y'),
            'dia_atual' => $diaAtual,
            'mes_atual' => $mesAtual,
            'ano_atual' => $anoAtual,
            'configuracoes_ativas_encontradas' => $configuracoes->count(),
            'configuracoes_detalhes' => $configuracoes->map(function($cfg) {
                return [
                    'id' => $cfg->id,
                    'tenant_id' => $cfg->tenant_id,
                    'dia_fechamento' => $cfg->dia_fechamento,
                    'ativo' => $cfg->ativo
                ];
            })
        ]);

        if ($configuracoes->isEmpty()) {
            $this->warn('Nenhuma configuração ativa encontrada. Nenhum fechamento será executado.');
            \Log::warning('⚠️ Fechamento automático: Nenhuma configuração ativa encontrada', [
                'data_verificacao' => $hoje->format('d/m/Y H:i:s'),
                'total_configuracoes_no_banco' => ConfiguracaoFechamentoMes::withoutTenant()->count(),
                'configuracoes_ativas_no_banco' => ConfiguracaoFechamentoMes::withoutTenant()->where('ativo', true)->count()
            ]);
            return 0;
        }

        $totalFechados = 0;
        $totalErros = 0;
        $totalIgnorados = 0;

        foreach ($configuracoes as $configuracao) {
            try {
                $this->line("\n--- Processando Tenant ID: {$configuracao->tenant_id} ---");
                $this->line("Dia configurado: {$configuracao->dia_fechamento}");
                $this->line("Ativo: " . ($configuracao->ativo ? 'Sim' : 'Não'));
                $this->line("Data atual: {$diaAtual}/{$mesAtual}/{$anoAtual}");
                
                \Log::info("🏢 Processando tenant para fechamento automático", [
                    'tenant_id' => $configuracao->tenant_id,
                    'configuracao_id' => $configuracao->id,
                    'dia_configurado' => $configuracao->dia_fechamento,
                    'dia_atual' => $diaAtual,
                    'mes_atual' => $mesAtual,
                    'ano_atual' => $anoAtual
                ]);
                
                // Verificar se hoje é o dia de fechamento (a menos que --forcar seja usado)
                $forcar = $this->option('forcar');
                $ignorarMesAnterior = $this->option('ignorar-mes-anterior');
                
                if (!$forcar && $diaAtual != $configuracao->dia_fechamento) {
                    $this->line("⏭️  Tenant {$configuracao->tenant_id}: Hoje não é dia de fechamento (dia configurado: {$configuracao->dia_fechamento}, dia atual: {$diaAtual})");
                    $this->line("💡 Dica: Use --forcar para ignorar esta verificação");
                    \Log::info("⏭️ Fechamento automático: Tenant {$configuracao->tenant_id} ignorado - dia não corresponde", [
                        'tenant_id' => $configuracao->tenant_id,
                        'dia_configurado' => $configuracao->dia_fechamento,
                        'dia_atual' => $diaAtual,
                        'mes_atual' => $mesAtual,
                        'ano_atual' => $anoAtual,
                        'motivo' => 'Dia não corresponde ao configurado'
                    ]);
                    $totalIgnorados++;
                    continue;
                }
                
                if ($forcar) {
                    $this->warn("⚠️  Modo FORÇAR ativado - ignorando verificação de dia");
                }

                $this->info("Processando tenant {$configuracao->tenant_id}...");

                // Verificar se o mês atual já foi fechado (sem escopo de tenant)
                $jaTem = Holerite::withoutTenant()
                    ->where('tenant_id', $configuracao->tenant_id)
                    ->where('mes', $mesAtual)
                    ->where('ano', $anoAtual)
                    ->where('fechado', true)
                    ->exists();

                if ($jaTem) {
                    $this->line("⏭️  Tenant {$configuracao->tenant_id}: Mês atual ({$mesAtual}/{$anoAtual}) já está fechado.");
                    \Log::info("⏭️ Fechamento automático: Tenant {$configuracao->tenant_id} ignorado - mês já fechado", [
                        'tenant_id' => $configuracao->tenant_id,
                        'mes' => $mesAtual,
                        'ano' => $anoAtual,
                        'motivo' => 'Mês atual já foi fechado anteriormente'
                    ]);
                    $totalIgnorados++;
                    continue;
                }

                // Verificar se o mês anterior foi fechado (obrigatório)
                $mesAnterior = $mesAtual == 1 ? 12 : $mesAtual - 1;
                $anoAnterior = $mesAtual == 1 ? $anoAtual - 1 : $anoAtual;

                $mesAnteriorFechado = Holerite::withoutTenant()
                    ->where('tenant_id', $configuracao->tenant_id)
                    ->where('mes', $mesAnterior)
                    ->where('ano', $anoAnterior)
                    ->where('fechado', true)
                    ->exists();

                // Verificar se é o primeiro fechamento do sistema (nenhum mês foi fechado ainda)
                $temAlgumMesFechado = Holerite::withoutTenant()
                    ->where('tenant_id', $configuracao->tenant_id)
                    ->where('fechado', true)
                    ->exists();

                // Se é o primeiro fechamento, permitir mesmo sem mês anterior
                $ehPrimeiroFechamento = !$temAlgumMesFechado;

                if (!$ignorarMesAnterior && !$mesAnteriorFechado && !$ehPrimeiroFechamento && !($mesAtual == 1 && $anoAtual == Carbon::now()->year)) {
                    $this->warn("⚠️  Tenant {$configuracao->tenant_id}: Mês anterior ({$mesAnterior}/{$anoAnterior}) não foi fechado. Ignorando fechamento automático.");
                    $this->line("💡 Dica: Use --ignorar-mes-anterior para ignorar esta verificação");
                    $this->line("💡 Ou feche o mês anterior ({$mesAnterior}/{$anoAnterior}) manualmente primeiro");
                    \Log::warning("⚠️ Fechamento automático: Tenant {$configuracao->tenant_id} ignorado - mês anterior não fechado", [
                        'tenant_id' => $configuracao->tenant_id,
                        'mes_anterior' => $mesAnterior,
                        'ano_anterior' => $anoAnterior,
                        'mes_atual' => $mesAtual,
                        'ano_atual' => $anoAtual,
                        'verificacao_mes_anterior' => true,
                        'primeiro_fechamento' => false,
                        'motivo' => 'Mês anterior não foi fechado'
                    ]);
                    $totalIgnorados++;
                    continue;
                }
                
                if ($ehPrimeiroFechamento) {
                    $this->info("ℹ️  Primeiro fechamento do sistema - permitindo fechamento de {$mesAtual}/{$anoAtual}");
                    \Log::info("ℹ️ Fechamento automático: Primeiro fechamento do sistema", [
                        'tenant_id' => $configuracao->tenant_id,
                        'mes' => $mesAtual,
                        'ano' => $anoAtual,
                        'motivo' => 'Primeiro fechamento do sistema - mês anterior não verificado'
                    ]);
                }
                
                if ($ignorarMesAnterior && !$mesAnteriorFechado) {
                    $this->warn("⚠️  Modo IGNORAR MÊS ANTERIOR ativado - fechando mesmo sem mês anterior fechado");
                    \Log::warning("⚠️ Modo IGNORAR MÊS ANTERIOR ativado", [
                        'tenant_id' => $configuracao->tenant_id,
                        'mes_anterior' => $mesAnterior,
                        'ano_anterior' => $anoAnterior
                    ]);
                }

                // Executar fechamento
                \Log::info("🔄 Iniciando fechamento do mês", [
                    'tenant_id' => $configuracao->tenant_id,
                    'mes' => $mesAtual,
                    'ano' => $anoAtual,
                    'forcar' => $forcar,
                    'ignorar_mes_anterior' => $ignorarMesAnterior
                ]);
                
                $resultado = $this->fecharMesTenant($configuracao->tenant_id, $mesAtual, $anoAtual);

                if ($resultado['sucesso']) {
                    $totalFechados++;
                    $this->info("✓ Tenant {$configuracao->tenant_id}: Mês fechado com sucesso! {$resultado['holerites_gerados']} holerites gerados.");
                    \Log::info("✅ Fechamento automático executado com sucesso", [
                        'tenant_id' => $configuracao->tenant_id,
                        'mes_fechado' => $mesAtual,
                        'ano_fechado' => $anoAtual,
                        'holerites_gerados' => $resultado['holerites_gerados'],
                        'proximo_mes_aberto' => $resultado['proximo_mes_aberto'] ?? 0,
                        'data_fechamento' => now()->format('d/m/Y H:i:s')
                    ]);
                } else {
                    $totalErros++;
                    $this->error("✗ Tenant {$configuracao->tenant_id}: Erro ao fechar mês - {$resultado['erro']}");
                    \Log::error("❌ Erro ao executar fechamento automático", [
                        'tenant_id' => $configuracao->tenant_id,
                        'mes' => $mesAtual,
                        'ano' => $anoAtual,
                        'erro' => $resultado['erro'],
                        'data_erro' => now()->format('d/m/Y H:i:s')
                    ]);
                }

            } catch (\Exception $e) {
                $totalErros++;
                $this->error("✗ Tenant {$configuracao->tenant_id}: Exceção - " . $e->getMessage());
                \Log::error("❌ Exceção ao processar tenant no fechamento automático", [
                    'tenant_id' => $configuracao->tenant_id,
                    'erro' => $e->getMessage(),
                    'trace' => $e->getTraceAsString(),
                    'arquivo' => $e->getFile(),
                    'linha' => $e->getLine(),
                    'data_erro' => now()->format('d/m/Y H:i:s')
                ]);
            }
        }

        $this->info("\n========================================");
        $this->info("RESUMO DA EXECUÇÃO:");
        $this->info("========================================");
        $this->info("Fechamentos realizados: {$totalFechados}");
        $this->info("Ignorados (não atendeu critérios): {$totalIgnorados}");
        $this->info("Erros encontrados: {$totalErros}");
        $this->info("========================================");

        \Log::info('📊 Resumo do fechamento automático executado', [
            'data_execucao' => now()->format('d/m/Y H:i:s'),
            'fechamentos_realizados' => $totalFechados,
            'ignorados' => $totalIgnorados,
            'erros' => $totalErros,
            'total_configuracoes_processadas' => $configuracoes->count(),
            'mes_atual' => $mesAtual,
            'ano_atual' => $anoAtual
        ]);

        return 0;
    }

    /**
     * Fechar mês para um tenant específico
     */
    private function fecharMesTenant($tenantId, $mes, $ano)
    {
        try {
            \Log::info("🔄 Iniciando fechamento de mês para tenant", [
                'tenant_id' => $tenantId,
                'mes' => $mes,
                'ano' => $ano
            ]);
            
            DB::beginTransaction();

            // Buscar todos os funcionários ativos do tenant
            $funcionarios = User::where('status', true)
                ->where('tenant_id', $tenantId)
                ->get();

            \Log::info("👥 Funcionários encontrados para fechamento", [
                'tenant_id' => $tenantId,
                'total_funcionarios' => $funcionarios->count(),
                'mes' => $mes,
                'ano' => $ano
            ]);

            if ($funcionarios->isEmpty()) {
                DB::rollBack();
                \Log::warning("⚠️ Nenhum funcionário ativo encontrado para fechamento", [
                    'tenant_id' => $tenantId,
                    'mes' => $mes,
                    'ano' => $ano
                ]);
                return ['sucesso' => false, 'erro' => 'Nenhum funcionário ativo encontrado'];
            }

            $holeritesGerados = [];

            foreach ($funcionarios as $funcionario) {
                // Calcular totais dos vales e faltas
                $vales = is_array($funcionario->vales) ? $funcionario->vales : [];
                $faltas = is_array($funcionario->faltas) ? $funcionario->faltas : [];

                $totalVales = 0;
                foreach ($vales as $vale) {
                    if (isset($vale['valor']) && is_numeric($vale['valor'])) {
                        $totalVales += floatval($vale['valor']);
                    }
                }

                // Buscar salário base do mês ANTES de calcular descontos (importante para usar o salário correto da época)
                $salarioBaseMes = $this->getSalarioBasePorMes($funcionario->id, $mes, $ano);
                \Log::info("💰 Salário base para {$mes}/{$ano}: {$salarioBaseMes} (salário atual do funcionário: {$funcionario->salario_base})");
                
                $totalFaltas = count($faltas);
                $descontoFaltas = $totalFaltas * ($salarioBaseMes / 30);

                // Calcular comissões (se aplicável)
                $comissaoDropshipping = 0;
                $comissaoServicos = 0;
                $totalComissoes = 0;

                if ($funcionario->permite_receber_comissao) {
                    $comissaoDropshipping = 0;
                    $comissaoServicos = 0;
                    $totalComissoes = $comissaoDropshipping + $comissaoServicos;
                }

                // Calcular Consumo Interno - Vendas/OS/Envelopamentos pagos por Crediário
                $totalConsumoInterno = 0;
                
                // Buscar vendas do funcionário com pagamento em Crediário
                $vendasConsumoInterno = DB::table('vendas')
                    ->where('funcionario_id', $funcionario->id)
                    ->whereIn('status', ['finalizada', 'concluida'])
                    ->where(function($query) use ($ano, $mes) {
                        $query->where(function($q) use ($ano, $mes) {
                            $q->whereNotNull('data_finalizacao')
                              ->whereYear('data_finalizacao', $ano)
                              ->whereMonth('data_finalizacao', $mes);
                        })->orWhere(function($q) use ($ano, $mes) {
                            $q->whereNull('data_finalizacao')
                              ->whereYear('data_emissao', $ano)
                              ->whereMonth('data_emissao', $mes);
                        });
                    })
                    ->get();
                
                foreach ($vendasConsumoInterno as $venda) {
                    if ($venda->dados_pagamento) {
                        $pagamentos = json_decode($venda->dados_pagamento, true);
                        if (is_array($pagamentos)) {
                            foreach ($pagamentos as $pagamento) {
                                if (isset($pagamento['metodo']) && $pagamento['metodo'] === 'Crediário') {
                                    $totalConsumoInterno += floatval($venda->valor_total ?? 0);
                                    break;
                                }
                            }
                        }
                    }
                }
                
                // Buscar OS do funcionário com pagamento em Crediário
                $osConsumoInterno = DB::table('ordens_servico')
                    ->where('funcionario_id', $funcionario->id)
                    ->where(function($query) use ($ano, $mes) {
                        $query->where(function($q) use ($ano, $mes) {
                            $q->whereIn('status_os', ['Finalizada', 'Entregue'])
                              ->whereYear('data_finalizacao_os', $ano)
                              ->whereMonth('data_finalizacao_os', $mes);
                        })->orWhere(function($q) use ($ano, $mes) {
                            $q->whereYear('data_criacao', $ano)
                              ->whereMonth('data_criacao', $mes);
                        });
                    })
                    ->get();
                
                foreach ($osConsumoInterno as $os) {
                    if ($os->pagamentos) {
                        $pagamentos = json_decode($os->pagamentos, true);
                        if (is_array($pagamentos)) {
                            foreach ($pagamentos as $pagamento) {
                                if (isset($pagamento['metodo']) && $pagamento['metodo'] === 'Crediário') {
                                    $totalConsumoInterno += floatval($os->valor_total_os ?? 0);
                                    break;
                                }
                            }
                        }
                    }
                }
                
                // Buscar envelopamentos do funcionário com pagamento em Crediário
                $envConsumoInterno = DB::table('envelopamentos')
                    ->where('funcionario_id', $funcionario->id)
                    ->whereIn('status', ['finalizado', 'Finalizado'])
                    ->whereYear('data_criacao', $ano)
                    ->whereMonth('data_criacao', $mes)
                    ->get();
                
                foreach ($envConsumoInterno as $env) {
                    if ($env->pagamentos) {
                        $pagamentos = json_decode($env->pagamentos, true);
                        if (is_array($pagamentos)) {
                            foreach ($pagamentos as $pagamento) {
                                if (isset($pagamento['metodo']) && $pagamento['metodo'] === 'Crediário') {
                                    $totalConsumoInterno += floatval($env->orcamento_total ?? 0);
                                    break;
                                }
                            }
                        }
                    }
                }

                // Calcular salários usando o salário base do mês específico (já calculado anteriormente)
                $salarioBruto = $salarioBaseMes + $totalComissoes;
                $totalDescontos = $totalVales + $descontoFaltas + $totalConsumoInterno;
                $salarioLiquido = $salarioBruto - $totalDescontos;

                // Verificar se holerite já existe (sem escopo de tenant)
                $holeriteExistente = Holerite::withoutTenant()
                    ->where('tenant_id', $tenantId)
                    ->where('funcionario_id', $funcionario->id)
                    ->where('mes', $mes)
                    ->where('ano', $ano)
                    ->first();

                if ($holeriteExistente) {
                    \Log::info("📝 Holerite existente encontrado, atualizando", [
                        'tenant_id' => $tenantId,
                        'funcionario_id' => $funcionario->id,
                        'mes' => $mes,
                        'ano' => $ano,
                        'holerite_id' => $holeriteExistente->id
                    ]);
                    
                    $holeriteExistente->update([
                        'salario_base' => $salarioBaseMes,
                        'vales' => $vales,
                        'faltas' => $faltas,
                        'total_vales' => $totalVales,
                        'total_faltas' => $totalFaltas,
                        'desconto_faltas' => $descontoFaltas,
                        'salario_bruto' => $salarioBruto,
                        'total_descontos' => $totalDescontos,
                        'salario_liquido' => $salarioLiquido,
                        'comissao_dropshipping' => $comissaoDropshipping,
                        'comissao_servicos' => $comissaoServicos,
                        'total_comissoes' => $totalComissoes,
                        'total_consumo_interno' => $totalConsumoInterno,
                        'fechado' => true,
                        'data_fechamento' => now()->endOfDay(), // Fecha às 23:59:59 do dia
                        'usuario_fechamento_id' => null, // Automático, sem usuário
                        'observacoes' => 'Fechamento automático do sistema',
                    ]);
                    $holerite = $holeriteExistente;
                } else {
                    \Log::info("➕ Criando novo holerite", [
                        'tenant_id' => $tenantId,
                        'funcionario_id' => $funcionario->id,
                        'mes' => $mes,
                        'ano' => $ano
                    ]);
                    
                    try {
                        $holerite = Holerite::withoutTenant()->create([
                            'tenant_id' => $tenantId,
                            'funcionario_id' => $funcionario->id,
                            'mes' => $mes,
                            'ano' => $ano,
                            'salario_base' => $salarioBaseMes,
                            'vales' => $vales,
                            'faltas' => $faltas,
                            'total_vales' => $totalVales,
                            'total_faltas' => $totalFaltas,
                            'desconto_faltas' => $descontoFaltas,
                            'salario_bruto' => $salarioBruto,
                            'total_descontos' => $totalDescontos,
                            'salario_liquido' => $salarioLiquido,
                            'comissao_dropshipping' => $comissaoDropshipping,
                            'comissao_servicos' => $comissaoServicos,
                            'total_comissoes' => $totalComissoes,
                            'total_consumo_interno' => $totalConsumoInterno,
                            'fechado' => true,
                            'data_fechamento' => now()->endOfDay(), // Fecha às 23:59:59 do dia
                            'usuario_fechamento_id' => null, // Automático
                            'observacoes' => 'Fechamento automático do sistema',
                        ]);
                    } catch (\Illuminate\Database\QueryException $e) {
                        // Se der erro de duplicata, tentar buscar e atualizar
                        if ($e->getCode() == 23000 && strpos($e->getMessage(), 'Duplicate entry') !== false) {
                            \Log::warning("⚠️ Tentativa de criar holerite duplicado detectada, buscando existente", [
                                'tenant_id' => $tenantId,
                                'funcionario_id' => $funcionario->id,
                                'mes' => $mes,
                                'ano' => $ano,
                                'erro' => $e->getMessage()
                            ]);
                            
                            // Tentar buscar novamente (pode ter sido criado entre a verificação e a criação)
                            $holeriteExistente = Holerite::withoutTenant()
                                ->where('tenant_id', $tenantId)
                                ->where('funcionario_id', $funcionario->id)
                                ->where('mes', $mes)
                                ->where('ano', $ano)
                                ->first();
                            
                            if ($holeriteExistente) {
                                \Log::info("✅ Holerite duplicado encontrado, atualizando", [
                                    'holerite_id' => $holeriteExistente->id
                                ]);
                                
                                $holeriteExistente->update([
                                    'salario_base' => $funcionario->salario_base,
                                    'vales' => $vales,
                                    'faltas' => $faltas,
                                    'total_vales' => $totalVales,
                                    'total_faltas' => $totalFaltas,
                                    'desconto_faltas' => $descontoFaltas,
                                    'salario_bruto' => $salarioBruto,
                                    'total_descontos' => $totalDescontos,
                                    'salario_liquido' => $salarioLiquido,
                                    'comissao_dropshipping' => $comissaoDropshipping,
                                    'comissao_servicos' => $comissaoServicos,
                                    'total_comissoes' => $totalComissoes,
                                    'total_consumo_interno' => $totalConsumoInterno,
                                    'fechado' => true,
                                    'data_fechamento' => now()->endOfDay(), // Fecha às 23:59:59 do dia
                                    'usuario_fechamento_id' => null,
                                    'observacoes' => 'Fechamento automático do sistema',
                                ]);
                                $holerite = $holeriteExistente;
                            } else {
                                // Se não encontrou, relançar o erro
                                throw $e;
                            }
                        } else {
                            // Se não for erro de duplicata, relançar
                            throw $e;
                        }
                    }
                }

                // Zerar vales e faltas do funcionário
                $funcionario->vales = [];
                $funcionario->faltas = [];
                $funcionario->save();

                $holeritesGerados[] = $holerite;
            }

            // Abrir automaticamente o próximo mês
            $proximoMes = $mes + 1;
            $proximoAno = $ano;
            
            if ($proximoMes > 12) {
                $proximoMes = 1;
                $proximoAno = $ano + 1;
            }

            $proximoMesAberto = [];
            foreach ($funcionarios as $funcionario) {
                $proximoMesExistente = Holerite::withoutTenant()
                    ->where('tenant_id', $tenantId)
                    ->where('funcionario_id', $funcionario->id)
                    ->where('mes', $proximoMes)
                    ->where('ano', $proximoAno)
                    ->first();

                if (!$proximoMesExistente) {
                    $holeriteProximoMes = Holerite::withoutTenant()->create([
                        'tenant_id' => $tenantId,
                        'funcionario_id' => $funcionario->id,
                        'mes' => $proximoMes,
                        'ano' => $proximoAno,
                        'salario_base' => $funcionario->salario_base,
                        'vales' => [],
                        'faltas' => [],
                        'total_vales' => 0,
                        'total_faltas' => 0,
                        'desconto_faltas' => 0,
                        'salario_bruto' => $funcionario->salario_base,
                        'total_descontos' => 0,
                        'salario_liquido' => $funcionario->salario_base,
                        'comissao_dropshipping' => 0,
                        'comissao_servicos' => 0,
                        'total_comissoes' => 0,
                        'fechado' => false,
                        'data_fechamento' => null,
                        'usuario_fechamento_id' => null,
                        'observacoes' => null,
                    ]);

                    $proximoMesAberto[] = $holeriteProximoMes;
                }
            }

            // Registrar fechamento no histórico
            HistoricoFechamentoMes::create([
                'tenant_id' => $tenantId,
                'tipo' => 'fechamento',
                'mes' => $mes,
                'ano' => $ano,
                'data_acao' => now(),
                'usuario_id' => null, // Automático
                'automatico' => true,
                'quantidade_holerites' => count($holeritesGerados),
                'observacoes' => 'Fechamento automático do sistema',
            ]);

            // Registrar abertura do próximo mês no histórico
            if (count($proximoMesAberto) > 0) {
                HistoricoFechamentoMes::create([
                    'tenant_id' => $tenantId,
                    'tipo' => 'abertura',
                    'mes' => $proximoMes,
                    'ano' => $proximoAno,
                    'data_acao' => now(),
                    'usuario_id' => null,
                    'automatico' => true,
                    'quantidade_holerites' => count($proximoMesAberto),
                    'observacoes' => 'Abertura automática após fechamento automático do mês anterior',
                ]);
            }

            DB::commit();

            \Log::info("✅ Fechamento de mês concluído com sucesso", [
                'tenant_id' => $tenantId,
                'mes_fechado' => $mes,
                'ano_fechado' => $ano,
                'holerites_gerados' => count($holeritesGerados),
                'proximo_mes_aberto' => count($proximoMesAberto),
                'proximo_mes' => $proximoMes,
                'proximo_ano' => $proximoAno,
                'data_fechamento' => now()->format('d/m/Y H:i:s')
            ]);

            return [
                'sucesso' => true,
                'holerites_gerados' => count($holeritesGerados),
                'proximo_mes_aberto' => count($proximoMesAberto),
            ];

        } catch (\Exception $e) {
            DB::rollBack();
            \Log::error("❌ Erro ao fechar mês do tenant", [
                'tenant_id' => $tenantId,
                'mes' => $mes,
                'ano' => $ano,
                'erro' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'arquivo' => $e->getFile(),
                'linha' => $e->getLine(),
                'data_erro' => now()->format('d/m/Y H:i:s')
            ]);
            return ['sucesso' => false, 'erro' => $e->getMessage()];
        }
    }

    /**
     * Buscar salário base do funcionário para um mês/ano específico usando histórico
     */
    private function getSalarioBasePorMes($funcionarioId, $mes, $ano)
    {
        // Buscar o salário vigente até o fim do mês/ano especificado
        $salario = DB::table('funcionario_salario_historico')
            ->where('funcionario_id', $funcionarioId)
            ->where('data_alteracao', '<=', Carbon::createFromDate($ano, $mes, 1)->endOfMonth()->toDateString())
            ->orderBy('data_alteracao', 'desc')
            ->first();

        // Se não encontrou no histórico, buscar o salário atual
        if (!$salario) {
            $funcionario = User::find($funcionarioId);
            return $funcionario ? ($funcionario->salario_base ?? 0) : 0;
        }

        return $salario->novo_salario;
    }
}

