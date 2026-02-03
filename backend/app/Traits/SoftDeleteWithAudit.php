<?php

namespace App\Traits;

use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\Auth;

trait SoftDeleteWithAudit
{
    use SoftDeletes;

    /**
     * Boot the trait.
     */
    protected static function bootSoftDeleteWithAudit()
    {
        static::deleting(function ($model) {
            \Log::info('SoftDeleteWithAudit: deleting event triggered', [
                'model' => get_class($model),
                'id' => $model->id ?? 'N/A'
            ]);
            
            $user = Auth::user();
            
            if ($user) {
                $model->usuario_exclusao_id = $user->id;
                $model->usuario_exclusao_nome = $user->name;
                \Log::info('SoftDeleteWithAudit: user info set', [
                    'user_id' => $user->id,
                    'user_name' => $user->name
                ]);
            } else {
                \Log::warning('SoftDeleteWithAudit: no authenticated user found');
            }
            
            $model->data_exclusao = now();
            
            // Se a justificativa não foi definida, usar uma padrão
            if (empty($model->justificativa_exclusao)) {
                $model->justificativa_exclusao = 'Exclusão realizada pelo sistema';
            }
            
            \Log::info('SoftDeleteWithAudit: audit fields set', [
                'data_exclusao' => $model->data_exclusao,
                'justificativa_exclusao' => $model->justificativa_exclusao
            ]);
            
            // Forçar o salvamento dos campos de auditoria antes do delete
            $model->saveQuietly();
            
            \Log::info('SoftDeleteWithAudit: audit fields saved before delete');
        });
    }

    /**
     * Restore the soft-deleted model.
     *
     * @return bool|null
     */
    public function restore()
    {
        // Limpar os campos de auditoria ao restaurar
        $this->usuario_exclusao_id = null;
        $this->usuario_exclusao_nome = null;
        $this->data_exclusao = null;
        $this->justificativa_exclusao = null;
        
        return parent::restore();
    }

    /**
     * Force delete the model.
     *
     * @return bool|null
     */
    public function forceDelete()
    {
        // Limpar os campos de auditoria ao excluir permanentemente
        $this->usuario_exclusao_id = null;
        $this->usuario_exclusao_nome = null;
        $this->data_exclusao = null;
        $this->justificativa_exclusao = null;
        
        return parent::forceDelete();
    }
}
