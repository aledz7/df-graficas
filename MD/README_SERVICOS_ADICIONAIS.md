# Sistema de Serviços Adicionais - Envelopamento

## Visão Geral

Este sistema substitui o antigo sistema de preços padrão por um sistema completo de gerenciamento de serviços adicionais para orçamentos de envelopamento. Agora é possível cadastrar, editar e gerenciar cada serviço individualmente.

## Funcionalidades

### 1. Cadastro de Serviços
- **Nome**: Nome descritivo do serviço
- **Descrição**: Descrição detalhada (opcional)
- **Preço por m²**: Valor cobrado por metro quadrado
- **Unidade de Medida**: m², m, unidade, hora
- **Categoria**: Aplicação, Remoção, Preparação, Proteção, Acabamento, Outros
- **Ordem de Exibição**: Para controlar a sequência na lista
- **Status**: Ativo/Inativo

### 2. Gerenciamento
- ✅ Criar novos serviços
- ✅ Editar serviços existentes
- ✅ Excluir serviços
- ✅ Ativar/Desativar serviços
- ✅ Filtrar por categoria, status e preço
- ✅ Busca por nome ou descrição

### 3. Categorias Disponíveis
- **Aplicação**: Serviços relacionados à aplicação de materiais
- **Remoção**: Serviços de remoção de materiais antigos
- **Preparação**: Preparação de superfícies (lixamento, limpeza, primer)
- **Proteção**: Películas protetoras, laminação
- **Acabamento**: Finalização e acabamentos especiais
- **Outros**: Serviços que não se encaixam nas categorias acima

## Estrutura do Banco de Dados

### Tabela: `servicos_adicionais`
```sql
CREATE TABLE servicos_adicionais (
    id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    nome VARCHAR(255) NOT NULL,
    descricao TEXT NULL,
    preco_por_m2 DECIMAL(10,2) NOT NULL,
    unidade_medida VARCHAR(50) DEFAULT 'm²',
    ativo BOOLEAN DEFAULT TRUE,
    categoria VARCHAR(100) NULL,
    ordem INT DEFAULT 0,
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL,
    deleted_at TIMESTAMP NULL
);
```

## Arquivos Criados/Modificados

### Backend (Laravel)
- `database/migrations/2024_01_01_000000_create_servicos_adicionais_table.php`
- `app/Models/ServicoAdicional.php`
- `app/Http/Controllers/ServicoAdicionalController.php`
- `database/seeders/ServicoAdicionalSeeder.php`
- `routes/api.php` (novas rotas)

### Frontend (React)
- `src/components/ServicoAdicionalModal.jsx`
- `src/components/ServicosAdicionaisList.jsx`
- `src/components/ServicosAdicionaisFilters.jsx`
- `src/hooks/useServicosAdicionais.js`
- `src/pages/ConfiguracaoPrecosEnvelopamentoPage.jsx` (completamente refatorada)

## Rotas da API

### Serviços Adicionais
```
GET    /api/servicos-adicionais              - Listar todos os serviços
POST   /api/servicos-adicionais              - Criar novo serviço
GET    /api/servicos-adicionais/{id}         - Buscar serviço específico
PUT    /api/servicos-adicionais/{id}         - Atualizar serviço
DELETE /api/servicos-adicionais/{id}         - Excluir serviço
PATCH  /api/servicos-adicionais/{id}/toggle-status - Alternar status
GET    /api/servicos-adicionais/categoria/{categoria} - Filtrar por categoria
```

## Como Usar

### 1. Executar a Migration
```bash
php artisan migrate
```

### 2. Executar o Seeder (opcional)
```bash
php artisan db:seed --class=ServicoAdicionalSeeder
```

### 3. Acessar a Página
Navegue para a página de configuração de preços de envelopamento. Agora você verá:
- Lista de serviços cadastrados
- Botão "Novo Serviço" para adicionar
- Filtros para buscar e organizar
- Estatísticas dos serviços

### 4. Cadastrar um Serviço
1. Clique em "Novo Serviço"
2. Preencha os campos obrigatórios (nome e preço)
3. Configure categoria e unidade de medida
4. Clique em "Criar"

### 5. Editar um Serviço
1. Clique no ícone de editar (lápis) na lista
2. Modifique os campos desejados
3. Clique em "Atualizar"

### 6. Gerenciar Status
- Use o ícone de olho para ativar/desativar serviços
- Serviços inativos aparecem com opacidade reduzida

## Migração do Sistema Anterior

O sistema anterior de preços padrão foi completamente substituído. Os valores antigos não são mais utilizados. Todos os novos orçamentos devem usar os serviços cadastrados neste novo sistema.

## Benefícios da Nova Abordagem

1. **Flexibilidade**: Cada serviço pode ter preços e configurações específicas
2. **Organização**: Categorização clara dos tipos de serviço
3. **Controle**: Ativação/desativação individual de serviços
4. **Escalabilidade**: Fácil adição de novos tipos de serviço
5. **Manutenção**: Edição e exclusão de serviços sem afetar outros
6. **Filtros**: Busca e organização eficiente da lista

## Próximos Passos

Para integrar completamente com o sistema de orçamentos:
1. Atualizar a calculadora de envelopamento para usar os serviços ativos
2. Modificar o modelo de orçamento para referenciar serviços específicos
3. Atualizar relatórios e dashboards para mostrar serviços utilizados
4. Implementar histórico de preços por serviço (se necessário)

## Suporte

Em caso de dúvidas ou problemas:
1. Verificar logs do Laravel (`storage/logs/laravel.log`)
2. Verificar console do navegador para erros JavaScript
3. Confirmar que todas as migrations foram executadas
4. Verificar se as rotas da API estão funcionando
