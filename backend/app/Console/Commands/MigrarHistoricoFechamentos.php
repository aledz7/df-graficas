<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Holerite;
use App\Models\HistoricoFechamentoMes;
use Illuminate\Support\Facades\DB;

class MigrarHistoricoFechamentos extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'funcionarios:migrar-historico-fechamentos';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Migra o histórico de fechamentos antigos baseado nos holerites existentes';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Iniciando migração de histórico de fechamentos...');

        try {
            DB::beginTransaction();

            // Buscar todos os holerites fechados agrupados por tenant, mês e ano
            $holeritesAgrupados = Holerite::where('fechado', true)
                ->select('tenant_id', 'mes', 'ano', DB::raw('MIN(data_fechamento) as data_fechamento'), 
                         DB::raw('MIN(usuario_fechamento_id) as usuario_id'), DB::raw('COUNT(*) as quantidade'))
                ->groupBy('tenant_id', 'mes', 'ano')
                ->orderBy('ano', 'asc')
                ->orderBy('mes', 'asc')
                ->get();

            $totalMigrados = 0;
            $totalPulados = 0;

            foreach ($holeritesAgrupados as $grupo) {
                // Verificar se já existe histórico para este fechamento
                $jaExiste = HistoricoFechamentoMes::where('tenant_id', $grupo->tenant_id)
                    ->where('mes', $grupo->mes)
                    ->where('ano', $grupo->ano)
                    ->where('tipo', 'fechamento')
                    ->exists();

                if ($jaExiste) {
                    $totalPulados++;
                    $this->line("Pulando {$grupo->mes}/{$grupo->ano} (tenant {$grupo->tenant_id}) - já existe no histórico");
                    continue;
                }

                // Criar registro de fechamento
                HistoricoFechamentoMes::create([
                    'tenant_id' => $grupo->tenant_id,
                    'tipo' => 'fechamento',
                    'mes' => $grupo->mes,
                    'ano' => $grupo->ano,
                    'data_acao' => $grupo->data_fechamento ?? now(),
                    'usuario_id' => $grupo->usuario_id,
                    'automatico' => false,
                    'quantidade_holerites' => $grupo->quantidade,
                    'observacoes' => 'Migrado automaticamente de fechamentos antigos',
                ]);

                $totalMigrados++;
                $this->info("✓ Migrado: {$grupo->mes}/{$grupo->ano} (tenant {$grupo->tenant_id}) - {$grupo->quantidade} holerites");

                // Verificar se existe próximo mês aberto e criar histórico de abertura
                $proximoMes = $grupo->mes + 1;
                $proximoAno = $grupo->ano;
                
                if ($proximoMes > 12) {
                    $proximoMes = 1;
                    $proximoAno = $grupo->ano + 1;
                }

                // Verificar se o próximo mês tem holerites abertos
                $proximoMesHolerites = Holerite::where('tenant_id', $grupo->tenant_id)
                    ->where('mes', $proximoMes)
                    ->where('ano', $proximoAno)
                    ->count();

                if ($proximoMesHolerites > 0) {
                    // Verificar se já existe histórico de abertura para este mês
                    $aberturaExiste = HistoricoFechamentoMes::where('tenant_id', $grupo->tenant_id)
                        ->where('mes', $proximoMes)
                        ->where('ano', $proximoAno)
                        ->where('tipo', 'abertura')
                        ->exists();

                    if (!$aberturaExiste) {
                        // Criar registro de abertura
                        HistoricoFechamentoMes::create([
                            'tenant_id' => $grupo->tenant_id,
                            'tipo' => 'abertura',
                            'mes' => $proximoMes,
                            'ano' => $proximoAno,
                            'data_acao' => $grupo->data_fechamento ?? now(),
                            'usuario_id' => $grupo->usuario_id,
                            'automatico' => true,
                            'quantidade_holerites' => $proximoMesHolerites,
                            'observacoes' => 'Abertura automática migrada',
                        ]);

                        $this->info("  └─ Abertura do próximo mês: {$proximoMes}/{$proximoAno}");
                    }
                }
            }

            DB::commit();

            $this->info("\n========================================");
            $this->info("Migração concluída!");
            $this->info("Fechamentos migrados: {$totalMigrados}");
            $this->info("Fechamentos já existentes: {$totalPulados}");
            $this->info("========================================");

            return 0;

        } catch (\Exception $e) {
            DB::rollBack();
            $this->error("Erro ao migrar histórico: " . $e->getMessage());
            return 1;
        }
    }
}

