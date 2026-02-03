<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Storage;

class Tenant extends Model
{
    use HasFactory, SoftDeletes;

    /**
     * Os atributos que são atribuíveis em massa.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'nome',
        'razao_social',
        'cnpj',
        'inscricao_estadual',
        'email',
        'telefone',
        'celular',
        'cep',
        'logradouro',
        'numero',
        'complemento',
        'bairro',
        'cidade',
        'uf',
        'tema',
        'logo_url',
        'configuracoes',
        'ativo',
        'data_ativacao',
        'data_expiracao',
        'plano',
        'limite_usuarios',
        'limite_armazenamento_mb',
        'dominio',
        'database_connection',
        'database_name',
    ];

    /**
     * Os atributos que devem ser convertidos.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'configuracoes' => 'array',
        'ativo' => 'boolean',
        'data_ativacao' => 'datetime',
        'data_expiracao' => 'datetime',
        'limite_usuarios' => 'integer',
        'limite_armazenamento_mb' => 'integer',
    ];

    /**
     * Os relacionamentos que devem ser sempre carregados.
     *
     * @var array<int, string>
     */
    protected $with = [];

    /**
     * Os atributos que devem ser ocultos para serialização.
     *
     * @var array<int, string>
     */
    protected $hidden = [
        'created_at',
        'updated_at',
        'deleted_at',
        'database_connection',
        'database_name',
    ];

    /**
     * Os acessórios que devem ser anexados ao array do modelo.
     *
     * @var array<int, string>
     */
    protected $appends = [
        'nome_formatado',
        'endereco_completo',
        'logo_url_completo',
    ];

    /**
     * Boot do modelo.
     *
     * @return void
     */
    protected static function booted()
    {
        static::creating(function ($tenant) {
            if (empty($tenant->dominio)) {
                $tenant->dominio = Str::slug($tenant->nome) . '-' . Str::random(6);
            }
        });
    }

    /**
     * Obter os usuários deste tenant.
     *
     * @return \Illuminate\Database\Eloquent\Relations\HasMany
     */
    public function users()
    {
        return $this->hasMany(User::class);
    }

    /**
     * Obter os produtos deste tenant.
     *
     * @return \Illuminate\Database\Eloquent\Relations\HasMany
     */
    public function produtos()
    {
        return $this->hasMany(Produto::class);
    }

    /**
     * Obter os clientes deste tenant.
     *
     * @return \Illuminate\Database\Eloquent\Relations\HasMany
     */
    public function clientes()
    {
        return $this->hasMany(Cliente::class);
    }

    /**
     * Obter os orçamentos deste tenant.
     *
     * @return \Illuminate\Database\Eloquent\Relations\HasMany
     */
    public function orcamentos()
    {
        return $this->hasMany(Orcamento::class);
    }

    /**
     * Obter as vendas deste tenant.
     *
     * @return \Illuminate\Database\Eloquent\Relations\HasMany
     */
    public function vendas()
    {
        return $this->hasMany(Venda::class);
    }

    /**
     * Obter as contas bancárias deste tenant.
     *
     * @return \Illuminate\Database\Eloquent\Relations\HasMany
     */
    public function contasBancarias()
    {
        return $this->hasMany(ContaBancaria::class);
    }

    /**
     * Obter as categorias de caixa deste tenant.
     *
     * @return \Illuminate\Database\Eloquent\Relations\HasMany
     */
    public function categoriasCaixa()
    {
        return $this->hasMany(CategoriaCaixa::class);
    }

    /**
     * Obter os lançamentos de caixa deste tenant.
     *
     * @return \Illuminate\Database\Eloquent\Relations\HasMany
     */
    public function lancamentosCaixa()
    {
        return $this->hasMany(LancamentoCaixa::class);
    }

    /**
     * Obter as configurações deste tenant.
     *
     * @return \Illuminate\Database\Eloquent\Relations\HasMany
     */
    public function configuracoes()
    {
        return $this->hasMany(Configuracao::class);
    }

    /**
     * Verificar se o tenant atingiu o limite de usuários.
     *
     * @return bool
     */
    public function hasReachedUserLimit(): bool
    {
        if ($this->limite_usuarios === null) {
            return false;
        }
        
        return $this->users()->count() >= $this->limite_usuarios;
    }

    /**
     * Verificar se o tenant está ativo.
     *
     * @return bool
     */
    public function isActive(): bool
    {
        if (!$this->ativo) {
            return false;
        }
        
        if ($this->data_expiracao) {
            return $this->data_expiracao->isFuture();
        }
        
        return true;
    }

    /**
     * Obter o limite de armazenamento em bytes.
     *
     * @return int
     */
    public function getStorageLimitInBytes(): int
    {
        return $this->limite_armazenamento_mb * 1024 * 1024; // Converter MB para bytes
    }

    /**
     * Obter o uso atual de armazenamento em bytes.
     *
     * @return int
     */
    public function getCurrentStorageUsage(): int
    {
        // Implementar lógica para calcular o uso de armazenamento
        // Pode ser baseado em arquivos no storage, tamanho de anexos, etc.
        $disk = Storage::disk('tenant-' . $this->id);
        return $this->calculateDirectorySize($disk, '');
    }

    /**
     * Calcular o tamanho de um diretório de forma recursiva.
     *
     * @param  \Illuminate\Contracts\Filesystem\Filesystem  $disk
     * @param  string  $directory
     * @return int
     */
    protected function calculateDirectorySize($disk, $directory): int
    {
        $size = 0;
        $files = $disk->files($directory);
        $directories = $disk->directories($directory);
        
        foreach ($files as $file) {
            $size += $disk->size($file);
        }
        
        foreach ($directories as $dir) {
            $size += $this->calculateDirectorySize($disk, $dir);
        }
        
        return $size;
    }

    /**
     * Verificar se o tenant atingiu o limite de armazenamento.
     *
     * @return bool
     */
    public function hasReachedStorageLimit(): bool
    {
        if ($this->limite_armazenamento_mb === null) {
            return false;
        }
        
        return $this->getCurrentStorageUsage() >= $this->getStorageLimitInBytes();
    }

    /**
     * Obter a URL do logotipo do tenant.
     *
     * @param  string|null  $value
     * @return string
     */
    public function getLogoUrlAttribute($value)
    {
        if (!$value) {
            return asset('images/default-tenant-logo.png');
        }
        
        if (Str::startsWith($value, ['http://', 'https://'])) {
            return $value;
        }
        
        return Storage::disk('public')->url($value);
    }

    /**
     * Obter a URL completa do logotipo.
     *
     * @return string
     */
    public function getLogoUrlCompletoAttribute(): string
    {
        return $this->logo_url;
    }

    /**
     * Obter o nome formatado do tenant.
     *
     * @return string
     */
    public function getNomeFormatadoAttribute(): string
    {
        return $this->razao_social ?: $this->nome;
    }

    /**
     * Obter o endereço completo formatado.
     *
     * @return string
     */
    public function getEnderecoCompletoAttribute(): string
    {
        $endereco = [];
        
        if ($this->logradouro) {
            $endereco[] = $this->logradouro;
            
            if ($this->numero) {
                $endereco[] = $this->numero;
            }
            
            if ($this->complemento) {
                $endereco[] = $this->complemento;
            }
            
            if ($this->bairro) {
                $endereco[] = $this->bairro;
            }
            
            if ($this->cidade) {
                $endereco[] = $this->cidade;
                
                if ($this->uf) {
                    $endereco[] = $this->uf;
                }
            }
            
            if ($this->cep) {
                $endereco[] = 'CEP: ' . $this->cep;
            }
        }
        
        return implode(', ', $endereco);
    }

    /**
     * Obter as configurações do tenant como um array chave-valor.
     *
     * @return array
     */
    public function getConfiguracoesArray(): array
    {
        return $this->configuracoes ?? [];
    }

    /**
     * Obter uma configuração específica do tenant.
     *
     * @param  string  $key
     * @param  mixed  $default
     * @return mixed
     */
    public function getConfiguracao(string $key, $default = null)
    {
        return data_get($this->configuracoes, $key, $default);
    }

    /**
     * Definir uma configuração do tenant.
     *
     * @param  string  $key
     * @param  mixed  $value
     * @return void
     */
    public function setConfiguracao(string $key, $value): void
    {
        $configuracoes = $this->configuracoes ?? [];
        data_set($configuracoes, $key, $value);
        $this->configuracoes = $configuracoes;
    }
}
