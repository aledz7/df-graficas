<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PermissionProfile extends Model
{
    use HasFactory;
    
    protected $table = 'permission_profiles';
    
    protected $fillable = [
        'tenant_id',
        'nome',
        'descricao',
        'permissions',
    ];
    
    protected $casts = [
        'permissions' => 'array',
    ];
    
    public function tenant()
    {
        return $this->belongsTo(Tenant::class);
    }
}
