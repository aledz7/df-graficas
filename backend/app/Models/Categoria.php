<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;
use App\Models\Traits\Tenantable;

class Categoria extends Model
{
    use HasFactory, SoftDeletes, Tenantable;

    /**
     * Os atributos que são atribuíveis em massa.
     *
     * @var array
     */
    protected $fillable = [
        'tenant_id',
        'nome',
        'tipo',
        'icone',
        'cor',
        'ativo',
        'ordem',
        'slug',
        'descricao',
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

        static::creating(function ($categoria) {
            if (empty($categoria->slug)) {
                $categoria->slug = Str::slug($categoria->nome);
            }
        });

        static::updating(function ($categoria) {
            // Sempre atualizar o slug quando o nome mudar
            if ($categoria->isDirty('nome')) {
                $baseSlug = Str::slug($categoria->nome);
                $slug = $baseSlug;
                
                // Verificar se o slug já existe para este tenant
                $i = 1;
                while (static::where('slug', $slug)
                    ->where('tenant_id', $categoria->tenant_id)
                    ->where('id', '!=', $categoria->id)
                    ->exists()) {
                    $slug = $baseSlug . '-' . $i++;
                }
                
                $categoria->slug = $slug;
            }
        });
    }

    /**
     * Obtém os produtos associados à categoria.
     */
    public function produtos()
    {
        return $this->hasMany(Produto::class, 'categoria_id');
    }

    /**
     * Obtém as subcategorias associadas à categoria.
     */
    public function subcategorias()
    {
        return $this->hasMany(Subcategoria::class, 'categoria_id');
    }

    /**
     * Obtém o tenant ao qual esta categoria pertence.
     *
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo
     */
    public function tenant()
    {
        return $this->belongsTo(Tenant::class);
    }

    /**
     * Escopo para categorias ativas.
     */
    public function scopeAtivas($query)
    {
        return $query->where('ativo', true);
    }

    /**
     * Escopo para categorias por tipo.
     */
    public function scopeDoTipo($query, $tipo)
    {
        return $query->where('tipo', $tipo);
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
