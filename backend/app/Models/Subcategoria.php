<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;
use App\Models\Traits\Tenantable;

class Subcategoria extends Model
{
    use HasFactory, SoftDeletes, Tenantable;

    /**
     * Os atributos que são atribuíveis em massa.
     *
     * @var array
     */
    protected $fillable = [
        'tenant_id',
        'categoria_id',
        'nome',
        'slug',
        'descricao',
        'icone',
        'cor',
        'ativo',
        'ordem',
        'imagem',
        'metadados'
    ];

    /**
     * Os atributos que devem ser convertidos.
     *
     * @var array
     */
    protected $casts = [
        'ativo' => 'boolean',
        'ordem' => 'integer',
        'metadados' => 'array',
    ];

    /**
     * Os atributos que devem ser convertidos para datas.
     *
     * @var array
     */
    protected $dates = [
        'deleted_at',
    ];

    /**
     * Boot the model.
     */
    protected static function boot()
    {
        parent::boot();

        static::creating(function ($subcategoria) {
            if (empty($subcategoria->slug)) {
                $subcategoria->slug = Str::slug($subcategoria->nome);
            }
        });

        static::updating(function ($subcategoria) {
            if ($subcategoria->isDirty('nome') && empty($subcategoria->slug)) {
                $subcategoria->slug = Str::slug($subcategoria->nome);
            }
        });
    }

    /**
     * Obtém a categoria da subcategoria.
     */
    public function categoria()
    {
        return $this->belongsTo(Categoria::class);
    }

    /**
     * Obtém os produtos associados à subcategoria.
     */
    public function produtos()
    {
        return $this->hasMany(Produto::class, 'subcategoria_id');
    }

    /**
     * Obtém o tenant ao qual esta subcategoria pertence.
     *
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo
     */
    public function tenant()
    {
        return $this->belongsTo(Tenant::class);
    }

    /**
     * Escopo para subcategorias ativas.
     */
    public function scopeAtivas($query)
    {
        return $query->where('ativo', true);
    }

    /**
     * Escopo para subcategorias de uma categoria específica.
     */
    public function scopeDaCategoria($query, $categoriaId)
    {
        return $query->where('categoria_id', $categoriaId);
    }

    /**
     * Obtém o caminho completo da imagem.
     */
    public function getImagemUrlAttribute()
    {
        if (!$this->imagem) {
            return null;
        }

        if (filter_var($this->imagem, FILTER_VALIDATE_URL)) {
            return $this->imagem;
        }

        return asset('storage/' . $this->imagem);
    }
}
