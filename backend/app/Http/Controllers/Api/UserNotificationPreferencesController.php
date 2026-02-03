<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;

class UserNotificationPreferencesController extends Controller
{
    /**
     * Obter as preferências de notificação do usuário autenticado
     */
    public function index(): JsonResponse
    {
        $user = Auth::user();
        
        return response()->json([
            'success' => true,
            'data' => [
                'email_notifications' => $user->email_notifications ?? true,
                'system_alerts' => $user->system_alerts ?? true,
            ]
        ]);
    }

    /**
     * Atualizar as preferências de notificação do usuário autenticado
     */
    public function update(Request $request): JsonResponse
    {
        $request->validate([
            'email_notifications' => 'boolean',
            'system_alerts' => 'boolean',
        ]);

        $user = Auth::user();
        
        $user->update([
            'email_notifications' => $request->boolean('email_notifications'),
            'system_alerts' => $request->boolean('system_alerts'),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Preferências de notificação atualizadas com sucesso',
            'data' => [
                'email_notifications' => $user->email_notifications,
                'system_alerts' => $user->system_alerts,
            ]
        ]);
    }
}
