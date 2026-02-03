<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Models\Traits\Tenantable;

class OrdemServicoAnexo extends Model
{
    use HasFactory, Tenantable;

    protected $table = 'ordens_servico_anexos';
    protected $primaryKey = 'id';
    
    protected $fillable = [
        'ordem_servico_id',
        'nome_arquivo',
        'caminho',
        'tipo_arquivo',
        'tamanho_kb',
        'tenant_id'
    ];
    
    /**
     * Relacionamento com a ordem de serviço
     */
    public function ordemServico()
    {
        return $this->belongsTo(OrdemServico::class, 'ordem_servico_id');
    }
}
