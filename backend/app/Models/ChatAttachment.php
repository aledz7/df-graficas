<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ChatAttachment extends Model
{
    use HasFactory;

    protected $table = 'chat_attachments';
    
    protected $fillable = [
        'message_id',
        'file_url',
        'file_type',
        'file_name',
        'file_size',
        'mime_type',
        'thumbnail_url',
    ];
    
    protected $casts = [
        'file_size' => 'integer',
    ];

    /**
     * Relacionamento com mensagem
     */
    public function message()
    {
        return $this->belongsTo(ChatMessage::class, 'message_id');
    }

    /**
     * Formatar tamanho do arquivo
     */
    public function getFormattedSizeAttribute()
    {
        $bytes = $this->file_size;
        if ($bytes >= 1073741824) {
            return number_format($bytes / 1073741824, 2) . ' GB';
        } elseif ($bytes >= 1048576) {
            return number_format($bytes / 1048576, 2) . ' MB';
        } elseif ($bytes >= 1024) {
            return number_format($bytes / 1024, 2) . ' KB';
        } else {
            return $bytes . ' bytes';
        }
    }
}
