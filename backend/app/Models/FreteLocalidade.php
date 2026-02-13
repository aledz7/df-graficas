<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class FreteLocalidade extends Model
{
    protected $table = 'fretes_localidades';

    protected $fillable = [
        'opcao_frete_id',
        'estado',
        'cidade',
        'bairro',
    ];

    /**
     * Relacionamento com opção de frete
     */
    public function opcaoFrete()
    {
        return $this->belongsTo(OpcaoFrete::class);
    }
}
