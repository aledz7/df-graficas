<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class FreteFaixaCep extends Model
{
    protected $table = 'fretes_faixas_cep';

    protected $fillable = [
        'opcao_frete_id',
        'cep_inicio',
        'cep_fim',
    ];

    /**
     * Relacionamento com opção de frete
     */
    public function opcaoFrete()
    {
        return $this->belongsTo(OpcaoFrete::class);
    }

    /**
     * Verifica se um CEP está na faixa
     */
    public function cepEstaNaFaixa($cep): bool
    {
        $cep = preg_replace('/\D/', '', $cep);
        $inicio = preg_replace('/\D/', '', $this->cep_inicio);
        $fim = preg_replace('/\D/', '', $this->cep_fim);
        
        return $cep >= $inicio && $cep <= $fim;
    }
}
