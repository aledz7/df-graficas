# Solução para Tela Branca na Página PDV

## Problema Identificado

A página PDV está exibindo uma tela branca devido ao erro:
```
Failed to load module script: Expected a JavaScript-or-Wasm module script but the server responded with a MIME type of "text/html".
TypeError: Failed to fetch dynamically imported module: https://sistema-graficas.dfinformatica.net/assets/PDVPage-47caf28f.js
```

## Causa Raiz

O problema está relacionado ao cache do Cloudflare que está servindo versões antigas dos arquivos JavaScript com MIME type incorreto.

## Soluções Aplicadas

### 1. Configurações de Cache no .htaccess

Foram adicionadas configurações específicas para forçar a limpeza de cache:

```apache
# Configurações específicas para arquivos de build do Vite
<FilesMatch ".*-[a-f0-9]{8}\.js$">
    Header always set Content-Type "application/javascript; charset=utf-8"
    Header always set Cache-Control "no-cache, no-store, must-revalidate, max-age=0"
    Header always set Pragma "no-cache"
    Header always set Expires "Thu, 01 Jan 1970 00:00:00 GMT"
</FilesMatch>
```

### 2. Script de Verificação

Foi criado o arquivo `clear-cache.php` para:
- Verificar se os arquivos JavaScript existem
- Testar o MIME type dos arquivos
- Forçar limpeza de cache do navegador
- Testar carregamento de módulos

## Passos para Resolver

### Passo 1: Acessar o Script de Verificação
1. Acesse: `https://sistema-graficas.dfinformatica.net/clear-cache.php`
2. Verifique se todos os arquivos estão sendo servidos com MIME type correto
3. Execute o teste de carregamento de módulos

### Passo 2: Limpar Cache do Cloudflare
1. Acesse o painel de controle do Cloudflare
2. Vá para "Caching" > "Configuration"
3. Clique em "Purge Everything" ou "Custom Purge"
4. Selecione os arquivos específicos:
   - `/assets/index-0771b0ce.js`
   - `/assets/AppRoutes-fc8a1eb0.js`
   - `/assets/PDVPage-47caf28f.js`
   - `/assets/MarketplacePage-fb58826c.js`

### Passo 3: Limpar Cache do Navegador
1. Pressione `Ctrl+Shift+R` (Windows/Linux) ou `Cmd+Shift+R` (Mac)
2. Ou abra as ferramentas de desenvolvedor (F12)
3. Clique com o botão direito no botão de recarregar
4. Selecione "Esvaziar cache e recarregar"

### Passo 4: Verificar Configurações do Servidor
Se o problema persistir, verifique se o servidor está configurado corretamente:

```bash
# Verificar MIME type do arquivo PDVPage
curl -I https://sistema-graficas.dfinformatica.net/assets/PDVPage-47caf28f.js

# Deve retornar:
# Content-Type: application/javascript; charset=utf-8
```

### Passo 5: Rebuild do Projeto (se necessário)
```bash
npm run build
```

## Arquivos de Teste Criados

1. **`test-pdv.html`** - Teste básico de carregamento
2. **`test-pdv-direct.html`** - Teste direto de módulos
3. **`clear-cache.php`** - Script completo de verificação e limpeza

## Verificação Final

Após seguir todos os passos:

1. Acesse `https://sistema-graficas.dfinformatica.net/operacional/pdv`
2. A página deve carregar normalmente sem tela branca
3. Verifique o console do navegador (F12) - não deve haver erros de MIME type

## Se o Problema Persistir

1. Verifique os logs do servidor Apache/Nginx
2. Confirme se o Cloudflare está configurado corretamente
3. Teste em modo incógnito/privado
4. Verifique se há regras de reescrita conflitantes no .htaccess

## Contato

Se o problema persistir após seguir todos os passos, entre em contato com o suporte técnico fornecendo:
- Screenshot do console do navegador
- Resultado do script `clear-cache.php`
- Logs do servidor (se disponíveis)
