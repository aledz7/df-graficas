<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\Configuracao;
use App\Models\Tenant;
use App\Models\User;

class ConfiguracoesIniciaisSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Obter o primeiro tenant disponível
        $tenant = Tenant::first();
        
        if (!$tenant) {
            $this->command->error('Nenhum tenant encontrado. Execute o DatabaseSeeder primeiro.');
            return;
        }

        // Criar usuário admin se não existir
        $admin = User::firstOrCreate(
            ['email' => 'admin@empresa.com'],
            [
                'name' => 'Administrador',
                'password' => bcrypt('admin123'),
                'tenant_id' => $tenant->id,
                'is_admin' => true,
                'email_verified_at' => now(),
            ]
        );

        // Configurações da Empresa
        $this->criarConfiguracao('empresa', 'razao_social', 'Razão Social', 'texto', $tenant->razao_social, true, true, true, 10, $tenant->id);
        $this->criarConfiguracao('empresa', 'nome_fantasia', 'Nome Fantasia', 'texto', $tenant->nome_fantasia, true, true, true, 20, $tenant->id);
        $this->criarConfiguracao('empresa', 'cnpj', 'CNPJ', 'texto', $tenant->cnpj, true, true, true, 30, $tenant->id, ['validacao' => ['cnpj']]);
        $this->criarConfiguracao('empresa', 'ie', 'Inscrição Estadual', 'texto', '', false, true, false, 40, $tenant->id);
        $this->criarConfiguracao('empresa', 'im', 'Inscrição Municipal', 'texto', '', false, true, false, 50, $tenant->id);
        $this->criarConfiguracao('empresa', 'email', 'E-mail', 'email', $tenant->email, true, true, true, 60, $tenant->id, ['validacao' => ['email']]);
        $this->criarConfiguracao('empresa', 'telefone', 'Telefone', 'texto', $tenant->telefone, true, true, true, 70, $tenant->id);
        $this->criarConfiguracao('empresa', 'celular', 'Celular', 'texto', '', false, true, false, 80, $tenant->id);
        $this->criarConfiguracao('empresa', 'endereco', 'Endereço', 'texto', $tenant->endereco, true, true, true, 90, $tenant->id);
        $this->criarConfiguracao('empresa', 'numero', 'Número', 'texto', '', false, true, false, 100, $tenant->id);
        $this->criarConfiguracao('empresa', 'complemento', 'Complemento', 'texto', '', false, true, false, 110, $tenant->id);
        $this->criarConfiguracao('empresa', 'bairro', 'Bairro', 'texto', '', false, true, false, 120, $tenant->id);
        $this->criarConfiguracao('empresa', 'cidade', 'Cidade', 'texto', $tenant->cidade, true, true, true, 130, $tenant->id);
        $this->criarConfiguracao('empresa', 'estado', 'Estado', 'texto', $tenant->estado, true, true, true, 140, $tenant->id);
        $this->criarConfiguracao('empresa', 'cep', 'CEP', 'texto', $tenant->cep, true, true, true, 150, $tenant->id, ['validacao' => ['formato_cep']]);
        $this->criarConfiguracao('empresa', 'site', 'Site', 'url', '', false, true, false, 160, $tenant->id, ['validacao' => ['url']]);
        $this->criarConfiguracao('empresa', 'logo', 'Logo', 'imagem', '', false, true, false, 170, $tenant->id);
        $this->criarConfiguracao('empresa', 'logo_relatorios', 'Logo para Relatórios', 'imagem', '', false, true, false, 180, $tenant->id);

        // Configurações do PDV
        $this->criarConfiguracao('pdv', 'tema', 'Tema do PDV', 'select', 'claro', true, true, true, 10, $tenant->id, [
            'opcoes' => [
                'claro' => 'Tema Claro',
                'escuro' => 'Tema Escuro',
                'azul' => 'Tema Azul',
                'verde' => 'Tema Verde',
            ]
        ]);
        $this->criarConfiguracao('pdv', 'exibir_estoque', 'Exibir Estoque no PDV', 'booleano', true, true, true, true, 20, $tenant->id);
        $this->criarConfiguracao('pdv', 'exibir_preco_custo', 'Exibir Preço de Custo', 'booleano', false, true, true, true, 30, $tenant->id);
        $this->criarConfiguracao('pdv', 'permitir_venda_sem_estoque', 'Permitir Venda sem Estoque', 'booleano', false, true, true, true, 40, $tenant->id);
        $this->criarConfiguracao('pdv', 'exibir_imagens_produtos', 'Exibir Imagens dos Produtos', 'booleano', true, true, true, true, 50, $tenant->id);
        $this->criarConfiguracao('pdv', 'tamanho_imagens', 'Tamanho das Imagens', 'select', 'medio', true, true, true, 60, $tenant->id, [
            'opcoes' => [
                'pequeno' => 'Pequeno',
                'medio' => 'Médio',
                'grande' => 'Grande',
            ]
        ]);
        $this->criarConfiguracao('pdv', 'exibir_codigo_barras', 'Exibir Código de Barras', 'booleano', true, true, true, true, 70, $tenant->id);
        $this->criarConfiguracao('pdv', 'exibir_codigo_interno', 'Exibir Código Interno', 'booleano', true, true, true, true, 80, $tenant->id);
        $this->criarConfiguracao('pdv', 'exibir_fornecedor', 'Exibir Fornecedor', 'booleano', false, true, true, true, 90, $tenant->id);
        $this->criarConfiguracao('pdv', 'exibir_categoria', 'Exibir Categoria', 'booleano', true, true, true, true, 100, $tenant->id);
        $this->criarConfiguracao('pdv', 'exibir_subcategoria', 'Exibir Subcategoria', 'booleano', true, true, true, true, 110, $tenant->id);
        $this->criarConfiguracao('pdv', 'exibir_observacoes', 'Exibir Campo de Observações', 'booleano', true, true, true, true, 120, $tenant->id);
        $this->criarConfiguracao('pdv', 'exibir_desconto_item', 'Exibir Desconto por Item', 'booleano', true, true, true, true, 130, $tenant->id);
        $this->criarConfiguracao('pdv', 'exibir_acrescimo_item', 'Exibir Acréscimo por Item', 'booleano', true, true, true, true, 140, $tenant->id);
        $this->criarConfiguracao('pdv', 'exibir_desconto_geral', 'Exibir Desconto Geral', 'booleano', true, true, true, true, 150, $tenant->id);
        $this->criarConfiguracao('pdv', 'exibir_acrescimo_geral', 'Exibir Acréscimo Geral', 'booleano', true, true, true, true, 160, $tenant->id);
        $this->criarConfiguracao('pdv', 'exibir_troco', 'Exibir Troco', 'booleano', true, true, true, true, 170, $tenant->id);
        $this->criarConfiguracao('pdv', 'exibir_vendedor', 'Exibir Vendedor', 'booleano', true, true, true, true, 180, $tenant->id);
        $this->criarConfiguracao('pdv', 'exibir_cliente', 'Exibir Cliente', 'booleano', true, true, true, true, 190, $tenant->id);
        $this->criarConfiguracao('pdv', 'obrigar_cliente', 'Obrigar Seleção de Cliente', 'booleano', false, true, true, true, 200, $tenant->id);
        $this->criarConfiguracao('pdv', 'exibir_parcelas', 'Exibir Parcelas', 'booleano', true, true, true, true, 210, $tenant->id);
        $this->criarConfiguracao('pdv', 'exibir_observacoes_gerais', 'Exibir Campo de Observações Gerais', 'booleano', true, true, true, true, 220, $tenant->id);

        // Configurações de Nota Fiscal
        $this->criarConfiguracao('nfe', 'ambiente', 'Ambiente', 'select', '2', true, true, true, 10, $tenant->id, [
            'opcoes' => [
                '1' => 'Produção',
                '2' => 'Homologação',
            ]
        ]);
        $this->criarConfiguracao('nfe', 'serie', 'Série', 'texto', '1', true, true, true, 20, $tenant->id);
        $this->criarConfiguracao('nfe', 'ultima_nfe', 'Último Número NFe', 'numero', '0', true, true, true, 30, $tenant->id);
        $this->criarConfiguracao('nfe', 'ultimo_nfce', 'Último Número NFCe', 'numero', '0', true, true, true, 40, $tenant->id);
        $this->criarConfiguracao('nfe', 'ultimo_cte', 'Último Número CTe', 'numero', '0', true, true, true, 50, $tenant->id);
        $this->criarConfiguracao('nfe', 'ultimo_mdfe', 'Último Número MDFe', 'numero', '0', true, true, true, 60, $tenant->id);
        $this->criarConfiguracao('nfe', 'csc_id', 'CSC ID', 'texto', '', false, true, false, 70, $tenant->id);
        $this->criarConfiguracao('nfe', 'csc', 'CSC', 'texto', '', false, true, false, 80, $tenant->id);
        $this->criarConfiguracao('nfe', 'certificado', 'Certificado Digital', 'arquivo', '', false, true, false, 90, $tenant->id);
        $this->criarConfiguracao('nfe', 'senha_certificado', 'Senha do Certificado', 'password', '', false, true, false, 100, $tenant->id);
        $this->criarConfiguracao('nfe', 'caminho_logomarca', 'Caminho da Logomarca', 'texto', '', false, true, false, 110, $tenant->id);
        $this->criarConfiguracao('nfe', 'caminho_schema', 'Caminho dos Schemas', 'texto', '', false, true, false, 120, $tenant->id);
        $this->criarConfiguracao('nfe', 'caminho_arquivos', 'Caminho dos Arquivos', 'texto', '', false, true, false, 130, $tenant->id);
        $this->criarConfiguracao('nfe', 'caminho_salvar', 'Caminho para Salvar', 'texto', '', false, true, false, 140, $tenant->id);
        $this->criarConfiguracao('nfe', 'caminho_danfe', 'Caminho do DANFE', 'texto', '', false, true, false, 150, $tenant->id);
        $this->criarConfiguracao('nfe', 'caminho_evento', 'Caminho dos Eventos', 'texto', '', false, true, false, 160, $tenant->id);
        $this->criarConfiguracao('nfe', 'caminho_imagens', 'Caminho das Imagens', 'texto', '', false, true, false, 170, $tenant->id);

        // Configurações de integração com API de emissão
        $this->criarConfiguracao('nfe', 'token_api', 'Token da API de Emissão', 'password', '', true, true, false, 5, $tenant->id);
        $this->criarConfiguracao('nfe', 'regime_tributario', 'Regime Tributário', 'select', '1', true, true, true, 15, $tenant->id, [
            'opcoes' => [
                '1' => 'Simples Nacional',
                '2' => 'Simples Nacional - Excesso de sublimite',
                '3' => 'Regime Normal',
            ]
        ]);
        $this->criarConfiguracao('nfe', 'natureza_operacao', 'Natureza da Operação Padrão', 'texto', 'Venda', true, true, false, 25, $tenant->id);
        $this->criarConfiguracao('nfe', 'cfop_padrao', 'CFOP Padrão', 'texto', '5102', true, true, false, 26, $tenant->id);
        $this->criarConfiguracao('nfe', 'codigo_ncm_padrao', 'NCM Padrão', 'texto', '49111090', true, true, false, 27, $tenant->id);
        $this->criarConfiguracao('nfe', 'icms_situacao_tributaria', 'Situação Tributária ICMS', 'texto', '102', true, true, false, 28, $tenant->id);
        $this->criarConfiguracao('nfe', 'pis_situacao_tributaria', 'Situação Tributária PIS', 'texto', '07', true, true, false, 29, $tenant->id);
        $this->criarConfiguracao('nfe', 'cofins_situacao_tributaria', 'Situação Tributária COFINS', 'texto', '07', true, true, false, 30, $tenant->id);

        // Configurações específicas NFSe
        $this->criarConfiguracao('nfe', 'codigo_tributario_municipio', 'Código Tributário do Município (NFSe)', 'texto', '', true, true, false, 180, $tenant->id);
        $this->criarConfiguracao('nfe', 'item_lista_servico', 'Item da Lista de Serviço (NFSe)', 'texto', '', true, true, false, 190, $tenant->id);
        $this->criarConfiguracao('nfe', 'aliquota_iss', 'Alíquota ISS % (NFSe)', 'texto', '5', true, true, false, 200, $tenant->id);

        // Configurações de E-mail
        $this->criarConfiguracao('email', 'driver', 'Driver', 'select', 'smtp', true, true, true, 10, $tenant->id, [
            'opcoes' => [
                'smtp' => 'SMTP',
                'mail' => 'Mail',
                'sendmail' => 'Sendmail',
                'mailgun' => 'Mailgun',
                'postmark' => 'Postmark',
                'ses' => 'Amazon SES',
            ]
        ]);
        $this->criarConfiguracao('email', 'host', 'Host', 'texto', '', true, true, true, 20, $tenant->id);
        $this->criarConfiguracao('email', 'porta', 'Porta', 'numero', '587', true, true, true, 30, $tenant->id);
        $this->criarConfiguracao('email', 'criptografia', 'Criptografia', 'select', 'tls', true, true, true, 40, $tenant->id, [
            'opcoes' => [
                'tls' => 'TLS',
                'ssl' => 'SSL',
                '' => 'Nenhuma',
            ]
        ]);
        $this->criarConfiguracao('email', 'usuario', 'Usuário', 'texto', '', true, true, true, 50, $tenant->id);
        $this->criarConfiguracao('email', 'senha', 'Senha', 'password', '', true, true, true, 60, $tenant->id);
        $this->criarConfiguracao('email', 'email_remetente', 'E-mail Remetente', 'email', $tenant->email, true, true, true, 70, $tenant->id, ['validacao' => ['email']]);
        $this->criarConfiguracao('email', 'nome_remetente', 'Nome do Remetente', 'texto', $tenant->nome_fantasia, true, true, true, 80, $tenant->id);
        $this->criarConfiguracao('email', 'email_resposta', 'E-mail para Resposta', 'email', $tenant->email, false, true, false, 90, $tenant->id, ['validacao' => ['email']]);
        $this->criarConfiguracao('email', 'email_copia', 'E-mail com Cópia', 'email', '', false, true, false, 100, $tenant->id, ['validacao' => ['email']]);
        $this->criarConfiguracao('email', 'email_copia_oculta', 'E-mail com Cópia Oculta', 'email', '', false, true, false, 110, $tenant->id, ['validacao' => ['email']]);
        $this->criarConfiguracao('email', 'assunto_padrao', 'Assunto Padrão', 'texto', 'Mensagem de ' . $tenant->nome_fantasia, true, true, true, 120, $tenant->id);
        $this->criarConfiguracao('email', 'template_padrao', 'Template Padrão', 'textarea', '<p>Prezado(a) {nome},</p><p>{mensagem}</p><p>Atenciosamente,<br>{empresa}</p>', true, true, true, 130, $tenant->id);
        $this->criarConfiguracao('email', 'enviar_email_venda', 'Enviar E-mail na Venda', 'booleano', true, true, true, true, 140, $tenant->id);
        $this->criarConfiguracao('email', 'enviar_email_orcamento', 'Enviar E-mail no Orçamento', 'booleano', true, true, true, true, 150, $tenant->id);
        $this->criarConfiguracao('email', 'enviar_email_contato', 'Enviar E-mail de Contato', 'booleano', true, true, true, true, 160, $tenant->id);
        $this->criarConfiguracao('email', 'enviar_email_newsletter', 'Enviar E-mail de Newsletter', 'booleano', true, true, true, true, 170, $tenant->id);

        $this->command->info('Configurações iniciais criadas com sucesso!');
    }

    /**
     * Cria uma nova configuração no banco de dados.
     *
     * @param string $grupo
     * @param string $chave
     * @param string $nome
     * @param string $tipo
     * @param mixed $valor
     * @param bool $visivel
     * @param bool $editavel
     * @param bool $obrigatorio
     * @param int $ordem
     * @param int $tenantId
     * @param array $opcoes
     * @return void
     */
    protected function criarConfiguracao($grupo, $chave, $nome, $tipo, $valor, $visivel = true, $editavel = true, $obrigatorio = false, $ordem = 0, $tenantId = null, $opcoes = [])
    {
        // Se não existir, cria a configuração
        $config = Configuracao::firstOrNew([
            'tenant_id' => $tenantId,
            'grupo' => $grupo,
            'chave' => $chave,
        ]);

        // Define os atributos da configuração
        $config->fill([
            'nome' => $nome,
            'descricao' => $opcoes['descricao'] ?? '',
            'tipo' => $tipo,
            'opcoes' => $opcoes['opcoes'] ?? null,
            'validacao' => $opcoes['validacao'] ?? null,
            'ordem' => $ordem,
            'visivel' => $visivel,
            'editavel' => $editavel,
            'obrigatorio' => $obrigatorio,
        ]);

        // Define o valor com base no tipo
        $campoValor = 'valor_' . $tipo;
        if (in_array($tipo, ['select', 'multiselect', 'json', 'email', 'url', 'imagem', 'arquivo', 'password', 'textarea'])) {
            $campoValor = 'valor_texto';
        }

        if ($campoValor === 'valor_json') {
            $config->valor_json = is_array($valor) ? $valor : json_decode($valor, true);
        } else {
            $config->$campoValor = $valor;
        }

        // Salva a configuração
        $config->save();
    }
}
