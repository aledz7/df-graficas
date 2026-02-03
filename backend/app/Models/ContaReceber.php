<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Models\Traits\Tenantable;

class ContaReceber extends Model
{
    use HasFactory, SoftDeletes, Tenantable;

    protected $table = 'contas_receber';

    protected $fillable = [
        'tenant_id',
        'cliente_id',
        'user_id',
        'descricao',
        'valor_original',
        'valor_pendente',
        'data_vencimento',
        'data_emissao',
        'data_quitacao',
        'status',
        'juros_aplicados',
        'observacoes',
        'tipo_juros',
        'valor_juros',
        'data_inicio_cobranca_juros',
        'frequencia_juros',
        'ultima_aplicacao_juros',
        'total_aplicacoes_juros',
        'historico_juros',
        'venda_id',
        'os_id',
        'envelopamento_id',
        'parcelamento_info',
        'conta_origem_id',
        'historico_pagamentos'
    ];

    protected $casts = [
        'valor_original' => 'decimal:2',
        'valor_pendente' => 'decimal:2',
        'juros_aplicados' => 'decimal:2',
        'valor_juros' => 'decimal:2',
        'data_vencimento' => 'date',
        'data_emissao' => 'date',
        'data_quitacao' => 'date',
        'data_inicio_cobranca_juros' => 'date',
        'ultima_aplicacao_juros' => 'date',
        'historico_juros' => 'array',
        'parcelamento_info' => 'array',
        'historico_pagamentos' => 'array',
    ];

    /**
     * Relacionamento com cliente
     */
    public function cliente()
    {
        return $this->belongsTo(Cliente::class);
    }

    /**
     * Relacionamento com usuário
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Relacionamento com venda
     */
    public function venda()
    {
        return $this->belongsTo(Venda::class);
    }

    /**
     * Relacionamento com ordem de serviço
     * Não carregar ordens de serviço deletadas (soft deleted)
     */
    public function ordemServico()
    {
        return $this->belongsTo(OrdemServico::class, 'os_id')
                    ->whereNull('ordens_servico.deleted_at');
    }

    /**
     * Relacionamento com envelopamento
     */
    public function envelopamento()
    {
        return $this->belongsTo(Envelopamento::class, 'envelopamento_id');
    }

    /**
     * Calcula o status correto baseado no valor pendente e data de vencimento
     */
    public function getStatusCalculadoAttribute()
    {
        // Se a conta está quitada no banco, retorna 'recebido' para o frontend
        if ($this->status === 'quitada') {
            return 'recebido';
        }
        
        // Se a conta está parcial no banco, retorna 'parcialmente_pago' para o frontend
        if ($this->status === 'parcial') {
            return 'parcialmente_pago';
        }
        
        // Se a conta está pendente, verificar se está vencida
        if ($this->status === 'pendente') {
            // Se a data de vencimento já passou, é 'vencido'
            if ($this->data_vencimento < now()) {
                return 'vencido';
            }
            // Senão é 'pendente'
            return 'pendente';
        }
        
        // Se a conta tem valor_pendente <= 0 mas não está quitada, manter o status original
        // Isso evita que contas sejam marcadas como quitadas incorretamente
        if ($this->valor_pendente <= 0 && $this->status !== 'quitada') {
            \Log::warning('Conta com valor_pendente <= 0 mas status não quitada', [
                'conta_id' => $this->id,
                'valor_pendente' => $this->valor_pendente,
                'status' => $this->status
            ]);
            return $this->status; // Manter o status original
        }
        
        // Fallback para o status original
        return $this->status;
    }

    /**
     * Scope para contas em atraso
     */
    public function scopeEmAtraso($query)
    {
        return $query->where('data_vencimento', '<', now())
                    ->where('status', '!=', 'quitada');
    }

    /**
     * Scope para contas pendentes
     */
    public function scopePendentes($query)
    {
        return $query->where('status', 'pendente');
    }

    /**
     * Verifica se a conta está em atraso
     */
    public function getEmAtrasoAttribute()
    {
        return $this->data_vencimento < now() && $this->status !== 'quitada';
    }

    /**
     * Calcula os dias em atraso
     */
    public function getDiasAtrasoAttribute()
    {
        if (!$this->em_atraso) {
            return 0;
        }

        return now()->diffInDays($this->data_vencimento);
    }

    /**
     * Verifica se a conta tem configuração de juros
     */
    public function hasConfigJuros()
    {
        return !empty($this->tipo_juros) && !empty($this->valor_juros) && !empty($this->data_inicio_cobranca_juros);
    }

    /**
     * Verifica se deve aplicar juros hoje
     */
    public function deveAplicarJurosHoje()
    {
        if (!$this->hasConfigJuros() || $this->status === 'quitada') {
            return false;
        }

        $hoje = now()->startOfDay();
        $dataInicio = $this->data_inicio_cobranca_juros;
        
        // Se ainda não chegou a data de início
        if ($hoje < $dataInicio) {
            return false;
        }

        // Se é aplicação única e já foi aplicada
        if ($this->frequencia_juros === 'unica' && $this->total_aplicacoes_juros > 0) {
            return false;
        }

        // Se tem última aplicação, verificar se já passou tempo suficiente
        if ($this->ultima_aplicacao_juros) {
            $ultimaAplicacao = $this->ultima_aplicacao_juros;
            
            switch ($this->frequencia_juros) {
                case 'diaria':
                    return $hoje->diffInDays($ultimaAplicacao) >= 1;
                case 'semanal':
                    return $hoje->diffInWeeks($ultimaAplicacao) >= 1;
                case 'mensal':
                    return $hoje->diffInMonths($ultimaAplicacao) >= 1;
                default:
                    return false;
            }
        }

        // Primeira aplicação
        return true;
    }

    /**
     * Calcula o valor dos juros a serem aplicados
     */
    public function calcularValorJuros()
    {
        if (!$this->hasConfigJuros()) {
            return 0;
        }

        if ($this->tipo_juros === 'percentual') {
            return ($this->valor_pendente * $this->valor_juros) / 100;
        } else {
            return $this->valor_juros;
        }
    }

    /**
     * Aplica juros à conta
     */
    public function aplicarJuros($motivo = null)
    {
        if (!$this->deveAplicarJurosHoje()) {
            return false;
        }

        $valorJuros = $this->calcularValorJuros();
        
        if ($valorJuros <= 0) {
            return false;
        }

        // Atualizar valores
        $this->valor_pendente += $valorJuros;
        $this->juros_aplicados = ($this->juros_aplicados ?? 0) + $valorJuros;
        $this->ultima_aplicacao_juros = now();
        $this->total_aplicacoes_juros++;

        // Registrar no histórico
        $historico = $this->historico_juros ?? [];
        $historico[] = [
            'data' => now()->toDateString(),
            'valor' => $valorJuros,
            'valor_pendente_antes' => $this->valor_pendente - $valorJuros,
            'valor_pendente_depois' => $this->valor_pendente,
            'motivo' => $motivo ?? 'Aplicação automática de juros',
            'tipo' => $this->tipo_juros,
            'valor_configurado' => $this->valor_juros,
            'frequencia' => $this->frequencia_juros
        ];
        
        $this->historico_juros = $historico;
        
        return $this->save();
    }

    /**
     * Configura juros para a conta
     */
    public function configurarJuros($config)
    {
        $this->tipo_juros = $config['tipo'];
        $this->valor_juros = $config['valor'];
        $this->data_inicio_cobranca_juros = $config['data_inicio_cobranca'];
        $this->frequencia_juros = $config['frequencia'];
        $this->ultima_aplicacao_juros = null;
        $this->total_aplicacoes_juros = 0;
        $this->historico_juros = [];
        
        return $this->save();
    }

    /**
     * Scope para contas que devem ter juros aplicados hoje
     */
    public function scopeDevemAplicarJuros($query)
    {
        return $query->where('status', '!=', 'quitada')
                    ->whereNotNull('tipo_juros')
                    ->whereNotNull('valor_juros')
                    ->whereNotNull('data_inicio_cobranca_juros')
                    ->where('data_inicio_cobranca_juros', '<=', now());
    }

    /**
     * Scope para contas com juros configurados
     */
    public function scopeComJurosConfigurados($query)
    {
        return $query->whereNotNull('tipo_juros')
                    ->whereNotNull('valor_juros')
                    ->whereNotNull('data_inicio_cobranca_juros');
    }

    /**
     * Relacionamento com conta origem (para parcelamento)
     */
    public function contaOrigem()
    {
        return $this->belongsTo(ContaReceber::class, 'conta_origem_id');
    }

    /**
     * Relacionamento com parcelas geradas
     */
    public function parcelas()
    {
        return $this->hasMany(ContaReceber::class, 'conta_origem_id');
    }

    /**
     * Verifica se a conta é uma parcela
     */
    public function getIsParcelaAttribute()
    {
        return !is_null($this->conta_origem_id);
    }

    /**
     * Verifica se a conta tem parcelas
     */
    public function getHasParcelasAttribute()
    {
        return $this->parcelas()->count() > 0;
    }

    /**
     * Registra um pagamento na conta
     */
    public function registrarPagamento($dadosPagamento)
    {
        // Verificar se a conta já está quitada
        if ($this->status === 'quitada' && $this->valor_pendente <= 0) {
            \Log::warning('Tentativa de registrar pagamento em conta já quitada', [
                'conta_id' => $this->id,
                'valor_pagamento' => $dadosPagamento['valor'],
                'valor_pendente' => $this->valor_pendente,
                'status' => $this->status
            ]);
            return false;
        }

        $historico = $this->historico_pagamentos ?? [];
        $historico[] = [
            'data' => $dadosPagamento['data'] ?? now()->toDateTimeString(),
            'valor' => $dadosPagamento['valor'],
            'forma_pagamento' => $dadosPagamento['forma_pagamento'],
            'observacoes' => $dadosPagamento['observacoes'] ?? null,
            'usuario_id' => auth()->id(),
        ];

        $this->historico_pagamentos = $historico;
        
        // Verificar se o pagamento não excede o valor pendente
        if ($dadosPagamento['valor'] > $this->valor_pendente) {
            \Log::warning('Pagamento excede valor pendente, ajustando', [
                'conta_id' => $this->id,
                'valor_pagamento' => $dadosPagamento['valor'],
                'valor_pendente' => $this->valor_pendente
            ]);
            $dadosPagamento['valor'] = $this->valor_pendente;
        }
        
        $this->valor_pendente -= $dadosPagamento['valor'];

        // Atualizar status se necessário
        if ($this->valor_pendente <= 0) {
            $this->status = 'quitada';
            $this->data_quitacao = $dadosPagamento['data'] ?? now();
        } else {
            $this->status = 'parcial';
        }

        return $this->save();
    }

    /**
     * Cria parcelas para a conta
     */
    public function criarParcelas($dadosParcelamento)
    {
        $valorParcela = $this->valor_pendente / $dadosParcelamento['num_parcelas'];
        $dataVencimento = $dadosParcelamento['data_primeira_parcela'];
        $intervalo = $dadosParcelamento['intervalo_dias'];

        $parcelas = [];

        for ($i = 0; $i < $dadosParcelamento['num_parcelas']; $i++) {
            $parcela = new self([
                'cliente_id' => $this->cliente_id,
                'user_id' => auth()->id(),
                'descricao' => "Parcela " . ($i + 1) . "/{$dadosParcelamento['num_parcelas']} - {$this->descricao}",
                'valor_original' => $valorParcela,
                'valor_pendente' => $valorParcela,
                'data_vencimento' => $dataVencimento,
                'data_emissao' => now(),
                'status' => 'pendente',
                'observacoes' => "Parcela gerada automaticamente da conta #{$this->id}",
                'conta_origem_id' => $this->id,
                'parcelamento_info' => [
                    'id_conta_origem' => $this->id,
                    'total_parcelas' => $dadosParcelamento['num_parcelas'],
                    'parcela_atual' => $i + 1,
                    'valor_parcela' => $valorParcela,
                    'data_geracao' => now()->toDateTimeString(),
                ]
            ]);

            $parcela->save();
            $parcelas[] = $parcela;

            // Calcular próxima data de vencimento
            $dataVencimento = \Carbon\Carbon::parse($dataVencimento)->addDays($intervalo)->format('Y-m-d');
        }

        // Marcar conta original como parcelada
        $this->status = 'parcelada';
        $this->valor_pendente = 0;
        $this->save();

        return $parcelas;
    }

    /**
     * Scope para contas parceladas
     */
    public function scopeParceladas($query)
    {
        return $query->whereNotNull('conta_origem_id');
    }

    /**
     * Scope para contas que são origem de parcelamento
     */
    public function scopeComParcelas($query)
    {
        return $query->whereHas('parcelas');
    }
} 