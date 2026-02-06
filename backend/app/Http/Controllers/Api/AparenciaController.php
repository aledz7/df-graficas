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

    /**
     * Obtém as cores personalizadas do dashboard
     */
    public function getDashboardColors()
    {
        try {
            $user = auth()->user();
            $colors = $user->dashboard_colors ?? $this->getDefaultDashboardColors();

            return $this->success([
                'colors' => $colors
            ]);
        } catch (\Exception $e) {
            return $this->error('Erro ao obter cores do dashboard: ' . $e->getMessage());
        }
    }

    /**
     * Atualiza as cores personalizadas do dashboard
     */
    public function updateDashboardColors(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'colors' => 'required|array',
            'colors.vendasDia' => 'required|string|max:50',
            'colors.osAberto' => 'required|string|max:50',
            'colors.orcEnvelopamento' => 'required|string|max:50',
            'colors.estoqueBaixo' => 'required|string|max:50',
        ]);

        if ($validator->fails()) {
            return $this->validationError($validator->errors());
        }

        try {
            $user = auth()->user();
            $user->dashboard_colors = $request->colors;
            $user->save();

            return $this->success([
                'colors' => $user->dashboard_colors
            ], 'Cores do dashboard atualizadas com sucesso');
        } catch (\Exception $e) {
            return $this->error('Erro ao atualizar cores do dashboard: ' . $e->getMessage());
        }
    }

    /**
     * Reseta as cores do dashboard para o padrão
     */
    public function resetDashboardColors()
    {
        try {
            $user = auth()->user();
            $user->dashboard_colors = null;
            $user->save();

            return $this->success([
                'colors' => $this->getDefaultDashboardColors()
            ], 'Cores do dashboard resetadas para o padrão');
        } catch (\Exception $e) {
            return $this->error('Erro ao resetar cores do dashboard: ' . $e->getMessage());
        }
    }

    /**
     * Lista as cores disponíveis para o dashboard
     */
    public function getAvailableDashboardColors()
    {
        $colors = [
            ['value' => 'green', 'label' => 'Verde', 'hex' => '#22c55e'],
            ['value' => 'blue', 'label' => 'Azul', 'hex' => '#3b82f6'],
            ['value' => 'indigo', 'label' => 'Índigo', 'hex' => '#6366f1'],
            ['value' => 'purple', 'label' => 'Roxo', 'hex' => '#a855f7'],
            ['value' => 'pink', 'label' => 'Rosa', 'hex' => '#ec4899'],
            ['value' => 'red', 'label' => 'Vermelho', 'hex' => '#ef4444'],
            ['value' => 'orange', 'label' => 'Laranja', 'hex' => '#f97316'],
            ['value' => 'amber', 'label' => 'Âmbar', 'hex' => '#f59e0b'],
            ['value' => 'yellow', 'label' => 'Amarelo', 'hex' => '#eab308'],
            ['value' => 'lime', 'label' => 'Lima', 'hex' => '#84cc16'],
            ['value' => 'emerald', 'label' => 'Esmeralda', 'hex' => '#10b981'],
            ['value' => 'teal', 'label' => 'Teal', 'hex' => '#14b8a6'],
            ['value' => 'cyan', 'label' => 'Ciano', 'hex' => '#06b6d4'],
            ['value' => 'sky', 'label' => 'Céu', 'hex' => '#0ea5e9'],
            ['value' => 'violet', 'label' => 'Violeta', 'hex' => '#8b5cf6'],
            ['value' => 'fuchsia', 'label' => 'Fúcsia', 'hex' => '#d946ef'],
            ['value' => 'rose', 'label' => 'Rosê', 'hex' => '#f43f5e'],
            ['value' => 'slate', 'label' => 'Ardósia', 'hex' => '#64748b'],
            ['value' => 'gray', 'label' => 'Cinza', 'hex' => '#6b7280'],
            ['value' => 'zinc', 'label' => 'Zinco', 'hex' => '#71717a'],
            ['value' => 'black', 'label' => 'Preto', 'hex' => '#18181b'],
        ];

        return $this->success($colors);
    }

    /**
     * Retorna as cores padrão do dashboard
     */
    private function getDefaultDashboardColors()
    {
        return [
            'vendasDia' => 'green',
            'osAberto' => 'indigo',
            'orcEnvelopamento' => 'purple',
            'estoqueBaixo' => 'orange',
        ];
    }

    /**
     * Obtém as cores personalizadas das Ações Rápidas
     */
    public function getQuickActionsColors()
    {
        try {
            $user = auth()->user();
            $colors = $user->quick_actions_colors ?? $this->getDefaultQuickActionsColors();

            return $this->success([
                'colors' => $colors
            ]);
        } catch (\Exception $e) {
            return $this->error('Erro ao obter cores das ações rápidas: ' . $e->getMessage());
        }
    }

    /**
     * Atualiza as cores personalizadas das Ações Rápidas
     */
    public function updateQuickActionsColors(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'colors' => 'required|array',
            'colors.novoPdv' => 'required|string|max:50',
            'colors.novoProduto' => 'required|string|max:50',
            'colors.novaOs' => 'required|string|max:50',
            'colors.novoEnvelopamento' => 'required|string|max:50',
            'colors.novoCliente' => 'required|string|max:50',
            'colors.relatorios' => 'required|string|max:50',
        ]);

        if ($validator->fails()) {
            return $this->validationError($validator->errors());
        }

        try {
            $user = auth()->user();
            $user->quick_actions_colors = $request->colors;
            $user->save();

            return $this->success([
                'colors' => $user->quick_actions_colors
            ], 'Cores das ações rápidas atualizadas com sucesso');
        } catch (\Exception $e) {
            return $this->error('Erro ao atualizar cores das ações rápidas: ' . $e->getMessage());
        }
    }

    /**
     * Reseta as cores das Ações Rápidas para o padrão
     */
    public function resetQuickActionsColors()
    {
        try {
            $user = auth()->user();
            $user->quick_actions_colors = null;
            $user->save();

            return $this->success([
                'colors' => $this->getDefaultQuickActionsColors()
            ], 'Cores das ações rápidas resetadas para o padrão');
        } catch (\Exception $e) {
            return $this->error('Erro ao resetar cores das ações rápidas: ' . $e->getMessage());
        }
    }

    /**
     * Retorna as cores padrão das Ações Rápidas
     */
    private function getDefaultQuickActionsColors()
    {
        return [
            'novoPdv' => 'blue',
            'novoProduto' => 'green',
            'novaOs' => 'orange',
            'novoEnvelopamento' => 'purple',
            'novoCliente' => 'indigo',
            'relatorios' => 'red',
        ];
    }
}
