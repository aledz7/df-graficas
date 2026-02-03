# Configurações Administrativas - GráficaPro

Este documento explica como usar o sistema de configurações administrativas integrado ao banco de dados Laravel.

## 📋 Visão Geral

O sistema de configurações administrativas permite gerenciar configurações globais do sistema através da API, substituindo o uso do localStorage. Todas as configurações são armazenadas no banco de dados e podem ser acessadas por qualquer usuário autenticado.

## 🗄️ Estrutura do Banco de Dados

### Tabela: `admin_configuracoes`

A tabela armazena as configurações administrativas com os seguintes campos principais:

- `tenant_id`: ID do tenant (multi-tenancy)
- `nome_sistema`: Nome do sistema exibido no cabeçalho
- `senha_master`: Senha master global (criptografada)
- `backup_automatico`: Configuração de backup automático
- `log_alteracoes`: Log de alterações
- `tema_padrao`: Tema padrão do sistema
- `idioma_padrao`: Idioma padrão
- `exigir_senha_forte`: Exigir senhas fortes
- `tentativas_login_max`: Máximo de tentativas de login
- `notificacoes_config`: Configurações de notificações (JSON)

## 🔧 API Endpoints

### Configurações Gerais

```http
GET /api/admin-configuracoes
```
Busca todas as configurações administrativas do tenant atual.

```http
PUT /api/admin-configuracoes
```
Atualiza as configurações administrativas.

### Configurações Específicas

```http
GET /api/admin-configuracoes/{chave}
```
Busca uma configuração específica.

```http
PUT /api/admin-configuracoes/{chave}
```
Atualiza uma configuração específica.

### Senha Master

```http
POST /api/admin-configuracoes/validar-senha-master
```
Valida a senha master.

```http
DELETE /api/admin-configuracoes/senha-master
```
Remove a senha master.

### Operações Sensíveis (Requerem Senha Master)

```http
POST /api/admin-configuracoes/reset-sistema
```
Reset do sistema (requer senha master).

```http
POST /api/admin-configuracoes/backup-completo
```
Backup completo do sistema (requer senha master).

## 🎯 Como Usar no Frontend

### 1. Serviço de Configurações

```javascript
import { adminConfigService } from '@/services/adminConfigService';

// Buscar configurações
const config = await adminConfigService.getConfiguracoes();

// Atualizar nome do sistema
await adminConfigService.setNomeSistema('Novo Nome');

// Verificar se há senha master
const temSenha = await adminConfigService.temSenhaMaster();

// Validar senha master
const response = await adminConfigService.validarSenhaMaster('senha123');
```

### 2. Hook para Nome do Sistema

```javascript
import { useNomeSistema } from '@/hooks/useNomeSistema';

const MeuComponente = () => {
  const { nomeSistema, loading, atualizarNomeSistema } = useNomeSistema();
  
  return (
    <div>
      <h1>{nomeSistema}</h1>
      <button onClick={() => atualizarNomeSistema('Novo Nome')}>
        Alterar Nome
      </button>
    </div>
  );
};
```

### 3. Modal de Senha Master

```javascript
import SenhaMasterModal from '@/components/SenhaMasterModal';

const [showModal, setShowModal] = useState(false);

const handleOperacaoSensivel = () => {
  setShowModal(true);
};

const handleSenhaConfirmada = (senha) => {
  // Executar operação sensível
  executarOperacaoSensivel(senha);
};

return (
  <>
    <button onClick={handleOperacaoSensivel}>
      Operação Sensível
    </button>
    
    <SenhaMasterModal
      isOpen={showModal}
      onClose={() => setShowModal(false)}
      onSuccess={handleSenhaConfirmada}
      title="Confirmar Operação"
      description="Esta operação requer a senha master."
    />
  </>
);
```

## 🔒 Segurança

### Senha Master

- A senha master é criptografada usando Hash do Laravel
- Pode ser configurada ou removida através da interface
- É obrigatória para operações sensíveis
- Pode ser validada via API

### Middleware de Proteção

```php
// Aplicar middleware em rotas sensíveis
Route::middleware(['verificar.senha.master'])->group(function () {
    Route::post('operacao-sensivel', [Controller::class, 'operacaoSensivel']);
});
```

### Log de Alterações

Todas as alterações nas configurações são logadas automaticamente quando `log_alteracoes` está habilitado:

```php
Log::info('Configurações administrativas atualizadas', [
    'usuario_id' => auth()->id(),
    'usuario_nome' => auth()->user()->name,
    'alteracoes' => array_keys($dados)
]);
```

## 🚀 Migração do localStorage

O sistema foi projetado para substituir o uso do localStorage. Para migrar dados existentes:

1. **Exportação**: O backup inclui configurações administrativas
2. **Importação**: Configurações são restauradas automaticamente
3. **Compatibilidade**: Mantém compatibilidade com dados antigos

## 📝 Exemplo de Uso Completo

### Backend (Laravel)

```php
// Model
use App\Models\AdminConfiguracao;

// Buscar configuração
$nomeSistema = AdminConfiguracao::getValor('nome_sistema', 'GráficaPro');

// Atualizar configuração
AdminConfiguracao::setValor('nome_sistema', 'Novo Nome');

// Verificar senha master
if (AdminConfiguracao::validarSenhaMaster($senha)) {
    // Executar operação sensível
}
```

### Frontend (React)

```javascript
// Componente de configurações
const AdminSettings = () => {
  const { nomeSistema, atualizarNomeSistema } = useNomeSistema();
  const [senhaMaster, setSenhaMaster] = useState('');
  
  const handleSave = async () => {
    await atualizarNomeSistema(nomeSistema);
  };
  
  const handleSaveSenhaMaster = async () => {
    await adminConfigService.updateConfiguracao('senha_master', senhaMaster);
  };
  
  return (
    <div>
      <input 
        value={nomeSistema} 
        onChange={(e) => setNomeSistema(e.target.value)} 
      />
      <button onClick={handleSave}>Salvar</button>
    </div>
  );
};
```

## 🔧 Configuração Inicial

1. **Executar Migration**:
   ```bash
   php artisan migrate
   ```

2. **Executar Seeder**:
   ```bash
   php artisan db:seed --class=AdminConfiguracaoSeeder
   ```

3. **Configurar Provider** (já feito no App.jsx):
   ```javascript
   <NomeSistemaProvider>
     {/* Sua aplicação */}
   </NomeSistemaProvider>
   ```

## 📊 Monitoramento

- Todas as alterações são logadas
- Configurações são versionadas no banco
- Backup automático pode ser configurado
- Notificações por email podem ser habilitadas

## 🛠️ Manutenção

### Backup das Configurações

```bash
# Exportar configurações
php artisan tinker
>>> App\Models\AdminConfiguracao::all()->toJson()
```

### Restaurar Configurações

```bash
# Importar configurações
php artisan tinker
>>> $config = json_decode(file_get_contents('backup.json'));
>>> foreach($config as $item) { AdminConfiguracao::updateOrCreate(['id' => $item->id], (array)$item); }
```

## 🎯 Benefícios

1. **Persistência**: Dados salvos no banco de dados
2. **Multi-tenancy**: Configurações por tenant
3. **Segurança**: Senha master para operações sensíveis
4. **Auditoria**: Log de todas as alterações
5. **Backup**: Integração com sistema de backup
6. **Performance**: Cache automático no frontend
7. **Flexibilidade**: Fácil extensão para novas configurações

## 🔮 Próximos Passos

- [ ] Implementar backup automático
- [ ] Adicionar mais configurações de segurança
- [ ] Criar dashboard de auditoria
- [ ] Implementar notificações por email
- [ ] Adicionar validação de configurações
- [ ] Criar interface de administração avançada 