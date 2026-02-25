<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Models\Traits\Tenantable;

class Curso extends Model
{
    use HasFactory, SoftDeletes, Tenantable;

    protected $table = 'cursos';

    protected $fillable = [
        'tenant_id',
        'titulo',
        'descricao',
        'capa_url',
        'setor',
        'nivel',
        'obrigatorio',
        'status',
        'tipo_conteudo',
        'conteudo_texto',
        'arquivo_url',
        'arquivo_nome',
        'video_url',
        'video_arquivo_url',
        'eh_continuacao',
        'treinamento_anterior_id',
        'parte_modulo',
        'tipo_liberacao',
        'data_liberacao',
        'data_inicio_periodo',
        'data_fim_periodo',
        'publico_alvo',
        'setores_publico',
        'usuarios_publico',
        'tipo_notificacao',
        'setores_notificacao',
        'notificacao_enviada',
        'data_notificacao',
        'exigir_confirmacao_leitura',
        'exigir_conclusao_obrigatoria',
        'prazo_conclusao',
        'permitir_comentarios',
        'permitir_download',
        'ativar_certificado',
        'dividir_em_modulos',
        'permitir_anexos_adicionais',
        'possui_prova_final',
        'usuario_criacao_id',
        'usuario_edicao_id',
        'visualizacoes',
        'conclusoes',
    ];

    protected $casts = [
        'obrigatorio' => 'boolean',
        'eh_continuacao' => 'boolean',
        'notificacao_enviada' => 'boolean',
        'exigir_confirmacao_leitura' => 'boolean',
        'exigir_conclusao_obrigatoria' => 'boolean',
        'permitir_comentarios' => 'boolean',
        'permitir_download' => 'boolean',
        'ativar_certificado' => 'boolean',
        'dividir_em_modulos' => 'boolean',
        'permitir_anexos_adicionais' => 'boolean',
        'possui_prova_final' => 'boolean',
        'data_liberacao' => 'datetime',
        'data_inicio_periodo' => 'datetime',
        'data_fim_periodo' => 'datetime',
        'data_notificacao' => 'datetime',
        'prazo_conclusao' => 'date',
        'setores_publico' => 'array',
        'usuarios_publico' => 'array',
        'setores_notificacao' => 'array',
        'visualizacoes' => 'integer',
        'conclusoes' => 'integer',
    ];

    /**
     * Setores disponíveis
     */
    const SETOR_ADMINISTRATIVO = 'administrativo';
    const SETOR_FINANCEIRO = 'financeiro';
    const SETOR_COMERCIAL = 'comercial';
    const SETOR_CRIACAO = 'criacao';
    const SETOR_PRODUCAO = 'producao';
    const SETOR_LOGISTICA = 'logistica';
    const SETOR_EFC = 'efc';

    /**
     * Níveis disponíveis
     */
    const NIVEL_BASICO = 'basico';
    const NIVEL_INTERMEDIARIO = 'intermediario';
    const NIVEL_AVANCADO = 'avancado';

    /**
     * Tipos de conteúdo
     */
    const TIPO_TEXTO = 'texto';
    const TIPO_ARQUIVO = 'arquivo';
    const TIPO_VIDEO = 'video';
    const TIPO_LINK_VIDEO = 'link_video';

    /**
     * Tipos de liberação
     */
    const LIBERACAO_AGORA = 'agora';
    const LIBERACAO_DATA_ESPECIFICA = 'data_especifica';
    const LIBERACAO_PERIODO = 'periodo';
    const LIBERACAO_SEMPRE_ATIVO = 'sempre_ativo';

    /**
     * Público-alvo
     */
    const PUBLICO_TODOS = 'todos';
    const PUBLICO_AREA_ESPECIFICA = 'area_especifica';
    const PUBLICO_USUARIOS_ESPECIFICOS = 'usuarios_especificos';

    /**
     * Tipos de notificação
     */
    const NOTIFICACAO_TODOS = 'todos';
    const NOTIFICACAO_AREA_ESPECIFICA = 'area_especifica';
    const NOTIFICACAO_NENHUM = 'nenhum';

    /**
     * Status
     */
    const STATUS_RASCUNHO = 'rascunho';
    const STATUS_PUBLICADO = 'publicado';
    const STATUS_ARQUIVADO = 'arquivado';

    /**
     * Relacionamento com usuário que criou
     */
    public function usuarioCriacao()
    {
        return $this->belongsTo(User::class, 'usuario_criacao_id');
    }

    /**
     * Relacionamento com usuário que editou
     */
    public function usuarioEdicao()
    {
        return $this->belongsTo(User::class, 'usuario_edicao_id');
    }

    /**
     * Relacionamento com treinamento anterior (continuação)
     */
    public function treinamentoAnterior()
    {
        return $this->belongsTo(Curso::class, 'treinamento_anterior_id');
    }

    /**
     * Relacionamento com continuações deste treinamento
     */
    public function continuacoes()
    {
        return $this->hasMany(Curso::class, 'treinamento_anterior_id');
    }

    /**
     * Relacionamento com prova final
     */
    public function prova()
    {
        return $this->hasOne(CursoProva::class, 'curso_id');
    }

    /**
     * Scope para filtrar por setor
     */
    public function scopePorSetor($query, $setor)
    {
        if ($setor && $setor !== 'todos') {
            return $query->where('setor', $setor);
        }
        return $query;
    }

    /**
     * Scope para filtrar por nível
     */
    public function scopePorNivel($query, $nivel)
    {
        if ($nivel && $nivel !== 'todos') {
            return $query->where('nivel', $nivel);
        }
        return $query;
    }

    /**
     * Scope para apenas publicados
     */
    public function scopePublicados($query)
    {
        return $query->where('status', self::STATUS_PUBLICADO);
    }

    /**
     * Scope para apenas rascunhos
     */
    public function scopeRascunhos($query)
    {
        return $query->where('status', self::STATUS_RASCUNHO);
    }

    /**
     * Scope para treinamentos disponíveis (liberados)
     */
    public function scopeDisponiveis($query)
    {
        $now = now();
        return $query->where('status', self::STATUS_PUBLICADO)
            ->where(function($q) use ($now) {
                $q->where('tipo_liberacao', self::LIBERACAO_AGORA)
                  ->orWhere('tipo_liberacao', self::LIBERACAO_SEMPRE_ATIVO)
                  ->orWhere(function($q2) use ($now) {
                      $q2->where('tipo_liberacao', self::LIBERACAO_DATA_ESPECIFICA)
                         ->where('data_liberacao', '<=', $now);
                  })
                  ->orWhere(function($q3) use ($now) {
                      $q3->where('tipo_liberacao', self::LIBERACAO_PERIODO)
                         ->where('data_inicio_periodo', '<=', $now)
                         ->where('data_fim_periodo', '>=', $now);
                  });
            });
    }

    /**
     * Obter nome do setor
     */
    public static function nomeSetor($setor)
    {
        return match($setor) {
            self::SETOR_ADMINISTRATIVO => 'Administrativo',
            self::SETOR_FINANCEIRO => 'Financeiro',
            self::SETOR_COMERCIAL => 'Comercial',
            self::SETOR_CRIACAO => 'Criação',
            self::SETOR_PRODUCAO => 'Produção',
            self::SETOR_LOGISTICA => 'Logística',
            self::SETOR_EFC => 'EFC',
            default => 'Comercial',
        };
    }

    /**
     * Obter nome do nível
     */
    public static function nomeNivel($nivel)
    {
        return match($nivel) {
            self::NIVEL_BASICO => 'Básico',
            self::NIVEL_INTERMEDIARIO => 'Intermediário',
            self::NIVEL_AVANCADO => 'Avançado',
            default => 'Básico',
        };
    }

    /**
     * Verificar se está disponível no momento
     */
    public function estaDisponivel()
    {
        if ($this->status !== self::STATUS_PUBLICADO) {
            return false;
        }

        $now = now();

        return match($this->tipo_liberacao) {
            self::LIBERACAO_AGORA => true,
            self::LIBERACAO_SEMPRE_ATIVO => true,
            self::LIBERACAO_DATA_ESPECIFICA => $this->data_liberacao && $this->data_liberacao <= $now,
            self::LIBERACAO_PERIODO => $this->data_inicio_periodo && $this->data_fim_periodo 
                && $this->data_inicio_periodo <= $now && $this->data_fim_periodo >= $now,
            default => false,
        };
    }
}
