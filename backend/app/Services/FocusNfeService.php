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
     * Retorna o tipo de integração NFSe configurado: 'nfse' (legacy) ou 'nfsen' (Nacional)
     */
    protected function getTipoNfse(): string
    {
        return Configuracao::getValor('nfe', 'tipo_nfse', 'nfse') ?: 'nfse';
    }

    /**
     * Retorna o prefixo de endpoint para NFSe: '/v2/nfse' ou '/v2/nfsen'
     */
    protected function getNfseEndpointBase(?string $tipoIntegracao = null): string
    {
        $tipo = $tipoIntegracao ?? $this->getTipoNfse();
        return $tipo === 'nfsen' ? '/v2/nfsen' : '/v2/nfse';
    }

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
        $tipoNfse = $this->getTipoNfse();
        $errosConfig = [];

        // codigo_tributario_municipio é obrigatório apenas para NFSe Legacy
        if ($tipoNfse !== 'nfsen') {
            if (empty($configs['codigo_tributario_municipio'] ?? '') && empty($dadosAdicionais['codigo_tributario_municipio'] ?? '')) {
                $errosConfig[] = 'Código Tributário do Município';
            }
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

        // Usar tipo de integração já detectado na validação
        $tipoIntegracao = $tipoNfse;
        $endpointBase = $this->getNfseEndpointBase($tipoIntegracao);

        // Montar payload conforme tipo de integração
        if ($tipoIntegracao === 'nfsen') {
            $payload = $this->montarPayloadNFSeNacional($empresa, $cliente, $os, $configs, $dadosAdicionais);
        } else {
            $payload = $this->montarPayloadNFSe($empresa, $cliente, $os, $configs, $dadosAdicionais);
        }

        // Guardar o tipo de integração no payload para referência futura
        $payloadComMeta = $payload;
        $payloadComMeta['_tipo_integracao'] = $tipoIntegracao;

        $response = $this->request('POST', "{$endpointBase}?ref={$referencia}", $payload);

        // Traduzir erros comuns da API para mensagens mais amigáveis
        if (!($response['sucesso'] ?? false)) {
            $response = $this->traduzirErroApi($response, 'nfse');
        }

        return array_merge($response, [
            'referencia' => $referencia,
            'payload_enviado' => $payloadComMeta,
        ]);
    }

    /**
     * Resolve o código IBGE do município do cliente com fallback via CEP.
     * Retorna o código e atualiza o banco automaticamente.
     */
    protected function resolverCodigoMunicipioCliente($cliente): string
    {
        $codigoMunicipioCliente = $cliente->codigo_municipio_ibge ?? '';
        if (empty($codigoMunicipioCliente) && !empty($cliente->cep)) {
            $codigoMunicipioCliente = $this->resolverCodigoMunicipioIbge($cliente->cep);
            if (!empty($codigoMunicipioCliente)) {
                try {
                    $cliente->update(['codigo_municipio_ibge' => $codigoMunicipioCliente]);
                    Log::info('FocusNFe: Código IBGE do município salvo automaticamente para o cliente', [
                        'cliente_id' => $cliente->id,
                        'codigo_municipio_ibge' => $codigoMunicipioCliente,
                    ]);
                } catch (\Exception $e) {
                    Log::warning('FocusNFe: Não foi possível salvar o código IBGE no cliente', [
                        'cliente_id' => $cliente->id,
                        'erro' => $e->getMessage(),
                    ]);
                }
            }
        }
        return $codigoMunicipioCliente;
    }

    /**
     * Monta o payload da NFSe Legacy (formato ABRASF - objetos aninhados)
     * Endpoint: /v2/nfse
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

        // Montar discriminação dos serviços
        $discriminacao = $this->montarDiscriminacaoNFSe($os);

        // Prestador (empresa emissora) - formato aninhado
        $prestador = [
            'cnpj' => $cnpjPrestador,
            'inscricao_municipal' => preg_replace('/\D/', '', $empresa->inscricao_municipal ?? ''),
            'codigo_municipio' => $empresa->codigo_municipio_ibge ?? '',
        ];

        // Resolver código do município IBGE do cliente
        $codigoMunicipioCliente = $this->resolverCodigoMunicipioCliente($cliente);

        // Tomador (cliente) - formato aninhado
        $tomador = [
            'razao_social' => $cliente->nome_completo ?? $cliente->apelido_fantasia ?? '',
            'endereco' => [
                'logradouro' => $cliente->logradouro ?? '',
                'numero' => $cliente->numero ?? $cliente->numero_endereco ?? 'S/N',
                'bairro' => $cliente->bairro ?? '',
                'codigo_municipio' => $codigoMunicipioCliente,
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

        if ($cliente->email) {
            $tomador['email'] = $cliente->email;
        }
        if ($cliente->telefone_principal) {
            $tomador['telefone'] = preg_replace('/\D/', '', $cliente->telefone_principal);
        }
        if (!empty($cliente->complemento)) {
            $tomador['endereco']['complemento'] = $cliente->complemento;
        }

        // Item lista serviço - formato ABRASF (ex: "13.05")
        $itemListaServico = $dadosAdicionais['item_lista_servico'] ?? $configs['item_lista_servico'] ?? '';

        // Serviço - formato aninhado
        $servico = [
            'discriminacao' => $discriminacao,
            'valor_servicos' => round($valorServicos, 2),
            'aliquota' => (float) ($dadosAdicionais['aliquota_iss'] ?? $configs['aliquota_iss'] ?? 0),
            'iss_retido' => ($dadosAdicionais['iss_retido'] ?? 'false') === 'true' ? true : false,
            'item_lista_servico' => $itemListaServico,
            'codigo_cnae' => substr(preg_replace('/\D/', '', $dadosAdicionais['codigo_cnae'] ?? $configs['codigo_cnae'] ?? ''), 0, 7),
        ];

        // Código tributário do município (alguns municípios como Olinda não utilizam)
        $codigoTribMunicipio = $dadosAdicionais['codigo_tributario_municipio'] ?? $configs['codigo_tributario_municipio'] ?? '';
        if (!empty($codigoTribMunicipio)) {
            $servico['codigo_tributario_municipio'] = $codigoTribMunicipio;
        }

        // Código NBS (Nomenclatura Brasileira de Serviços) - opcional mas exigido por alguns provedores
        $codigoNbs = $dadosAdicionais['codigo_nbs'] ?? $configs['codigo_nbs'] ?? '';
        if (!empty($codigoNbs)) {
            $servico['codigo_nbs'] = preg_replace('/\D/', '', $codigoNbs);
        }

        if ($desconto > 0) {
            $servico['desconto_condicionado'] = round($desconto, 2);
        }

        $payload = [
            'data_emissao' => now()->toIso8601String(),
            'prestador' => $prestador,
            'tomador' => $tomador,
            'servico' => $servico,
        ];

        // Natureza da operação (código numérico 1-6 conforme ABRASF)
        $naturezaOperacao = $dadosAdicionais['natureza_operacao_nfse'] ?? $configs['natureza_operacao_nfse'] ?? '1';
        if (!empty($naturezaOperacao)) {
            $payload['natureza_operacao'] = $naturezaOperacao;
        }

        // Optante Simples Nacional (ABRASF: boolean true/false)
        $optanteSN = $configs['optante_simples_nacional'] ?? '3';
        $isSimples = in_array($optanteSN, ['2', '3']);
        $payload['optante_simples_nacional'] = $isSimples;

        // Regime de Apuração Tributária pelo Simples Nacional (regApTribSN)
        // Obrigatório para provedores que exigem (ex: Tinus/Olinda)
        // 1=Tributos federais e municipal pelo SN, 2=Federais pelo SN e ISSQN pela NFS-e, 3=Todos pela NFS-e
        $regimeTribSN = $configs['regime_tributario_simples_nacional'] ?? '';
        if (!empty($regimeTribSN) && $regimeTribSN !== 'nao_enviar') {
            $payload['regime_tributario_simples_nacional'] = $regimeTribSN;
        }

        // Regime especial de tributação (ABRASF: valores 1-6, 0=Nenhum)
        $regimeEspecial = $configs['regime_especial_tributacao'] ?? 'nao_enviar';
        if ($regimeEspecial !== 'nao_enviar' && !empty($regimeEspecial)) {
            $payload['regime_especial_tributacao'] = $regimeEspecial;
        }

        // Incentivo fiscal (ABRASF: 1=Sim, 2=Não)
        $incentivoFiscal = $configs['incentivo_fiscal'] ?? '';
        if (!empty($incentivoFiscal) && $incentivoFiscal !== 'nao_enviar') {
            $payload['incentivo_fiscal'] = $incentivoFiscal;
        }

        return $payload;
    }

    /**
     * Monta o payload da NFSe Nacional (formato flat para API /v2/nfsen)
     * Endpoint: /v2/nfsen
     * Documentação: https://campos.focusnfe.com.br/nfse_nacional/EmissaoDPSXml.html
     */
    protected function montarPayloadNFSeNacional(Empresa $empresa, $cliente, OrdemServico $os, array $configs, array $dadosAdicionais = []): array
    {
        $cnpjPrestador = preg_replace('/\D/', '', $empresa->cnpj);
        $cpfCnpjTomador = preg_replace('/\D/', '', $cliente->cpf_cnpj ?? '');
        $isTomadorPJ = strlen($cpfCnpjTomador) === 14;

        // Calcular valor total dos serviços
        $valorServicos = $os->itens->sum(function ($item) {
            return (float) ($item->valor_total ?? ($item->quantidade * $item->valor_unitario));
        });

        $desconto = $this->calcularDescontoTotal($os);

        // Descrição do serviço
        $descricaoServico = $this->montarDiscriminacaoNFSe($os);

        // Resolver código do município IBGE do cliente
        $codigoMunicipioCliente = $this->resolverCodigoMunicipioCliente($cliente);

        // Formatar item_lista_servico para 6 dígitos (cTribNac)
        // Espera-se que o valor já venha com 6 dígitos (ex: "130501")
        // Se vier com pontos (ex: "13.05"), remove e preenche com zeros à direita
        $itemListaRaw = $dadosAdicionais['item_lista_servico'] ?? $configs['item_lista_servico'] ?? '';
        $itemListaDigits = preg_replace('/\D/', '', $itemListaRaw);
        $codigoTribNac = str_pad($itemListaDigits, 6, '0', STR_PAD_RIGHT);

        // Código do município do prestador (emissora)
        $codigoMunicipioPrestador = $empresa->codigo_municipio_ibge ?? '';

        // === Payload flat para NFSe Nacional ===
        $payload = [
            'data_emissao' => now()->toIso8601String(),
            'data_competencia' => now()->format('Y-m-d'),
            'codigo_municipio_emissora' => $codigoMunicipioPrestador,
        ];

        // Prestador
        $payload['cnpj_prestador'] = $cnpjPrestador;
        $payload['inscricao_municipal_prestador'] = preg_replace('/\D/', '', $empresa->inscricao_municipal ?? '');

        // Optante Simples Nacional (opSimpNac): 1=Não Optante, 2=MEI, 3=ME/EPP
        $optanteSN = $configs['optante_simples_nacional'] ?? '3';
        $payload['codigo_opcao_simples_nacional'] = $optanteSN;

        $isSimples = in_array($optanteSN, ['2', '3']);

        // Regime de Apuração Tributária pelo Simples Nacional (regApTribSN)
        // 1 = Tributos federais e municipal pelo SN
        // 2 = Tributos federais pelo SN e ISSQN pela legislação municipal
        // 3 = Tributos federais e municipal pela NFS-e conforme legislações de cada tributo
        $regimeSN = $configs['regime_tributario_simples_nacional'] ?? '1';
        if ($isSimples && !empty($regimeSN) && $regimeSN !== 'nao_enviar') {
            $payload['regime_tributario_simples_nacional'] = $regimeSN;
        }

        // Regime Especial de Tributação (regEspTrib): 0=Nenhum, 1=Cooperativa, etc.
        $regimeEspecial = $configs['regime_especial_tributacao'] ?? '0';
        if ($regimeEspecial !== 'nao_enviar') {
            $payload['regime_especial_tributacao'] = $regimeEspecial;
        }

        // Tomador (campos flat)
        if ($isTomadorPJ) {
            $payload['cnpj_tomador'] = $cpfCnpjTomador;
        } else {
            $payload['cpf_tomador'] = $cpfCnpjTomador;
        }
        $payload['razao_social_tomador'] = $cliente->nome_completo ?? $cliente->apelido_fantasia ?? '';
        $payload['logradouro_tomador'] = $cliente->logradouro ?? '';
        $payload['numero_tomador'] = $cliente->numero ?? $cliente->numero_endereco ?? 'S/N';
        $payload['bairro_tomador'] = $cliente->bairro ?? '';
        $payload['codigo_municipio_tomador'] = $codigoMunicipioCliente;
        $payload['cep_tomador'] = preg_replace('/\D/', '', $cliente->cep ?? '');

        if (!empty($cliente->complemento)) {
            $payload['complemento_tomador'] = $cliente->complemento;
        }
        if ($cliente->email) {
            $payload['email_tomador'] = $cliente->email;
        }
        if ($cliente->telefone_principal) {
            $payload['telefone_tomador'] = preg_replace('/\D/', '', $cliente->telefone_principal);
        }

        // Serviço (campos flat)
        $payload['codigo_municipio_prestacao'] = $codigoMunicipioPrestador;
        $payload['codigo_tributacao_nacional_iss'] = $codigoTribNac;
        $payload['descricao_servico'] = $descricaoServico;
        $payload['valor_servico'] = round($valorServicos, 2);

        // Código tributário municipal (cTribMun) - NFSe Nacional aceita apenas 3 dígitos [0-9]{3}
        $codigoTribMunicipio = $dadosAdicionais['codigo_tributario_municipio'] ?? $configs['codigo_tributario_municipio'] ?? '';
        $codigoTribMunicipioDigits = preg_replace('/\D/', '', $codigoTribMunicipio);
        if (!empty($codigoTribMunicipioDigits) && strlen($codigoTribMunicipioDigits) <= 3) {
            $payload['codigo_tributacao_municipal_iss'] = $codigoTribMunicipioDigits;
        }

        // Desconto
        if ($desconto > 0) {
            $payload['desconto_condicionado'] = round($desconto, 2);
        }

        // Tributação do ISSQN (tribISSQN): 1=Tributável, 2=Imunidade, 3=Exportação, 4=Não Incidência
        $tributacaoIss = $configs['tributacao_iss'] ?? '1';
        $payload['tributacao_iss'] = $tributacaoIss;

        // Tipo de retenção do ISSQN (tpRetISSQN): 1=Não Retido, 2=Retido Tomador, 3=Retido Intermediário
        $tipoRetencaoIss = $configs['tipo_retencao_iss'] ?? '1';
        $payload['tipo_retencao_iss'] = $tipoRetencaoIss;

        // Indicador de informação de valor total de tributos (indTotTrib)
        // 0 = Não (valor default) - obrigatório dentro do grupo trib > totTrib
        $payload['indicador_total_tributacao'] = '0';

        // Alíquota (só envia se maior que zero)
        $aliquota = (float) ($dadosAdicionais['aliquota_iss'] ?? $configs['aliquota_iss'] ?? 0);
        if ($aliquota > 0) {
            $payload['percentual_aliquota_relativa_municipio'] = $aliquota;
        }

        // Informações complementares
        if (!empty($os->observacoes)) {
            $payload['informacoes_complementares'] = substr($os->observacoes, 0, 2000);
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
     * Consultar NFSe pela referência.
     * Detecta automaticamente o endpoint (legacy ou nacional) a partir dos dados da nota.
     */
    public function consultarNFSe(string $referencia, ?string $tipoIntegracao = null): array
    {
        $endpointBase = $this->getNfseEndpointBase($tipoIntegracao);
        return $this->request('GET', "{$endpointBase}/{$referencia}");
    }

    /**
     * Cancelar NFSe.
     * Detecta automaticamente o endpoint (legacy ou nacional) a partir dos dados da nota.
     */
    public function cancelarNFSe(string $referencia, string $justificativa, ?string $tipoIntegracao = null): array
    {
        $endpointBase = $this->getNfseEndpointBase($tipoIntegracao);
        return $this->request('DELETE', "{$endpointBase}/{$referencia}", [
            'justificativa' => $justificativa,
        ]);
    }

    // =============================
    // Métodos auxiliares genéricos
    // =============================

    /**
     * Consultar nota fiscal pela referência (detecta tipo).
     * Para NFSe, tenta detectar o tipo de integração a partir dos dados salvos na nota.
     */
    public function consultar(string $referencia, string $tipo, ?string $tipoIntegracao = null): array
    {
        if ($tipo === 'nfse') {
            return $this->consultarNFSe($referencia, $tipoIntegracao);
        }
        return $this->consultarNFe($referencia);
    }

    /**
     * Cancelar nota fiscal pela referência (detecta tipo).
     * Para NFSe, tenta detectar o tipo de integração a partir dos dados salvos na nota.
     */
    public function cancelar(string $referencia, string $tipo, string $justificativa, ?string $tipoIntegracao = null): array
    {
        if ($tipo === 'nfse') {
            return $this->cancelarNFSe($referencia, $justificativa, $tipoIntegracao);
        }
        return $this->cancelarNFe($referencia, $justificativa);
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
     * Atualizar dados de uma NotaFiscal com base na consulta à API.
     * Detecta automaticamente o tipo de integração NFSe (legacy ou nacional)
     * a partir dos dados de envio armazenados.
     */
    public function atualizarNotaFiscal(NotaFiscal $nota): NotaFiscal
    {
        // Detectar tipo de integração dos dados salvos
        $tipoIntegracao = $nota->dados_envio['_tipo_integracao'] ?? null;

        $response = $this->consultar($nota->referencia, $nota->tipo, $tipoIntegracao);

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

            // URLs de XML e DANFE: prefixar com URL base da API se forem caminhos relativos
            $baseUrl = $this->getBaseUrl();
            $xmlPath = $dados['caminho_xml_nota_fiscal'] ?? $nota->caminho_xml_nota_fiscal;
            if ($xmlPath && !str_starts_with($xmlPath, 'http')) {
                $xmlPath = rtrim($baseUrl, '/') . '/' . ltrim($xmlPath, '/');
            }
            $nota->caminho_xml_nota_fiscal = $xmlPath;

            // DANFE/DANFSe: pode vir em caminho_danfe, url_danfse ou url_danfe
            $danfePath = $dados['url_danfse'] ?? $dados['url_danfe'] ?? $dados['caminho_danfe'] ?? $nota->caminho_danfe;
            if ($danfePath && !str_starts_with($danfePath, 'http')) {
                $danfePath = rtrim($baseUrl, '/') . '/' . ltrim($danfePath, '/');
            }
            $nota->caminho_danfe = $danfePath;

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

    /**
     * Resolve o código IBGE do município a partir do CEP usando ViaCEP.
     * Usado como fallback quando o cliente não tem o código salvo no banco.
     *
     * @param string $cep
     * @return string Código IBGE do município ou string vazia
     */
    protected function resolverCodigoMunicipioIbge(string $cep): string
    {
        try {
            $cepLimpo = preg_replace('/\D/', '', $cep);

            if (strlen($cepLimpo) !== 8) {
                return '';
            }

            $response = Http::timeout(5)->get("https://viacep.com.br/ws/{$cepLimpo}/json/");

            if ($response->successful()) {
                $data = $response->json();

                if (!isset($data['erro']) && !empty($data['ibge'])) {
                    Log::info('FocusNFe: Código IBGE resolvido via ViaCEP', [
                        'cep' => $cepLimpo,
                        'ibge' => $data['ibge'],
                        'localidade' => $data['localidade'] ?? '',
                    ]);
                    return (string) $data['ibge'];
                }
            }

            Log::warning('FocusNFe: Não foi possível resolver código IBGE via ViaCEP', [
                'cep' => $cepLimpo,
                'status' => $response->status(),
            ]);

            return '';
        } catch (\Exception $e) {
            Log::warning('FocusNFe: Erro ao buscar código IBGE via ViaCEP', [
                'cep' => $cep,
                'erro' => $e->getMessage(),
            ]);
            return '';
        }
    }
}
