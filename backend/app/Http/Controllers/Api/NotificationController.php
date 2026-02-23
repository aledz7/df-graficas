<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class NotificationController extends Controller
{
    /**
     * Listar notificações
     */
    public function index(Request $request): JsonResponse
    {
        $query = Notification::query();
        
        // Filtrar por tenant (se especificado)
        if ($request->has('tenant_id')) {
            $query->forTenant($request->tenant_id);
        } else {
            $query->forTenant(); // notificações globais
        }
        
        // Filtrar por usuário (se especificado)
        if ($request->has('user_id')) {
            $query->forUser($request->user_id);
        } else {
            $query->forUser(); // notificações globais
        }
        
        // Filtrar por tipo
        if ($request->has('type')) {
            $query->byType($request->type);
        }
        
        // Filtrar por status de leitura
        if ($request->has('read')) {
            if ($request->read === 'true') {
                $query->read();
            } else {
                $query->unread();
            }
        }
        
        // Ordenar por mais recente primeiro
        $notifications = $query->orderBy('created_at', 'desc')->get();
        
        return response()->json([
            'success' => true,
            'data' => $notifications
        ]);
    }

    /**
     * Marcar notificação como lida
     */
    public function markAsRead(Request $request, $id): JsonResponse
    {
        $notification = Notification::findOrFail($id);
        $notification->update([
            'read' => true,
            'read_at' => now()
        ]);
        
        return response()->json([
            'success' => true,
            'message' => 'Notificação marcada como lida'
        ]);
    }

    /**
     * Marcar todas as notificações como lidas
     */
    public function markAllAsRead(Request $request): JsonResponse
    {
        $query = Notification::query();
        
        // Filtrar por tenant (se especificado)
        if ($request->has('tenant_id')) {
            $query->forTenant($request->tenant_id);
        } else {
            $query->forTenant(); // notificações globais
        }
        
        if ($request->has('user_id')) {
            $query->forUser($request->user_id);
        } else {
            $query->forUser(); // notificações globais
        }
        
        $query->unread()->update([
            'read' => true,
            'read_at' => now()
        ]);
        
        return response()->json([
            'success' => true,
            'message' => 'Todas as notificações foram marcadas como lidas'
        ]);
    }

    /**
     * Deletar notificação
     */
    public function destroy($id): JsonResponse
    {
        $notification = Notification::findOrFail($id);
        $notification->delete();
        
        return response()->json([
            'success' => true,
            'message' => 'Notificação deletada'
        ]);
    }

    /**
     * Limpar todas as notificações
     */
    public function clearAll(Request $request): JsonResponse
    {
        $query = Notification::query();
        
        // Filtrar por tenant (se especificado)
        if ($request->has('tenant_id')) {
            $query->forTenant($request->tenant_id);
        } else {
            $query->forTenant(); // notificações globais
        }
        
        if ($request->has('user_id')) {
            $query->forUser($request->user_id);
        } else {
            $query->forUser(); // notificações globais
        }
        
        $query->delete();
        
        return response()->json([
            'success' => true,
            'message' => 'Todas as notificações foram removidas'
        ]);
    }

    /**
     * Criar notificação (para uso interno do sistema)
     */
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'type' => 'required|string',
            'title' => 'required|string',
            'message' => 'required|string',
            'data' => 'nullable|array',
            'user_id' => 'nullable|string',
            'tenant_id' => 'nullable|string'
        ]);

        $notification = Notification::create([
            'type' => $request->type,
            'title' => $request->title,
            'message' => $request->message,
            'data' => $request->data,
            'user_id' => $request->user_id,
            'tenant_id' => $request->tenant_id
        ]);

        return response()->json([
            'success' => true,
            'data' => $notification,
            'message' => 'Notificação criada com sucesso'
        ]);
    }

    /**
     * Contar notificações não lidas
     */
    public function unreadCount(Request $request): JsonResponse
    {
        $query = Notification::query();
        
        // Filtrar por tenant (se especificado)
        if ($request->has('tenant_id')) {
            $query->forTenant($request->tenant_id);
        } else {
            $query->forTenant(); // notificações globais
        }
        
        if ($request->has('user_id')) {
            $query->forUser($request->user_id);
        } else {
            $query->forUser(); // notificações globais
        }
        
        $count = $query->unread()->count();
        
        return response()->json([
            'success' => true,
            'count' => $count
        ]);
    }
} 