<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;
use App\Models\ChatThread;
use App\Models\ChatThreadMember;
use App\Models\ChatMessage;
use App\Models\ChatAttachment;
use App\Models\ChatMessageRead;
use App\Models\ChatOSCard;
use App\Models\ChatNotification;
use App\Models\ChatTypingStatus;
use App\Models\OrdemServico;
use App\Models\User;
use Carbon\Carbon;

class ChatController extends Controller
{
    /**
     * Obter threads do usuário (conversas e grupos)
     */
    public function getThreads(Request $request)
    {
        try {
            $user = Auth::user();
            $tenantId = $user->tenant_id;
            $userId = $user->id;

            // Buscar threads onde o usuário é membro
            $threads = ChatThread::where('tenant_id', $tenantId)
                ->whereHas('members', function($q) use ($userId) {
                    $q->where('user_id', $userId);
                })
                ->with(['lastMessage.user', 'members.user'])
                ->orderBy('updated_at', 'desc')
                ->get();

            // Adicionar contagem de não lidas e última mensagem
            $threads = $threads->map(function($thread) use ($userId) {
                $thread->unread_count = $thread->getUnreadCount($userId);
                $thread->last_message_preview = $thread->lastMessage 
                    ? substr($thread->lastMessage->texto ?? 'Arquivo', 0, 50) 
                    : null;
                return $thread;
            });

            return response()->json([
                'success' => true,
                'data' => $threads,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Erro ao obter conversas',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Criar ou obter thread direta (1:1)
     */
    public function getOrCreateDirectThread(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'user_id' => 'required|exists:users,id',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'errors' => $validator->errors(),
                ], 422);
            }

            $user = Auth::user();
            $tenantId = $user->tenant_id;
            $userId = $user->id;
            $otherUserId = $request->user_id;

            // Verificar se já existe thread direta entre os dois usuários
            $thread = ChatThread::where('tenant_id', $tenantId)
                ->where('tipo', 'direto')
                ->whereHas('members', function($q) use ($userId) {
                    $q->where('user_id', $userId);
                })
                ->whereHas('members', function($q) use ($otherUserId) {
                    $q->where('user_id', $otherUserId);
                })
                ->first();

            if (!$thread) {
                // Criar nova thread
                DB::transaction(function () use ($tenantId, $userId, $otherUserId, &$thread) {
                    $thread = ChatThread::create([
                        'tenant_id' => $tenantId,
                        'tipo' => 'direto',
                        'nome' => null,
                        'is_privado' => true,
                    ]);

                    // Adicionar membros
                    ChatThreadMember::create([
                        'thread_id' => $thread->id,
                        'user_id' => $userId,
                        'role' => 'member',
                    ]);

                    ChatThreadMember::create([
                        'thread_id' => $thread->id,
                        'user_id' => $otherUserId,
                        'role' => 'member',
                    ]);
                });
            }

            $thread->load(['members.user', 'lastMessage']);

            return response()->json([
                'success' => true,
                'data' => $thread,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Erro ao criar/obter conversa',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Criar grupo
     */
    public function createGroup(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'nome' => 'required|string|max:255',
                'setor' => 'nullable|string',
                'descricao' => 'nullable|string',
                'member_ids' => 'required|array|min:1',
                'member_ids.*' => 'exists:users,id',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'errors' => $validator->errors(),
                ], 422);
            }

            $user = Auth::user();
            $tenantId = $user->tenant_id;
            $userId = $user->id;

            DB::transaction(function () use ($request, $tenantId, $userId, &$thread) {
                $thread = ChatThread::create([
                    'tenant_id' => $tenantId,
                    'tipo' => 'grupo',
                    'nome' => $request->nome,
                    'setor' => $request->setor,
                    'descricao' => $request->descricao,
                    'criado_por' => $userId,
                    'is_privado' => false,
                ]);

                // Adicionar criador como admin
                ChatThreadMember::create([
                    'thread_id' => $thread->id,
                    'user_id' => $userId,
                    'role' => 'admin',
                ]);

                // Adicionar membros
                foreach ($request->member_ids as $memberId) {
                    if ($memberId != $userId) {
                        ChatThreadMember::create([
                            'thread_id' => $thread->id,
                            'user_id' => $memberId,
                            'role' => 'member',
                        ]);
                    }
                }
            });

            $thread->load(['members.user']);

            return response()->json([
                'success' => true,
                'data' => $thread,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Erro ao criar grupo',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Obter mensagens de uma thread
     */
    public function getMessages(Request $request, $threadId)
    {
        try {
            $user = Auth::user();
            $userId = $user->id;

            // Verificar se usuário é membro
            $thread = ChatThread::whereHas('members', function($q) use ($userId) {
                $q->where('user_id', $userId);
            })->findOrFail($threadId);

            $perPage = $request->input('per_page', 50);
            $sort = $request->input('sort', 'asc'); // 'asc' ou 'desc'
            
            $query = ChatMessage::where('thread_id', $threadId)
                ->with(['user', 'replyTo.user', 'attachments', 'osCard.ordemServico', 'reads']);

            // Filtrar apenas não lidas se solicitado
            if ($request->boolean('unread_only')) {
                $query->whereDoesntHave('reads', function($q) use ($userId) {
                    $q->where('user_id', $userId);
                });
            }

            // Ordenar
            $query->orderBy('created_at', $sort);

            $messages = $query->paginate($perPage);

            // Marcar mensagens como lidas apenas se não for apenas busca de não lidas
            if (!$request->boolean('unread_only')) {
                $this->markThreadAsRead($threadId, $userId);
            }

            return response()->json([
                'success' => true,
                'data' => $messages,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Erro ao obter mensagens',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Enviar mensagem
     */
    public function sendMessage(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'thread_id' => 'required|exists:chat_threads,id',
                'texto' => 'nullable|string',
                'tipo' => 'required|in:texto,arquivo,audio,os_card',
                'reply_to' => 'nullable|exists:chat_messages,id',
                'is_importante' => 'nullable|boolean',
                'is_urgente' => 'nullable|boolean',
                'ordem_servico_id' => 'nullable|exists:ordens_servico,id',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'errors' => $validator->errors(),
                ], 422);
            }

            $user = Auth::user();
            $userId = $user->id;

            // Verificar se usuário é membro
            $thread = ChatThread::whereHas('members', function($q) use ($userId) {
                $q->where('user_id', $userId);
            })->findOrFail($request->thread_id);

            DB::transaction(function () use ($request, $userId, &$message) {
                $message = ChatMessage::create([
                    'thread_id' => $request->thread_id,
                    'user_id' => $userId,
                    'texto' => $request->texto,
                    'tipo' => $request->tipo,
                    'reply_to' => $request->reply_to,
                    'is_importante' => $request->is_importante ?? false,
                    'is_urgente' => $request->is_urgente ?? false,
                ]);

                // Se for card de OS
                if ($request->tipo === 'os_card' && $request->ordem_servico_id) {
                    $os = OrdemServico::find($request->ordem_servico_id);
                    ChatOSCard::create([
                        'message_id' => $message->id,
                        'ordem_servico_id' => $request->ordem_servico_id,
                        'preview_data' => [
                            'numero_os' => $os->numero_os ?? $os->id_os,
                            'cliente' => $os->cliente->nome_completo ?? 'Cliente',
                            'prazo' => $os->prazo_datahora ?? $os->data_prevista_entrega,
                            'status' => $os->status_os,
                        ],
                    ]);
                }

                // Criar notificações para outros membros
                $this->createNotifications($message, $userId);
            });

            $message->load(['user', 'replyTo.user', 'attachments', 'osCard.ordemServico']);

            // Atualizar timestamp da thread
            $thread->touch();

            return response()->json([
                'success' => true,
                'data' => $message,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Erro ao enviar mensagem',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Upload de arquivo
     */
    public function uploadAttachment(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'thread_id' => 'required|exists:chat_threads,id',
                'file' => 'required|file|max:10240', // 10MB máximo
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'errors' => $validator->errors(),
                ], 422);
            }

            $user = Auth::user();
            $userId = $user->id;

            // Verificar se usuário é membro
            $thread = ChatThread::whereHas('members', function($q) use ($userId) {
                $q->where('user_id', $userId);
            })->findOrFail($request->thread_id);

            $file = $request->file('file');
            $fileName = time() . '_' . $file->getClientOriginalName();
            $path = $file->storeAs('chat/attachments', $fileName, 'public');

            DB::transaction(function () use ($request, $userId, $file, $path, $fileName, &$message) {
                // Criar mensagem
                $message = ChatMessage::create([
                    'thread_id' => $request->thread_id,
                    'user_id' => $userId,
                    'texto' => $file->getClientOriginalName(),
                    'tipo' => 'arquivo',
                ]);

                // Criar anexo
                ChatAttachment::create([
                    'message_id' => $message->id,
                    'file_url' => Storage::url($path),
                    'file_type' => $this->getFileType($file->getClientOriginalExtension()),
                    'file_name' => $file->getClientOriginalName(),
                    'file_size' => $file->getSize(),
                    'mime_type' => $file->getMimeType(),
                ]);

                // Criar notificações
                $this->createNotifications($message, $userId);
            });

            $message->load(['user', 'attachments']);

            return response()->json([
                'success' => true,
                'data' => $message,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Erro ao enviar arquivo',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Marcar thread como lida
     */
    public function markThreadAsRead($threadId, $userId)
    {
        $member = ChatThreadMember::where('thread_id', $threadId)
            ->where('user_id', $userId)
            ->first();

        if ($member) {
            $member->update(['last_read_at' => now()]);
        }
    }

    /**
     * Criar notificações para membros
     */
    private function createNotifications($message, $excludeUserId)
    {
        $thread = $message->thread;
        $members = $thread->members()->where('user_id', '!=', $excludeUserId)->get();

        foreach ($members as $member) {
            ChatNotification::create([
                'user_id' => $member->user_id,
                'message_id' => $message->id,
                'prioridade' => $message->is_urgente ? 'urgente' : ($message->is_importante ? 'alta' : 'normal'),
            ]);
        }
    }

    /**
     * Obter tipo de arquivo
     */
    private function getFileType($extension)
    {
        $imageTypes = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
        $pdfTypes = ['pdf'];
        $designTypes = ['cdr', 'ai', 'eps', 'psd'];
        $zipTypes = ['zip', 'rar', '7z'];

        $ext = strtolower($extension);

        if (in_array($ext, $imageTypes)) return 'imagem';
        if (in_array($ext, $pdfTypes)) return 'pdf';
        if (in_array($ext, $designTypes)) return 'design';
        if (in_array($ext, $zipTypes)) return 'zip';
        
        return 'outro';
    }

    /**
     * Obter contagem de mensagens não lidas
     */
    public function getUnreadCount()
    {
        try {
            $user = Auth::user();
            $userId = $user->id;

            $count = ChatNotification::where('user_id', $userId)
                ->where('lida', false)
                ->count();

            return response()->json([
                'success' => true,
                'data' => ['count' => $count],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Erro ao obter contagem',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Obter mensagens não lidas recentes (para notificações)
     * Retorna últimas mensagens não lidas de cada thread
     */
    public function getRecentUnreadMessages(Request $request)
    {
        try {
            $user = Auth::user();
            $userId = $user->id;
            $tenantId = $user->tenant_id;

            // Limite de tempo: últimas 30 segundos (para evitar notificar mensagens antigas)
            $since = Carbon::now()->subSeconds(30);

            // Buscar threads onde o usuário é membro
            $threadIds = ChatThread::where('tenant_id', $tenantId)
                ->whereHas('members', function($q) use ($userId) {
                    $q->where('user_id', $userId);
                })
                ->pluck('id');

            if ($threadIds->isEmpty()) {
                return response()->json([
                    'success' => true,
                    'data' => [],
                ]);
            }

            // Buscar mensagens não lidas recentes de todas as threads de uma vez (mais eficiente)
            $unreadMessages = ChatMessage::whereIn('thread_id', $threadIds)
                ->where('user_id', '!=', $userId) // Não é mensagem do próprio usuário
                ->where('created_at', '>=', $since) // Mensagem recente
                ->whereDoesntHave('reads', function($q) use ($userId) {
                    $q->where('user_id', $userId);
                })
                ->with(['user', 'osCard.ordemServico', 'thread'])
                ->orderBy('created_at', 'desc')
                ->get()
                ->groupBy('thread_id')
                ->map(function($messages) {
                    // Pegar apenas a mensagem mais recente de cada thread
                    return $messages->first();
                })
                ->values();

            $recentMessages = [];

            foreach ($unreadMessages as $unreadMessage) {
                $thread = $unreadMessage->thread;
                
                $recentMessages[] = [
                    'thread_id' => $thread->id,
                    'thread' => [
                        'id' => $thread->id,
                        'tipo' => $thread->tipo,
                        'nome' => $thread->nome,
                        'ordem_servico_id' => $thread->ordem_servico_id,
                    ],
                    'message' => [
                        'id' => $unreadMessage->id,
                        'texto' => $unreadMessage->texto,
                        'tipo' => $unreadMessage->tipo,
                        'is_urgente' => $unreadMessage->is_urgente ?? false,
                        'is_importante' => $unreadMessage->is_importante ?? false,
                        'created_at' => $unreadMessage->created_at->toISOString(),
                        'user' => [
                            'id' => $unreadMessage->user->id,
                            'name' => $unreadMessage->user->name,
                            'foto_url' => $unreadMessage->user->foto_url ?? null,
                        ],
                        'osCard' => $unreadMessage->osCard ? [
                            'ordem_servico_id' => $unreadMessage->osCard->ordem_servico_id,
                        ] : null,
                    ],
                ];
            }

            return response()->json([
                'success' => true,
                'data' => $recentMessages,
            ]);
        } catch (\Exception $e) {
            \Log::error('Erro ao obter mensagens recentes: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'success' => false,
                'error' => 'Erro ao obter mensagens recentes',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Buscar no chat
     */
    public function search(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'query' => 'required|string|min:2',
                'thread_id' => 'nullable|exists:chat_threads,id',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'errors' => $validator->errors(),
                ], 422);
            }

            $user = Auth::user();
            $userId = $user->id;
            $query = $request->query;

            $messagesQuery = ChatMessage::whereHas('thread.members', function($q) use ($userId) {
                $q->where('user_id', $userId);
            })
            ->where(function($q) use ($query) {
                $q->where('texto', 'like', "%{$query}%")
                  ->orWhereHas('osCard.ordemServico', function($subQ) use ($query) {
                      $subQ->where('numero_os', 'like', "%{$query}%")
                           ->orWhere('id_os', 'like', "%{$query}%");
                  });
            });

            if ($request->thread_id) {
                $messagesQuery->where('thread_id', $request->thread_id);
            }

            $messages = $messagesQuery->with(['user', 'thread', 'osCard'])
                ->orderBy('created_at', 'desc')
                ->limit(50)
                ->get();

            return response()->json([
                'success' => true,
                'data' => $messages,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Erro ao buscar',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Atualizar status "digitando..."
     */
    public function updateTypingStatus(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'thread_id' => 'required|exists:chat_threads,id',
                'is_typing' => 'required|boolean',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'errors' => $validator->errors(),
                ], 422);
            }

            $user = Auth::user();
            $userId = $user->id;

            if ($request->is_typing) {
                ChatTypingStatus::updateOrCreate(
                    [
                        'thread_id' => $request->thread_id,
                        'user_id' => $userId,
                    ],
                    ['typing_at' => now()]
                );
            } else {
                ChatTypingStatus::where('thread_id', $request->thread_id)
                    ->where('user_id', $userId)
                    ->delete();
            }

            return response()->json([
                'success' => true,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Erro ao atualizar status',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Obter usuários digitando
     */
    public function getTypingUsers($threadId)
    {
        try {
            $user = Auth::user();
            $userId = $user->id;

            // Buscar usuários que estão digitando (últimos 3 segundos)
            $typingUsers = ChatTypingStatus::where('thread_id', $threadId)
                ->where('user_id', '!=', $userId)
                ->where('typing_at', '>', now()->subSeconds(3))
                ->with('user')
                ->get()
                ->pluck('user');

            return response()->json([
                'success' => true,
                'data' => $typingUsers,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Erro ao obter status',
                'message' => $e->getMessage(),
            ], 500);
        }
    }
}
