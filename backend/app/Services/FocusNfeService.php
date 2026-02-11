<?php

namespace App\Services;

use App\Models\Configuracao;
use App\Models\Empresa;
use App\Models\OrdemServico;
use App\Models\NotaFiscal;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class FocusNfeService
{
    /**
     * URLs base da API
     */
    const URL_PRODUCAO = 'https://api.focusnfe.com.br';
    const URL_HOMOLOGACAO = 'https://homologacao.focusnfe.com.br';

    /**
     * Obtém o token da API das configurações
     */
    protected function getToken(): ?string
    {
        return Configuracao::getValor('nfe', 'token_api');
    }

    /**
     * Obtém a URL base conforme ambiente (1=produção, 2=homologação)
     */
    protected function getBaseUrl(): string
    {
        $ambiente = Configuracao::getValor('nfe', 'ambiente', '2');
        return $ambiente === '1' ? self::URL_PRODUCAO : self::URL_HOMOLOGACAO;
    }

    /**
     * Faz uma requisição HTTP para a API
     */
    protected function request(string $method, string $endpoint, array $data = []): array
    {
        $token = $this->getToken();
        
        if (!$token) {
            return [
                'sucesso' => false,
                'erro' => 'Token da API de emissão não configurado. Acesse Configurações > Nota Fiscal para configurar.',
            ];
        }

        $url = $this->getBaseUrl() . $endpoint;
        $tokenMasked = substr($token, 0, 6) . '...' . substr($token, -4);

        // Montar info de debug (curl equivalente)
        $debugInfo = [
            'method' => $method,
            'url' => $url,
            'token_masked' => $tokenMasked,
            'payload_enviado' => $data,
            'curl_equivalente' => $this->gerarCurlEquivalente($method, $url, $token, $data),
        ];

        try {
            $response = Http::withBasicAuth($token, '')
                ->acceptJson()
                ->timeout(60);

            if ($method === 'GET') {
                $response = $response->get($url);
            } elseif ($method === 'POST') {
                $response = $response->post($url, $data);
            } elseif ($method === 'DELETE') {
                $response = $response->delete($url, $data);
            }

            $body = $response->json() ?? [];

            $debugInfo['status_http'] = $response->status();
            $debugInfo['response_headers'] = $response->headers();
            $debugInfo['response_body'] = $body;

            Log::info("API Fiscal [{$method}] {$endpoint}", [
                'status' => $response->status(),
                'body' => $body,
                'payload' => $data,
                'url' => $url,
            ]);

            if ($response->successful()) {
                return [
                    'sucesso' => true,
                    'status_http' => $response->status(),
                    'dados' => $body,
                    'debug' => $debugInfo,
                ];
            }

            return [
                'sucesso' => false,
                'status_http' => $response->status(),
                'erro' => $body['mensagem'] ?? 'Erro na comunicação com a API de emissão.',
                'codigo' => $body['codigo'] ?? null,
                'erros' => $body['erros'] ?? [],
                'dados' => $body,
                'debug' => $debugInfo,
            ];
        } catch (\Exception $e) {
            Log::error("API Fiscal - Exceção: {$e->getMessage()}", [
                'endpoint' => $endpoint,
                'method' => $method,
            ]);

            $debugInfo['exception'] = $e->getMessage();

            return [
                'sucesso' => false,
                'erro' => 'Erro de comunicação com a API de emissão: ' . $e->getMessage(),
                'debug' => $debugInfo,
            ];
        }
    }

    /**
     * Gera uma referência única para a nota
     */
    public function gerarReferencia(string $tipo, int $osId): string
    {
        return "{$tipo}-os{$osId}-" . time();
    }

    /**
     * Obtém dados da empresa atual (emitente)
     */
    protected function getDadosEmpresa(): ?Empresa
    {
        return Empresa::getEmpresaAtual();
    }

    /**
     * Obtém configurações do grupo NFe
     */
    protected function getConfigsNfe(): array
    {
        $configs = Configuracao::where('grupo', 'nfe')->get();
        $result = [];
        foreach ($configs as $config) {
            $result[$config->chave] = $config->valor;
        }
        return $result;
    }

    // =============================
    // NFe - Nota Fiscal Eletrônica
    // =============================

    /**
     * Emitir NFe a partir de uma Ordem de Serviço
     */
    public function emitirNFe(OrdemServico $os, array $dadosAdicionais = []): array
    {
        $empresa = $this->getDadosEmpresa();
        if (!$empresa) {
            return ['sucesso' => false, 'erro' => 'Dados da empresa não encontrados. Acesse Configurações > Dados da Empresa para preencher.'];
        }

        // Validar dados obrigatórios do emitente (empresa)
        $errosEmitente = [];
        if (!$empresa->cnpj) {
            $errosEmitente[] = 'CNPJ';
        }
        if (!$empresa->razao_social && !$empresa->nome_fantasia) {
            $errosEmitente[] = 'Razão Social';
        }
        if (!$empresa->inscricao_estadual) {
            $errosEmitente[] = 'Inscrição Estadual';
        }
        if (!$empresa->logradouro) {
            $errosEmitente[] = 'Logradouro';
        }
        if (!$empresa->bairro) {
            $errosEmitente[] = 'Bairro';
        }
        if (!$empresa->cidade) {
            $errosEmitente[] = 'Cidade';
        }
        if (!$empresa->estado) {
            $errosEmitente[] = 'Estado (UF)';
        }
        if (!$empresa->cep) {
            $errosEmitente[] = 'CEP';
        }

        if (!empty($errosEmitente)) {
            $campos = implode(', ', $errosEmitente);
            return [
                'sucesso' => false,
                'erro' => "Dados da empresa incompletos para emissão de NFe. Campos faltando: {$campos}. Acesse Configurações > Dados da Empresa para preencher.",
            ];
        }

        $os->load(['cliente', 'itens']);
        $cliente = $os->cliente;

        if (!$cliente) {
            return ['sucesso' => false, 'erro' => 'Cliente da OS não encontrado. Vincule um cliente à OS antes de emitir a nota.'];
        }

        // Validar dados do destinatário (cliente)
        $errosDestinatario = [];
        if (!$cliente->cpf_cnpj) {
            $errosDestinatario[] = 'CPF/CNPJ';
        }
        if (!$cliente->nome_completo && !$cliente->apelido_fantasia) {
            $errosDestinatario[] = 'Nome';
        }
        if (!$cliente->logradouro) {
            $errosDestinatario[] = 'Logradouro';
        }
        if (!$cliente->bairro) {
            $errosDestinatario[] = 'Bairro';
        }
        if (!$cliente->cidade) {
            $errosDestinatario[] = 'Cidade';
        }
        if (!$cliente->estado) {
            $errosDestinatario[] = 'Estado (UF)';
        }
        if (!$cliente->cep) {
            $errosDestinatario[] = 'CEP';
        }

        if (!empty($errosDestinatario)) {
            $campos = implode(', ', $errosDestinatario);
            return [
                'sucesso' => false,
                'erro' => "Dados do cliente incompletos para emissão de NFe. Campos faltando: {$campos}. Edite o cadastro do cliente para preencher.",
            ];
        }

        if ($os->itens->isEmpty()) {
            return ['sucesso' => false, 'erro' => 'A OS não possui itens. Adicione ao menos um item antes de emitir a nota.'];
        }

        $configs = $this->getConfigsNfe();
        $referencia = $this->gerarReferencia('nfe', $os->id);

        // Montar payload NFe
        $payload = $this->montarPayloadNFe($empresa, $cliente, $os, $configs, $dadosAdicionais);

        $response = $this->request('POST', "/v2/nfe?ref={$referencia}", $payload);

        // Traduzir erros comuns da API para mensagens mais amigáveis
        if (!($response['sucesso'] ?? false)) {
            $response = $this->traduzirErroApi($response, 'nfe');
        }

        return array_merge($response, [
            'referencia' => $referencia,
            'payload_enviado' => $payload,
        ]);
    }

    /**
     * Monta o payload da NFe
     */
    protected function montarPayloadNFe(Empresa $empresa, $cliente, OrdemServico $os, array $configs, array $dadosAdicionais = []): array
    {
        $cnpjEmitente = preg_replace('/\D/', '', $empresa->cnpj);
        $cpfCnpjDestinatario = preg_replace('/\D/', '', $cliente->cpf_cnpj ?? '');
        $isDestinatarioPJ = strlen($cpfCnpjDestinatario) === 14;

        // Dados gerais
        $payload = [
            'natureza_operacao' => $dadosAdicionais['natureza_operacao'] ?? $configs['natureza_operacao'] ?? 'Venda',
            'data_emissao' => now()->format('Y-m-d\TH:i:sP'),
            'tipo_documento' => 1, // Saída
            'finalidade_emissao' => 1, // Normal
            'consumidor_final' => $isDestinatarioPJ ? 0 : 1,
            'presenca_comprador' => $dadosAdicionais['presenca_comprador'] ?? 1, // Presencial
            'local_destino' => $this->determinarLocalDestino($empresa, $cliente),
        ];

        // Emitente
        $payload['cnpj_emitente'] = $cnpjEmitente;
        $payload['nome_emitente'] = $empresa->razao_social ?? $empresa->nome_fantasia;
        $payload['nome_fantasia_emitente'] = $empresa->nome_fantasia;
        $payload['inscricao_estadual_emitente'] = preg_replace('/\D/', '', $empresa->inscricao_estadual ?? '');
        $payload['logradouro_emitente'] = $empresa->logradouro ?? '';
        $payload['numero_emitente'] = $empresa->numero_endereco ?? 'S/N';
        $payload['bairro_emitente'] = $empresa->bairro ?? '';
        $payload['municipio_emitente'] = $empresa->cidade ?? '';
        $payload['uf_emitente'] = $empresa->estado ?? '';
        $payload['cep_emitente'] = preg_replace('/\D/', '', $empresa->cep ?? '');
        $payload['regime_tributario_emitente'] = $dadosAdicionais['regime_tributario'] ?? $configs['regime_tributario'] ?? $empresa->regime_tributario ?? '1';

        if ($empresa->codigo_municipio_ibge) {
            $payload['codigo_municipio_emitente'] = $empresa->codigo_municipio_ibge;
        }
        if ($empresa->telefone) {
            $payload['telefone_emitente'] = preg_replace('/\D/', '', $empresa->telefone);
        }

        // Destinatário
        if ($isDestinatarioPJ) {
            $payload['cnpj_destinatario'] = $cpfCnpjDestinatario;
        } else {
            $payload['cpf_destinatario'] = $cpfCnpjDestinatario;
        }
        $payload['nome_destinatario'] = $cliente->nome_completo ?? $cliente->apelido_fantasia ?? '';
        $payload['logradouro_destinatario'] = $cliente->logradouro ?? '';
        $payload['numero_destinatario'] = $cliente->numero ?? 'S/N';
        $payload['bairro_destinatario'] = $cliente->bairro ?? '';
        $payload['municipio_destinatario'] = $cliente->cidade ?? '';
        $payload['uf_destinatario'] = $cliente->estado ?? '';
        $payload['cep_destinatario'] = preg_replace('/\D/', '', $cliente->cep ?? '');

        if ($cliente->codigo_municipio_ibge) {
            $payload['codigo_municipio_destinatario'] = $cliente->codigo_municipio_ibge;
        }

        if ($cliente->rg_ie) {
            $payload['inscricao_estadual_destinatario'] = preg_replace('/\D/', '', $cliente->rg_ie);
            $payload['indicador_inscricao_estadual_destinatario'] = 1; // Contribuinte
        } else {
            $payload['indicador_inscricao_estadual_destinatario'] = 9; // Não contribuinte
        }

        if ($cliente->email) {
            $payload['email_destinatario'] = $cliente->email;
        }
        if ($cliente->telefone_principal) {
            $payload['telefone_destinatario'] = preg_replace('/\D/', '', $cliente->telefone_principal);
        }

        // Itens
        $items = [];
        $valorTotalProdutos = 0;
        $itens = $os->itens ?? [];
        
        foreach ($itens as $index => $item) {
            $valorBruto = (float) ($item->valor_total ?? ($item->quantidade * $item->valor_unitario));
            $valorTotalProdutos += $valorBruto;

            $itemPayload = [
                'numero_item' => $index + 1,
                'codigo_produto' => (string) ($item->produto_id ?? $item->id),
                'descricao' => $item->nome_servico_produto ?? 'Serviço',
                'cfop' => $dadosAdicionais['cfop'] ?? $configs['cfop_padrao'] ?? '5102',
                'unidade_comercial' => $item->tipo_item === 'm2' ? 'M2' : ($item->tipo_item === 'ml' ? 'ML' : 'UN'),
                'quantidade_comercial' => (float) $item->quantidade,
                'valor_unitario_comercial' => round((float) $item->valor_unitario, 4),
                'valor_unitario_tributavel' => round((float) $item->valor_unitario, 4),
                'unidade_tributavel' => $item->tipo_item === 'm2' ? 'M2' : ($item->tipo_item === 'ml' ? 'ML' : 'UN'),
                'codigo_ncm' => $dadosAdicionais['codigo_ncm'] ?? $configs['codigo_ncm_padrao'] ?? '49111090',
                'quantidade_tributavel' => (float) $item->quantidade,
                'valor_bruto' => round($valorBruto, 2),
                'inclui_no_total' => 1,
                'icms_origem' => 0, // Nacional
                'icms_situacao_tributaria' => $dadosAdicionais['icms_situacao_tributaria'] ?? $configs['icms_situacao_tributaria'] ?? '102',
                'pis_situacao_tributaria' => $dadosAdicionais['pis_situacao_tributaria'] ?? $configs['pis_situacao_tributaria'] ?? '07',
                'cofins_situacao_tributaria' => $dadosAdicionais['cofins_situacao_tributaria'] ?? $configs['cofins_situacao_tributaria'] ?? '07',
            ];

            $items[] = $itemPayload;
        }

        $payload['items'] = $items;

        // Valores totais
        $frete = (float) ($os->frete_valor ?? 0);
        $desconto = $this->calcularDescontoTotal($os);
        
        $payload['valor_produtos'] = round($valorTotalProdutos, 2);
        $payload['valor_total'] = round($valorTotalProdutos + $frete - $desconto, 2);
        
        if ($frete > 0) {
            $payload['valor_frete'] = round($frete, 2);
        }
        if ($desconto > 0) {
            $payload['valor_desconto'] = round($desconto, 2);
        }
        
        $payload['modalidade_frete'] = $dadosAdicionais['modalidade_frete'] ?? 9; // Sem frete

        // Informações adicionais
        if (!empty($os->observacoes)) {
            $payload['informacoes_adicionais_contribuinte'] = substr($os->observacoes, 0, 2000);
        }

        return $payload;
    }

    /**
     * Determina o local de destino da operação
     */
    protected function determinarLocalDestino(Empresa $empresa, $cliente): int
    {
        $ufEmitente = strtoupper($empresa->estado ?? '');
        $ufDestinatario = strtoupper($cliente->estado ?? '');

        if (empty($ufEmitente) || empty($ufDestinatario)) {
            return 1; // Operação interna (padrão)
        }

        return $ufEmitente === $ufDestinatario ? 1 : 2; // 1=interna, 2=interestadual
    }

    /**
     * Calcula o desconto total da OS
     */
    protected function calcularDescontoTotal(OrdemServico $os): float
    {
        $descontoGeral = 0;
        if ($os->desconto_geral_valor) {
            if ($os->desconto_geral_tipo === 'percentual') {
                // Calcular o percentual sobre o valor total dos itens
                $valorItens = $os->itens->sum(function ($item) {
                    return (float) ($item->valor_total ?? ($item->quantidade * $item->valor_unitario));
                });
                $descontoGeral = $valorItens * ((float) $os->desconto_geral_valor / 100);
            } else {
                $descontoGeral = (float) $os->desconto_geral_valor;
            }
        }
        return $descontoGeral;
    }

    /**
     * Consultar NFe pelo referência
     */
    public function consultarNFe(string $referencia): array
    {
        return $this->request('GET', "/v2/nfe/{$referencia}");
    }

    /**
     * Cancelar NFe
     */
    public function cancelarNFe(string $referencia, string $justificativa): array
    {
        return $this->request('DELETE', "/v2/nfe/{$referencia}", [
            'justificativa' => $justificativa,
        ]);
    }

    // =============================
    // NFSe - Nota Fiscal de Serviço
    // =============================

    /**
     * Emitir NFSe a partir de uma Ordem de Serviço
     */
    public function emitirNFSe(OrdemServico $os, array $dadosAdicionais = []): array
    {
        $empresa = $this->getDadosEmpresa();
        if (!$empresa) {
            return ['sucesso' => false, 'erro' => 'Dados da empresa não encontrados. Acesse Configurações > Dados da Empresa para preencher.'];
        }

        // Validar dados obrigatórios do prestador (empresa)
        $errosPrestador = [];
        if (!$empresa->cnpj) {
            $errosPrestador[] = 'CNPJ';
        }
        if (!$empresa->inscricao_municipal) {
            $errosPrestador[] = 'Inscrição Municipal';
        }
        if (!$empresa->razao_social && !$empresa->nome_fantasia) {
            $errosPrestador[] = 'Razão Social';
        }
        if (!$empresa->codigo_municipio_ibge) {
            $errosPrestador[] = 'Código do Município IBGE';
        }

        if (!empty($errosPrestador)) {
            $campos = implode(', ', $errosPrestador);
            return [
                'sucesso' => false,
                'erro' => "Dados da empresa incompletos para emissão de NFSe. Campos faltando: {$campos}. Acesse Configurações > Dados da Empresa para preencher.",
            ];
        }

        $os->load(['cliente', 'itens']);
        $cliente = $os->cliente;

        if (!$cliente) {
            return ['sucesso' => false, 'erro' => 'Cliente da OS não encontrado. Vincule um cliente à OS antes de emitir a nota.'];
        }

        // Validar dados do tomador (cliente)
        $errosTomador = [];
        if (!$cliente->cpf_cnpj) {
            $errosTomador[] = 'CPF/CNPJ';
        }
        if (!$cliente->nome_completo && !$cliente->apelido_fantasia) {
            $errosTomador[] = 'Nome';
        }

        if (!empty($errosTomador)) {
            $campos = implode(', ', $errosTomador);
            return [
                'sucesso' => false,
                'erro' => "Dados do cliente incompletos para emissão de NFSe. Campos faltando: {$campos}. Edite o cadastro do cliente para preencher.",
            ];
        }

        // Validar configurações fiscais
        $configs = $this->getConfigsNfe();
        $errosConfig = [];
        if (empty($configs['codigo_tributario_municipio'] ?? '') && empty($dadosAdicionais['codigo_tributario_municipio'] ?? '')) {
            $errosConfig[] = 'Código Tributário do Município';
        }
        if (empty($configs['item_lista_servico'] ?? '') && empty($dadosAdicionais['item_lista_servico'] ?? '')) {
            $errosConfig[] = 'Item da Lista de Serviço';
        }

        if (!empty($errosConfig)) {
            $campos = implode(', ', $errosConfig);
            return [
                'sucesso' => false,
                'erro' => "Configurações fiscais incompletas para NFSe. Campos faltando: {$campos}. Acesse Configurações > Nota Fiscal para preencher.",
            ];
        }

        if ($os->itens->isEmpty()) {
            return ['sucesso' => false, 'erro' => 'A OS não possui itens. Adicione ao menos um item antes de emitir a nota.'];
        }

        $referencia = $this->gerarReferencia('nfse', $os->id);

        // Montar payload NFSe
        $payload = $this->montarPayloadNFSe($empresa, $cliente, $os, $configs, $dadosAdicionais);

        $response = $this->request('POST', "/v2/nfse?ref={$referencia}", $payload);

        // Traduzir erros comuns da API para mensagens mais amigáveis
        if (!($response['sucesso'] ?? false)) {
            $response = $this->traduzirErroApi($response, 'nfse');
        }

        return array_merge($response, [
            'referencia' => $referencia,
            'payload_enviado' => $payload,
        ]);
    }

    /**
     * Monta o payload da NFSe (formato v2 da API - objetos aninhados)
     */
    protected function montarPayloadNFSe(Empresa $empresa, $cliente, OrdemServico $os, array $configs, array $dadosAdicionais = []): array
    {
        $cnpjPrestador = preg_replace('/\D/', '', $empresa->cnpj);
        $cpfCnpjTomador = preg_replace('/\D/', '', $cliente->cpf_cnpj ?? '');
        $isTomadorPJ = strlen($cpfCnpjTomador) === 14;

        // Calcular valor total dos serviços
        $valorServicos = $os->itens->sum(function ($item) {
            return (float) ($item->valor_total ?? ($item->quantidade * $item->valor_unitario));
        });

        $desconto = $this->calcularDescontoTotal($os);
        $valorLiquido = $valorServicos - $desconto;

        // Montar discriminação dos serviços
        $discriminacao = $this->montarDiscriminacaoNFSe($os);

        // Prestador (empresa emissora)
        $prestador = [
            'cnpj' => $cnpjPrestador,
            'inscricao_municipal' => preg_replace('/\D/', '', $empresa->inscricao_municipal ?? ''),
            'codigo_municipio' => $empresa->codigo_municipio_ibge ?? '',
        ];

        // Tomador (cliente)
        $tomador = [
            'razao_social' => $cliente->nome_completo ?? $cliente->apelido_fantasia ?? '',
            'endereco' => [
                'logradouro' => $cliente->logradouro ?? '',
                'numero' => $cliente->numero ?? $cliente->numero_endereco ?? 'S/N',
                'bairro' => $cliente->bairro ?? '',
                'codigo_municipio' => $cliente->codigo_municipio_ibge ?? '',
                'uf' => $cliente->estado ?? '',
                'cep' => preg_replace('/\D/', '', $cliente->cep ?? ''),
            ],
        ];

        // CPF/CNPJ do tomador
        if ($isTomadorPJ) {
            $tomador['cnpj'] = $cpfCnpjTomador;
        } else {
            $tomador['cpf'] = $cpfCnpjTomador;
        }

        // Email do tomador
        if ($cliente->email) {
            $tomador['email'] = $cliente->email;
        }
        if ($cliente->telefone_principal) {
            $tomador['telefone'] = preg_replace('/\D/', '', $cliente->telefone_principal);
        }

        // Complemento do endereço do tomador
        if (!empty($cliente->complemento)) {
            $tomador['endereco']['complemento'] = $cliente->complemento;
        }

        // Serviço
        $servico = [
            'discriminacao' => $discriminacao,
            'valor_servicos' => round($valorServicos, 2),
            'base_calculo' => round($valorLiquido, 2),
            'aliquota' => (float) ($dadosAdicionais['aliquota_iss'] ?? $configs['aliquota_iss'] ?? 0),
            'iss_retido' => $dadosAdicionais['iss_retido'] ?? 'false',
            'codigo_tributario_municipio' => $dadosAdicionais['codigo_tributario_municipio'] ?? $configs['codigo_tributario_municipio'] ?? '',
            'item_lista_servico' => $dadosAdicionais['item_lista_servico'] ?? $configs['item_lista_servico'] ?? '',
        ];

        // Desconto
        if ($desconto > 0) {
            $servico['desconto_condicionado'] = round($desconto, 2);
        }

        $payload = [
            'data_emissao' => now()->toIso8601String(),
            'prestador' => $prestador,
            'tomador' => $tomador,
            'servico' => $servico,
        ];

        // Natureza da operação (se configurado)
        $naturezaOperacao = $dadosAdicionais['natureza_operacao'] ?? $configs['natureza_operacao'] ?? '';
        if (!empty($naturezaOperacao)) {
            $payload['natureza_operacao'] = $naturezaOperacao;
        }

        return $payload;
    }

    /**
     * Monta a discriminação dos serviços para NFSe
     */
    protected function montarDiscriminacaoNFSe(OrdemServico $os): string
    {
        $linhas = [];
        $linhas[] = "OS #{$os->id_os}";

        foreach ($os->itens as $item) {
            $qtd = (float) $item->quantidade;
            $valor = (float) $item->valor_unitario;
            $total = (float) ($item->valor_total ?? ($qtd * $valor));
            $nome = $item->nome_servico_produto ?? 'Serviço';

            $linhas[] = "{$nome} - Qtd: {$qtd} x R$ " . number_format($valor, 2, ',', '.') . " = R$ " . number_format($total, 2, ',', '.');
        }

        if ($os->observacoes) {
            $linhas[] = "Obs: {$os->observacoes}";
        }

        return implode("\n", $linhas);
    }

    /**
     * Consultar NFSe pela referência
     */
    public function consultarNFSe(string $referencia): array
    {
        return $this->request('GET', "/v2/nfse/{$referencia}");
    }

    /**
     * Cancelar NFSe
     */
    public function cancelarNFSe(string $referencia, string $justificativa): array
    {
        return $this->request('DELETE', "/v2/nfse/{$referencia}", [
            'justificativa' => $justificativa,
        ]);
    }

    // =============================
    // Métodos auxiliares genéricos
    // =============================

    /**
     * Consultar nota fiscal pela referência (detecta tipo)
     */
    public function consultar(string $referencia, string $tipo): array
    {
        return $tipo === 'nfse'
            ? $this->consultarNFSe($referencia)
            : $this->consultarNFe($referencia);
    }

    /**
     * Cancelar nota fiscal pela referência (detecta tipo)
     */
    public function cancelar(string $referencia, string $tipo, string $justificativa): array
    {
        return $tipo === 'nfse'
            ? $this->cancelarNFSe($referencia, $justificativa)
            : $this->cancelarNFe($referencia, $justificativa);
    }

    /**
     * Emitir nota fiscal (detecta tipo)
     */
    public function emitir(OrdemServico $os, string $tipo, array $dadosAdicionais = []): array
    {
        return $tipo === 'nfse'
            ? $this->emitirNFSe($os, $dadosAdicionais)
            : $this->emitirNFe($os, $dadosAdicionais);
    }

    /**
     * Testar conexão com a API
     */
    public function testarConexao(): array
    {
        $token = $this->getToken();
        
        if (!$token) {
            return [
                'sucesso' => false,
                'erro' => 'Token da API não configurado.',
            ];
        }

        // Tentar consultar uma referência inexistente - se retorna 404, a conexão está ok
        $response = $this->request('GET', '/v2/nfe/teste-conexao-' . time());

        // 404 = token válido, referência não encontrada (esperado)
        if (isset($response['status_http']) && $response['status_http'] === 404) {
            return [
                'sucesso' => true,
                'mensagem' => 'Conexão com a API de emissão estabelecida com sucesso.',
            ];
        }

        // 403 = token inválido
        if (isset($response['status_http']) && $response['status_http'] === 403) {
            return [
                'sucesso' => false,
                'erro' => 'Token inválido ou sem permissão de acesso.',
            ];
        }

        // Qualquer outra resposta
        if ($response['sucesso'] ?? false) {
            return [
                'sucesso' => true,
                'mensagem' => 'Conexão com a API de emissão estabelecida com sucesso.',
            ];
        }

        return $response;
    }

    /**
     * Atualizar dados de uma NotaFiscal com base na consulta à API
     */
    public function atualizarNotaFiscal(NotaFiscal $nota): NotaFiscal
    {
        $response = $this->consultar($nota->referencia, $nota->tipo);

        if (!($response['sucesso'] ?? false)) {
            return $nota;
        }

        $dados = $response['dados'] ?? [];
        $status = $dados['status'] ?? '';

        // Mapear status da API para status interno
        if (in_array($status, ['autorizado', 'autorizada'])) {
            $nota->status = 'autorizada';
            $nota->numero = $dados['numero'] ?? $nota->numero;
            $nota->serie = $dados['serie'] ?? $nota->serie;
            $nota->chave_nfe = $dados['chave_nfe'] ?? $dados['chave'] ?? $nota->chave_nfe;
            $nota->protocolo = $dados['protocolo'] ?? $nota->protocolo;
            $nota->caminho_xml_nota_fiscal = $dados['caminho_xml_nota_fiscal'] ?? $nota->caminho_xml_nota_fiscal;
            $nota->caminho_danfe = $dados['caminho_danfe'] ?? $nota->caminho_danfe;
            $nota->url_nota_fiscal = $dados['url'] ?? $dados['url_nota_fiscal'] ?? $nota->url_nota_fiscal;
        } elseif (in_array($status, ['erro_autorizacao', 'rejeitado', 'rejeitada'])) {
            $nota->status = 'erro_autorizacao';
            $nota->mensagem_erro = $dados['mensagem_sefaz'] ?? $dados['erros']?? $dados['mensagem'] ?? null;
            if (is_array($nota->mensagem_erro)) {
                $nota->mensagem_erro = json_encode($nota->mensagem_erro);
            }
        } elseif (in_array($status, ['cancelado', 'cancelada'])) {
            $nota->status = 'cancelada';
        }
        // Se ainda está processando, manter status atual

        $nota->dados_retorno = $dados;
        $nota->save();

        return $nota;
    }

    /**
     * Gera o comando curl equivalente para debug
     */
    protected function gerarCurlEquivalente(string $method, string $url, string $token, array $data = []): string
    {
        $tokenMasked = substr($token, 0, 6) . '...' . substr($token, -4);
        $authBase64 = base64_encode($token . ':');
        $authBase64Masked = substr($authBase64, 0, 10) . '...';

        $curl = "curl -X {$method} \"{$url}\"";
        $curl .= " \\\n  -H \"Authorization: Basic {$authBase64Masked}\"";
        $curl .= " \\\n  -H \"Content-Type: application/json\"";
        $curl .= " \\\n  -H \"Accept: application/json\"";

        if (!empty($data) && in_array($method, ['POST', 'PUT', 'DELETE'])) {
            $jsonData = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            $curl .= " \\\n  -d '" . $jsonData . "'";
        }

        return $curl;
    }

    /**
     * Traduz erros comuns da API para mensagens mais amigáveis ao usuário
     */
    protected function traduzirErroApi(array $response, string $tipo): array
    {
        $mensagemOriginal = $response['erro'] ?? '';
        $codigo = $response['codigo'] ?? ($response['dados']['codigo'] ?? '');
        $mensagemApi = $response['dados']['mensagem'] ?? $mensagemOriginal;

        // Mapeamento de erros conhecidos para mensagens claras
        $traducoes = [
            'prestador' => [
                'mensagem' => $tipo === 'nfse'
                    ? 'Dados do prestador (empresa) incompletos ou inválidos para emissão de NFSe.'
                    : 'Dados do emitente (empresa) incompletos ou inválidos para emissão de NFe.',
                'instrucao' => "Verifique em Configurações > Dados da Empresa se os seguintes campos estão preenchidos corretamente:\n"
                    . ($tipo === 'nfse'
                        ? '- CNPJ, Razão Social, Inscrição Municipal, Código do Município IBGE'
                        : '- CNPJ, Razão Social, Inscrição Estadual, Endereço completo (Logradouro, Bairro, Cidade, Estado, CEP)'),
            ],
            'tomador' => [
                'mensagem' => 'Dados do cliente (tomador/destinatário) incompletos ou inválidos.',
                'instrucao' => "Verifique o cadastro do cliente se os campos obrigatórios estão preenchidos:\n- CPF/CNPJ, Nome, Endereço completo",
            ],
            'servico' => [
                'mensagem' => 'Dados do serviço incompletos ou inválidos.',
                'instrucao' => "Verifique em Configurações > Nota Fiscal se os parâmetros fiscais estão preenchidos:\n- Código Tributário do Município, Item da Lista de Serviço, Alíquota ISS",
            ],
        ];

        // Procurar a tradução correta baseada na mensagem
        foreach ($traducoes as $chave => $traducao) {
            if (stripos($mensagemApi, $chave) !== false || stripos($mensagemOriginal, $chave) !== false) {
                $response['erro'] = $traducao['mensagem'] . "\n\n" . $traducao['instrucao'];
                return $response;
            }
        }

        // Se for requisição inválida genérica, melhorar a mensagem
        if ($codigo === 'requisicao_invalida') {
            $response['erro'] = "Requisição inválida ao emitir " . strtoupper($tipo) . ": {$mensagemApi}\n\n"
                . "Verifique se todos os dados obrigatórios estão preenchidos em:\n"
                . "- Configurações > Dados da Empresa (dados do emitente/prestador)\n"
                . "- Cadastro do Cliente (dados do destinatário/tomador)\n"
                . "- Configurações > Nota Fiscal (parâmetros fiscais)";
        }

        return $response;
    }
}
