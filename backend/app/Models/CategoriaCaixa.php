<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Str;
use App\Models\Traits\Tenantable;

class CategoriaCaixa extends Model
{
    use HasFactory, SoftDeletes, Tenantable;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'categorias_caixa';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'tenant_id',
        'nome',
        'tipo',
        'cor',
        'icone',
        'categoria_pai_id',
        'ativo',
        'sistema',
        'ordem',
        'descricao',
        'metadados',
        'tenant_id',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'ativo' => 'boolean',
        'sistema' => 'boolean',
        'ordem' => 'integer',
        'metadados' => 'array',
    ];

    /**
     * The "booting" method of the model.
     */
    protected static function boot()
    {
        parent::boot();

        // Definir usuário de cadastro e ordem ao criar
        static::creating(function ($categoria) {
            // Definir usuário de cadastro
            if (auth()->check() && empty($categoria->usuario_cadastro_id)) {
                $categoria->usuario_cadastro_id = auth()->id();
            }
            
            // Definir ordem se não informada
            if (empty($categoria->ordem)) {
                $ultimaOrdem = static::where('tenant_id', $categoria->tenant_id)
                    ->where('tipo', $categoria->tipo)
                    ->max('ordem');
                
                $categoria->ordem = $ultimaOrdem + 1;
            }
            
            // Garantir que categorias do sistema não sejam desativadas
            if ($categoria->sistema) {
                $categoria->ativo = true;
            }
        });

        // Atualizar usuário de alteração
        static::updating(function ($categoria) {
            if (auth()->check()) {
                $categoria->usuario_alteracao_id = auth()->id();
            }
            
            // Garantir que categorias do sistema não sejam desativadas
            if ($categoria->sistema && $categoria->isDirty('ativo') && !$categoria->ativo) {
                $categoria->ativo = true;
            }
        });
        
        // Impedir exclusão de categorias do sistema
        static::deleting(function ($categoria) {
            if ($categoria->sistema) {
                throw new \Exception('Não é possível excluir uma categoria do sistema.');
            }
            
            // Verificar se existem lançamentos associados
            if ($categoria->lancamentos()->exists()) {
                throw new \Exception('Não é possível excluir uma categoria que possui lançamentos associados.');
            }
            
            // Verificar se existem subcategorias
            if ($categoria->subcategorias()->exists()) {
                throw new \Exception('Não é possível excluir uma categoria que possui subcategorias.');
            }
        });
    }

    /**
     * Get the tenant that owns the categoria.
     */
    /**
     * Obtém o tenant ao qual esta categoria de caixa pertence.
     *
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo
     */
    public function tenant()
    {
        return $this->belongsTo(Tenant::class);
    }

    /**
     * Get the user who created the categoria.
     */
    public function usuarioCadastro()
    {
        return $this->belongsTo(User::class, 'usuario_cadastro_id');
    }

    /**
     * Get the user who last updated the categoria.
     */
    public function usuarioAlteracao()
    {
        return $this->belongsTo(User::class, 'usuario_alteracao_id');
    }

    /**
     * Get the parent categoria.
     */
    public function categoriaPai()
    {
        return $this->belongsTo(CategoriaCaixa::class, 'categoria_pai_id');
    }

    /**
     * Get the child categorias.
     */
    public function subcategorias()
    {
        return $this->hasMany(CategoriaCaixa::class, 'categoria_pai_id')->orderBy('ordem');
    }

    /**
     * Get the lancamentos for the categoria.
     */
    public function lancamentos()
    {
        return $this->hasMany(LancamentoCaixa::class, 'categoria_id');
    }

    /**
     * Get the categoria's tipo formatado.
     *
     * @return string
     */
    public function getTipoFormatadoAttribute()
    {
        $tipos = [
            'receita' => 'Receita',
            'despesa' => 'Despesa',
            'transferencia' => 'Transferência',
            'investimento' => 'Investimento',
        ];

        return $tipos[$this->tipo] ?? Str::title($this->tipo);
    }

    /**
     * Get the categoria's status badge.
     *
     * @return string
     */
    public function getStatusBadgeAttribute()
    {
        if (!$this->ativo) {
            return '<span class="px-2 py-1 text-xs font-semibold leading-tight text-red-700 bg-red-100 rounded-full">Inativa</span>';
        }
        
        return $this->sistema
            ? '<span class="px-2 py-1 text-xs font-semibold leading-tight text-blue-700 bg-blue-100 rounded-full">Sistema</span>'
            : '<span class="px-2 py-1 text-xs font-semibold leading-tight text-green-700 bg-green-100 rounded-full">Ativa</span>';
    }

    /**
     * Get the categoria's full name with parent.
     *
     * @return string
     */
    public function getNomeCompletoAttribute()
    {
        $nomes = [];
        
        if ($this->categoriaPai) {
            $nomes[] = $this->categoriaPai->nome;
        }
        
        $nomes[] = $this->nome;
        
        return implode(' > ', $nomes);
    }

    /**
     * Scope a query to only include categorias ativas.
     *
     * @param  \Illuminate\Database\Eloquent\Builder  $query
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeAtivas($query)
    {
        return $query->where('ativo', true);
    }

    /**
     * Scope a query to only include categorias de um tipo específico.
     *
     * @param  \Illuminate\Database\Eloquent\Builder  $query
     * @param  string  $tipo
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeDoTipo($query, $tipo)
    {
        return $query->where('tipo', $tipo);
    }

    /**
     * Scope a query to only include categorias principais (sem pai).
     *
     * @param  \Illuminate\Database\Eloquent\Builder  $query
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopePrincipais($query)
    {
        return $query->whereNull('categoria_pai_id');
    }

    /**
     * Scope a query to order by order field.
     *
     * @param  \Illuminate\Database\Eloquent\Builder  $query
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeOrdenadas($query)
    {
        return $query->orderBy('ordem')->orderBy('nome');
    }

    /**
     * Get the total de lançamentos da categoria.
     *
     * @return float
     */
    public function getTotalLancamentosAttribute()
    {
        return $this->lancamentos()->sum('valor');
    }

    /**
     * Verifica se a categoria pode ser excluída.
     *
     * @return array
     */
    public function podeExcluir()
    {
        $erros = [];
        
        if ($this->sistema) {
            $erros[] = 'Não é possível excluir uma categoria do sistema.';
        }
        
        if ($this->lancamentos()->exists()) {
            $erros[] = 'Não é possível excluir uma categoria que possui lançamentos associados.';
        }
        
        if ($this->subcategorias()->exists()) {
            $erros[] = 'Não é possível excluir uma categoria que possui subcategorias.';
        }
        
        return [
            'pode' => empty($erros),
            'erros' => $erros,
        ];
    }

    /**
     * Atualiza a ordem das categorias.
     *
     * @param  array  $ordemIds
     * @return void
     */
    public static function atualizarOrdem(array $ordemIds)
    {
        foreach ($ordemIds as $ordem => $id) {
            static::where('id', $id)->update(['ordem' => $ordem + 1]);
        }
    }

    /**
     * Get the categoria's style for display.
     *
     * @return string
     */
    public function getEstiloAttribute()
    {
        return "background-color: {$this->cor}20; color: {$this->cor}; border-left: 4px solid {$this->cor};";
    }

    /**
     * Get the categoria's icon HTML.
     *
     * @return string
     */
    public function getIconeHtmlAttribute()
    {
        return "<i class=\"{$this->icone}\"></i>";
    }
}
