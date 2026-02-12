<?php

namespace App\Services;

class AproveitamentoFolhaService
{
    /**
     * Tamanhos padrão de folhas em mm
     */
    const TAMANHOS_FOLHA = [
        'A4' => ['largura' => 210, 'altura' => 297],
        'A3' => ['largura' => 297, 'altura' => 420],
    ];

    /**
     * Calcular aproveitamento da folha
     */
    public function calcular(array $dados)
    {
        // Validar dados
        $this->validarDados($dados);

        // Obter dimensões da folha
        $folha = $this->obterDimensoesFolha($dados['tipo_folha'], $dados['largura_folha'] ?? null, $dados['altura_folha'] ?? null);

        // Obter margens
        $margens = [
            'superior' => $dados['margem_superior_mm'] ?? 0,
            'inferior' => $dados['margem_inferior_mm'] ?? 0,
            'esquerda' => $dados['margem_esquerda_mm'] ?? 0,
            'direita' => $dados['margem_direita_mm'] ?? 0,
        ];

        // Dimensões do item
        $itemLargura = $dados['item_largura_mm'];
        $itemAltura = $dados['item_altura_mm'];

        // Sangria e espaçamento (opcionais)
        $sangria = $dados['sangria_mm'] ?? 0;
        $espacamento = $dados['espacamento_mm'] ?? 0;

        // Calcular área útil da folha
        $areaUtil = $this->calcularAreaUtil($folha, $margens);

        // Calcular sem girar
        $resultadoNormal = $this->calcularQuantidade(
            $areaUtil,
            $itemLargura + ($espacamento * 2),
            $itemAltura + ($espacamento * 2),
            $sangria
        );

        // Calcular girando 90°
        $resultadoGirado = $this->calcularQuantidade(
            $areaUtil,
            $itemAltura + ($espacamento * 2),
            $itemLargura + ($espacamento * 2),
            $sangria
        );

        // Escolher melhor resultado
        $melhorResultado = $resultadoNormal['total'] >= $resultadoGirado['total'] 
            ? $resultadoNormal 
            : $resultadoGirado;

        $melhorResultado['orientacao'] = $resultadoNormal['total'] >= $resultadoGirado['total'] 
            ? 'normal' 
            : 'girado';

        // Calcular percentual de aproveitamento
        $areaItemComEspacamento = ($itemLargura + ($espacamento * 2)) * ($itemAltura + ($espacamento * 2));
        $areaUtilizada = $areaItemComEspacamento * $melhorResultado['total'];
        $percentualAproveitamento = $areaUtil['area_total'] > 0 
            ? ($areaUtilizada / $areaUtil['area_total']) * 100 
            : 0;

        return [
            'folha' => [
                'tipo' => $dados['tipo_folha'],
                'largura_mm' => $folha['largura'],
                'altura_mm' => $folha['altura'],
                'area_total_mm2' => $folha['largura'] * $folha['altura'],
            ],
            'area_util' => $areaUtil,
            'item' => [
                'largura_mm' => $itemLargura,
                'altura_mm' => $itemAltura,
                'area_mm2' => $itemLargura * $itemAltura,
            ],
            'resultado_normal' => array_merge($resultadoNormal, ['orientacao' => 'normal']),
            'resultado_girado' => array_merge($resultadoGirado, ['orientacao' => 'girado']),
            'melhor_resultado' => array_merge($melhorResultado, [
                'percentual_aproveitamento' => round($percentualAproveitamento, 2),
            ]),
        ];
    }

    /**
     * Obter dimensões da folha
     */
    protected function obterDimensoesFolha($tipoFolha, $larguraPersonalizada = null, $alturaPersonalizada = null)
    {
        if ($tipoFolha === 'personalizado') {
            if (!$larguraPersonalizada || !$alturaPersonalizada) {
                throw new \InvalidArgumentException('Largura e altura são obrigatórias para folha personalizada');
            }
            return [
                'largura' => (float) $larguraPersonalizada,
                'altura' => (float) $alturaPersonalizada,
            ];
        }

        if (!isset(self::TAMANHOS_FOLHA[$tipoFolha])) {
            throw new \InvalidArgumentException("Tipo de folha '{$tipoFolha}' não suportado");
        }

        return self::TAMANHOS_FOLHA[$tipoFolha];
    }

    /**
     * Calcular área útil da folha
     */
    protected function calcularAreaUtil(array $folha, array $margens)
    {
        $larguraUtil = $folha['largura'] - $margens['esquerda'] - $margens['direita'];
        $alturaUtil = $folha['altura'] - $margens['superior'] - $margens['inferior'];

        return [
            'largura_mm' => max(0, $larguraUtil),
            'altura_mm' => max(0, $alturaUtil),
            'area_total' => max(0, $larguraUtil) * max(0, $alturaUtil),
        ];
    }

    /**
     * Calcular quantidade de itens que cabem
     */
    protected function calcularQuantidade(array $areaUtil, $itemLargura, $itemAltura, $sangria = 0)
    {
        // Descontar sangria da área útil
        $larguraDisponivel = $areaUtil['largura_mm'] - ($sangria * 2);
        $alturaDisponivel = $areaUtil['altura_mm'] - ($sangria * 2);

        // Calcular quantas colunas cabem
        $colunas = floor($larguraDisponivel / $itemLargura);
        
        // Calcular quantas linhas cabem
        $linhas = floor($alturaDisponivel / $itemAltura);

        // Garantir valores mínimos
        $colunas = max(0, $colunas);
        $linhas = max(0, $linhas);

        return [
            'colunas' => $colunas,
            'linhas' => $linhas,
            'total' => $colunas * $linhas,
        ];
    }

    /**
     * Validar dados de entrada
     */
    protected function validarDados(array $dados)
    {
        if (empty($dados['tipo_folha'])) {
            throw new \InvalidArgumentException('Tipo de folha é obrigatório');
        }

        if (empty($dados['item_largura_mm']) || empty($dados['item_altura_mm'])) {
            throw new \InvalidArgumentException('Largura e altura do item são obrigatórias');
        }

        if ($dados['item_largura_mm'] <= 0 || $dados['item_altura_mm'] <= 0) {
            throw new \InvalidArgumentException('Largura e altura do item devem ser maiores que zero');
        }
    }
}
