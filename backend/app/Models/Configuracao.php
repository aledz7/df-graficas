<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Arr;
use App\Models\Traits\Tenantable;

class Configuracao extends Model
{
    use HasFactory, SoftDeletes, Tenantable;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'configuracoes';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'tenant_id',
        'grupo',
        'chave',
        'nome',
        'descricao',
        'valor_texto',
        'valor_numero',
        'valor_booleano',
        'valor_data',
        'valor_hora',
        'valor_data_hora',
        'valor_json',
        'tipo',
        'opcoes',
        'validacao',
        'ordem',
        'visivel',
        'editavel',
        'obrigatorio',
        'tenant_id',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'valor_numero' => 'decimal:4',
        'valor_booleano' => 'boolean',
        'valor_data' => 'date',
        'valor_hora' => 'datetime:H:i:s',
        'valor_data_hora' => 'datetime',
        'valor_json' => 'array',
        'opcoes' => 'array',
        'validacao' => 'array',
        'ordem' => 'integer',
        'visivel' => 'boolean',
        'editavel' => 'boolean',
        'obrigatorio' => 'boolean',
    ];

    /**
     * The "booting" method of the model.
     */
    protected static function boot()
    {
        parent::boot();

        // Definir usuário de cadastro
        static::creating(function ($config) {
            if (auth()->check() && empty($config->usuario_cadastro_id)) {
                $config->usuario_cadastro_id = auth()->id();
            }
        });

        // Atualizar usuário de alteração
        static::updating(function ($config) {
            if (auth()->check()) {
                $config->usuario_alteracao_id = auth()->id();
            }
        });
    }

    /**
     * Get the tenant that owns the configuração.
     */
    /**
     * Obtém o tenant ao qual esta configuração pertence.
     *
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo
     */
    public function tenant()
    {
        return $this->belongsTo(Tenant::class);
    }

    /**
     * Get the user who created the configuração.
     */
    /**
     * Obtém o usuário que criou a configuração.
     *
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo
     */
    public function usuarioCadastro()
    {
        return $this->belongsTo(User::class, 'usuario_cadastro_id')
            ->where('tenant_id', $this->tenant_id);
    }

    /**
     * Get the user who last updated the configuração.
     */
    /**
     * Obtém o usuário que atualizou a configuração pela última vez.
     *
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo
     */
    public function usuarioAlteracao()
    {
        return $this->belongsTo(User::class, 'usuario_alteracao_id')
            ->where('tenant_id', $this->tenant_id);
    }

    /**
     * Get the configuration value based on its type.
     *
     * @return mixed
     */
    public function getValorAttribute()
    {
        // Mapear tipos para campos de valor existentes
        $mapeamentoTipos = [
            'texto' => 'valor_texto',
            'string' => 'valor_texto',
            'email' => 'valor_texto',
            'url' => 'valor_texto',
            'password' => 'valor_texto',
            'textarea' => 'valor_texto',
            'imagem' => 'valor_texto',
            'arquivo' => 'valor_texto',
            'numero' => 'valor_numero',
            'integer' => 'valor_numero',
            'float' => 'valor_numero',
            'booleano' => 'valor_booleano',
            'boolean' => 'valor_booleano',
            'data' => 'valor_data',
            'date' => 'valor_data',
            'hora' => 'valor_hora',
            'time' => 'valor_hora',
            'data_hora' => 'valor_data_hora',
            'datetime' => 'valor_data_hora',
            'json' => 'valor_json',
            'array' => 'valor_json',
            'object' => 'valor_json',
            'select' => 'valor_texto',
            'multiselect' => 'valor_json'
        ];
        
        $valorCampo = $mapeamentoTipos[$this->tipo] ?? 'valor_texto';
        
        if ($this->tipo === 'json' && !empty($this->valor_json)) {
            return $this->valor_json;
        }
        
        if ($this->tipo === 'multiselect' && !empty($this->valor_json)) {
            return $this->valor_json;
        }
        
        return $this->$valorCampo;
    }

    /**
     * Set the configuration value based on its type.
     *
     * @param  mixed  $value
     * @return void
     */
    public function setValorAttribute($value)
    {
        // Mapear tipos para campos de valor existentes
        $mapeamentoTipos = [
            'texto' => 'valor_texto',
            'string' => 'valor_texto',
            'email' => 'valor_texto',
            'url' => 'valor_texto',
            'password' => 'valor_texto',
            'textarea' => 'valor_texto',
            'imagem' => 'valor_texto',
            'arquivo' => 'valor_texto',
            'numero' => 'valor_numero',
            'integer' => 'valor_numero',
            'float' => 'valor_numero',
            'booleano' => 'valor_booleano',
            'boolean' => 'valor_booleano',
            'data' => 'valor_data',
            'date' => 'valor_data',
            'hora' => 'valor_hora',
            'time' => 'valor_hora',
            'data_hora' => 'valor_data_hora',
            'datetime' => 'valor_data_hora',
            'json' => 'valor_json',
            'array' => 'valor_json',
            'object' => 'valor_json',
            'select' => 'valor_texto',
            'multiselect' => 'valor_json'
        ];
        
        $valorCampo = $mapeamentoTipos[$this->tipo] ?? 'valor_texto';
        
        if ($this->tipo === 'json' && is_array($value)) {
            $this->attributes['valor_json'] = json_encode($value);
        } else if ($this->tipo === 'multiselect' && is_array($value)) {
            $this->attributes['valor_json'] = json_encode($value);
        } else {
            $this->$valorCampo = $value;
        }
        
        // Limpar outros campos de valor
        $camposValor = [
            'valor_texto', 'valor_numero', 'valor_booleano',
            'valor_data', 'valor_hora', 'valor_data_hora', 'valor_json'
        ];
        
        foreach ($camposValor as $campo) {
            if ($campo !== $valorCampo) {
                $this->$campo = null;
            }
        }
    }

    /**
     * Get the configuration value with the correct type.
     *
     * @param  string  $key
     * @return mixed
     */
    public function getAttributeValue($key)
    {
        if ($key === 'valor') {
            return $this->getValorAttribute();
        }

        return parent::getAttributeValue($key);
    }

    /**
     * Set a given attribute on the model.
     *
     * @param  string  $key
     * @param  mixed  $value
     * @return $this
     */
    public function setAttribute($key, $value)
    {
        if ($key === 'valor') {
            return $this->setValorAttribute($value);
        }

        return parent::setAttribute($key, $value);
    }

    /**
     * Scope a query to only include configurações de um grupo específico.
     *
     * @param  \Illuminate\Database\Eloquent\Builder  $query
     * @param  string|array  $grupos
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeDoGrupo($query, $grupos)
    {
        if (is_array($grupos)) {
            return $query->whereIn('grupo', $grupos);
        }
        
        return $query->where('grupo', $grupos);
    }

    /**
     * Scope a query to only include configurações visíveis.
     *
     * @param  \Illuminate\Database\Eloquent\Builder  $query
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeVisiveis($query)
    {
        return $query->where('visivel', true);
    }

    /**
     * Scope a query to only include configurações editáveis.
     *
     * @param  \Illuminate\Database\Eloquent\Builder  $query
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeEditaveis($query)
    {
        return $query->where('editavel', true);
    }

    /**
     * Scope a query to order by grupo and ordem.
     *
     * @param  \Illuminate\Database\Eloquent\Builder  $query
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeOrdenadas($query)
    {
        return $query->orderBy('grupo')->orderBy('ordem')->orderBy('nome');
    }

    /**
     * Get configuration value by group and key.
     *
     * @param  string  $grupo
     * @param  string  $chave
     * @param  mixed  $default
     * @return mixed
     */
    public static function getValor($grupo, $chave, $default = null)
    {
        $config = static::where('grupo', $grupo)
            ->where('chave', $chave)
            ->first();
            
        return $config ? $config->valor : $default;
    }

    /**
     * Set configuration value by group and key.
     *
     * @param  string  $grupo
     * @param  string  $chave
     * @param  mixed  $valor
     * @param  array  $opcoes
     * @return \App\Models\Configuracao
     */
    public static function setValor($grupo, $chave, $valor, $opcoes = [])
    {
        $config = static::firstOrNew([
            'tenant_id' => auth()->check() ? auth()->user()->tenant_id : null,
            'grupo' => $grupo,
            'chave' => $chave,
        ]);
        
        $config->fill(array_merge([
            'nome' => $opcoes['nome'] ?? ucfirst(str_replace('_', ' ', $chave)),
            'descricao' => $opcoes['descricao'] ?? null,
            'tipo' => $opcoes['tipo'] ?? static::determinarTipo($valor),
            'opcoes' => $opcoes['opcoes'] ?? null,
            'validacao' => $opcoes['validacao'] ?? null,
            'ordem' => $opcoes['ordem'] ?? 0,
            'visivel' => $opcoes['visivel'] ?? true,
            'editavel' => $opcoes['editavel'] ?? true,
            'obrigatorio' => $opcoes['obrigatorio'] ?? false,
        ]));
        
        $config->valor = $valor;
        $config->save();
        
        return $config;
    }

    /**
     * Determine the configuration type based on the value.
     *
     * @param  mixed  $valor
     * @return string
     */
    protected static function determinarTipo($valor)
    {
        if (is_bool($valor)) {
            return 'booleano';
        } elseif (is_numeric($valor)) {
            return 'numero';
        } elseif ($valor instanceof \DateTime) {
            return 'data_hora';
        } elseif (is_array($valor) || is_object($valor)) {
            return 'json';
        }
        
        return 'texto';
    }

    /**
     * Get all configurations as an associative array.
     *
     * @param  string|null  $grupo
     * @return array
     */
    public static function getTodas($grupo = null)
    {
        $query = static::query();
        
        if ($grupo) {
            $query->where('grupo', $grupo);
        }
        
        return $query->get()
            ->groupBy('grupo')
            ->mapWithKeys(function ($configs, $grupo) {
                return [
                    $grupo => $configs->mapWithKeys(function ($config) {
                        return [$config->chave => $config->valor];
                    })->toArray()
                ];
            })
            ->toArray();
    }

    /**
     * Get the validation rules for the configuration.
     *
     * @return array
     */
    public function getRegrasValidacao()
    {
        $regras = [];
        
        if ($this->obrigatorio) {
            $regras[] = 'required';
        } else {
            $regras[] = 'nullable';
        }
        
        if ($this->tipo === 'numero') {
            $regras[] = 'numeric';
        } elseif ($this->tipo === 'booleano') {
            $regras[] = 'boolean';
        } elseif ($this->tipo === 'data') {
            $regras[] = 'date';
        } elseif ($this->tipo === 'hora') {
            $regras[] = 'date_format:H:i';
        } elseif ($this->tipo === 'data_hora') {
            $regras[] = 'date';
        } elseif ($this->tipo === 'email') {
            $regras[] = 'email';
        } elseif ($this->tipo === 'url') {
            $regras[] = 'url';
        } elseif ($this->tipo === 'json') {
            $regras[] = 'json';
        }
        
        // Adicionar regras personalizadas
        if (!empty($this->validacao) && is_array($this->validacao)) {
            $regras = array_merge($regras, $this->validacao);
        }
        
        return $regras;
    }

    /**
     * Get the HTML input type for the configuration.
     *
     * @return string
     */
    public function getTipoInput()
    {
        $tipos = [
            'texto' => 'text',
            'numero' => 'number',
            'booleano' => 'checkbox',
            'data' => 'date',
            'hora' => 'time',
            'data_hora' => 'datetime-local',
            'email' => 'email',
            'url' => 'url',
            'select' => 'select',
            'multiselect' => 'select',
            'json' => 'textarea',
            'textarea' => 'textarea',
            'password' => 'password',
            'color' => 'color',
            'file' => 'file',
            'image' => 'file',
        ];
        
        return $tipos[$this->tipo] ?? 'text';
    }
}
