<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Models\Traits\Tenantable;

class Empresa extends Model
{
    use HasFactory, SoftDeletes, Tenantable;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'empresas';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'tenant_id',
        'nome_fantasia',
        'razao_social',
        'cnpj',
        'inscricao_estadual',
        'inscricao_municipal',
        'email',
        'telefone',
        'whatsapp',
        'endereco_completo',
        'logradouro',
        'numero_endereco',
        'complemento',
        'bairro',
        'cidade',
        'estado',
        'cep',
        'codigo_municipio_ibge',
        'regime_tributario',
        'instagram',
        'site',
        'logo_url',
        'nome_sistema',
        'mensagem_rodape',
        'senha_supervisor',
        'termos_servico',
        'politica_privacidade',
        'usuario_cadastro_id',
        'usuario_alteracao_id',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var array<int, string>
     */
    protected $hidden = [
        'senha_supervisor',
    ];

    // Removido logo_url do appends para evitar conflito
    // protected $appends = ['logo_url'];

    /**
     * The "booting" method of the model.
     */
    protected static function boot()
    {
        parent::boot();

        // Definir usuário de cadastro
        static::creating(function ($empresa) {
            if (auth()->check() && empty($empresa->usuario_cadastro_id)) {
                $empresa->usuario_cadastro_id = auth()->id();
            }
        });

        // Atualizar usuário de alteração
        static::updating(function ($empresa) {
            if (auth()->check()) {
                $empresa->usuario_alteracao_id = auth()->id();
            }
        });
    }

    /**
     * Get the tenant that owns the empresa.
     */
    public function tenant()
    {
        return $this->belongsTo(Tenant::class);
    }

    /**
     * Get the user who created the empresa.
     */
    public function usuarioCadastro()
    {
        return $this->belongsTo(User::class, 'usuario_cadastro_id')
            ->where('tenant_id', $this->tenant_id);
    }

    /**
     * Get the user who last updated the empresa.
     */
    public function usuarioAlteracao()
    {
        return $this->belongsTo(User::class, 'usuario_alteracao_id')
            ->where('tenant_id', $this->tenant_id);
    }

    /**
     * Get the empresa for the current tenant.
     */
    public static function getEmpresaAtual()
    {
        if (!auth()->check()) {
            \Log::warning('❌ Usuário não autenticado');
            return null;
        }
        
        $tenantId = auth()->user()->tenant_id;
        \Log::info('🔍 Buscando empresa para tenant_id: ' . $tenantId);
        
        $empresa = static::where('tenant_id', $tenantId)->first();
        
        if ($empresa) {
            \Log::info('✅ Empresa encontrada:', $empresa->toArray());
        } else {
            \Log::warning('⚠️ Nenhuma empresa encontrada para tenant_id: ' . $tenantId);
        }
        
        return $empresa;
    }

    /**
     * Get the full URL for the logo
     */
    public function getLogoUrlAttribute($value)
    {
        if (!$value) {
            return null;
        }
        
        // Se já é uma URL completa, retornar como está
        if (filter_var($value, FILTER_VALIDATE_URL)) {
            return $value;
        }
        
        // Se o caminho já começa com /storage/, remover para evitar duplicação
        $path = $value;
        if (str_starts_with($path, '/storage/')) {
            $path = substr($path, 9); // Remove '/storage/'
        }
        
        return \Storage::url($path);
    }
}
