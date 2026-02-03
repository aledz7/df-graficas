<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use App\Models\User;

class AparenciaController extends BaseController
{
    /**
     * Obtém o tema atual do usuário
     */
    public function getTheme()
    {
        try {
            $user = auth()->user();
            $theme = $user->theme ?? 'light';

            return $this->success([
                'theme' => $theme
            ]);
        } catch (\Exception $e) {
            return $this->error('Erro ao obter tema: ' . $e->getMessage());
        }
    }

    /**
     * Atualiza o tema do usuário
     */
    public function updateTheme(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'theme' => 'required|string|max:100',
        ]);

        if ($validator->fails()) {
            return $this->validationError($validator->errors());
        }

        try {
            $user = auth()->user();
            $user->theme = $request->theme;
            $user->save();

            return $this->success([
                'theme' => $user->theme
            ], 'Tema atualizado com sucesso');
        } catch (\Exception $e) {
            return $this->error('Erro ao atualizar tema: ' . $e->getMessage());
        }
    }

    /**
     * Lista todos os temas disponíveis
     */
    public function getAvailableThemes()
    {
        $themes = [
            ['value' => 'light', 'label' => 'Claro (Neutro)', 'description' => 'Um tema claro e limpo, ideal para ambientes bem iluminados.'],
            ['value' => 'dark', 'label' => 'Escuro (Neutro)', 'description' => 'Um tema escuro elegante, confortável para visualização noturna.'],
        ];

        return $this->success($themes);
    }
}
