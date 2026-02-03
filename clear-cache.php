<?php
// Script para limpar cache e forçar recarregamento de arquivos JavaScript
header('Content-Type: text/html; charset=utf-8');

// Função para limpar cache do navegador
function clearBrowserCache() {
    // Headers para forçar limpeza de cache
    header("Cache-Control: no-cache, no-store, must-revalidate");
    header("Pragma: no-cache");
    header("Expires: 0");
}

// Função para verificar MIME type de arquivos
function checkMimeType($file) {
    if (!file_exists($file)) {
        return "Arquivo não encontrado";
    }
    
    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $mimeType = finfo_file($finfo, $file);
    finfo_close($finfo);
    
    return $mimeType;
}

clearBrowserCache();
?>
<!DOCTYPE html>
<html lang="pt-br">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Limpeza de Cache - Sistema Gráficas</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 800px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .status { padding: 10px; margin: 10px 0; border-radius: 5px; }
        .success { background-color: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
        .error { background-color: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
        .info { background-color: #d1ecf1; color: #0c5460; border: 1px solid #bee5eb; }
        .warning { background-color: #fff3cd; color: #856404; border: 1px solid #ffeaa7; }
        .btn { background: #007bff; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; margin: 5px; }
        .btn:hover { background: #0056b3; }
        .btn-success { background: #28a745; }
        .btn-success:hover { background: #1e7e34; }
        .file-list { background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 10px 0; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔧 Limpeza de Cache - Sistema Gráficas</h1>
        
        <div class="status info">
            <strong>Instruções:</strong> Este script ajuda a limpar o cache e verificar se os arquivos JavaScript estão sendo servidos corretamente.
        </div>

        <h2>📁 Verificação de Arquivos</h2>
        <div class="file-list">
            <?php
            $files = [
                'dist/assets/index-0771b0ce.js',
                'dist/assets/AppRoutes-fc8a1eb0.js', 
                'dist/assets/PDVPage-47caf28f.js',
                'dist/assets/MarketplacePage-fb58826c.js'
            ];
            
            foreach ($files as $file) {
                $fullPath = __DIR__ . '/' . $file;
                $mimeType = checkMimeType($fullPath);
                $exists = file_exists($fullPath);
                $size = $exists ? filesize($fullPath) : 0;
                
                echo "<div class='status " . ($exists && strpos($mimeType, 'javascript') !== false ? 'success' : 'error') . "'>";
                echo "<strong>" . basename($file) . ":</strong> ";
                if ($exists) {
                    echo "✅ Existe | Tamanho: " . number_format($size) . " bytes | MIME: " . $mimeType;
                } else {
                    echo "❌ Não encontrado";
                }
                echo "</div>";
            }
            ?>
        </div>

        <h2>🔄 Ações de Limpeza</h2>
        
        <div class="status info">
            <strong>Cache do Navegador:</strong> Pressione Ctrl+Shift+R (ou Cmd+Shift+R no Mac) para recarregar sem cache.
        </div>

        <div class="status warning">
            <strong>Cache do Cloudflare:</strong> Se você estiver usando Cloudflare, é necessário limpar o cache no painel de controle do Cloudflare.
        </div>

        <h2>🧪 Teste de Carregamento</h2>
        <button class="btn" onclick="testModuleLoading()">Testar Carregamento de Módulos</button>
        <button class="btn btn-success" onclick="window.location.href='/operacional/pdv'">Ir para PDV</button>
        
        <div id="test-results"></div>

        <h2>📋 Logs do Servidor</h2>
        <div class="file-list">
            <pre><?php
            // Mostrar informações do servidor
            echo "Servidor: " . $_SERVER['SERVER_SOFTWARE'] . "\n";
            echo "PHP Version: " . PHP_VERSION . "\n";
            echo "Document Root: " . $_SERVER['DOCUMENT_ROOT'] . "\n";
            echo "Script Path: " . __FILE__ . "\n";
            echo "Current Time: " . date('Y-m-d H:i:s') . "\n";
            ?></pre>
        </div>
    </div>

    <script>
        async function testModuleLoading() {
            const resultsDiv = document.getElementById('test-results');
            resultsDiv.innerHTML = '<div class="status info">Testando carregamento de módulos...</div>';
            
            const files = [
                '/assets/index-0771b0ce.js',
                '/assets/AppRoutes-fc8a1eb0.js',
                '/assets/PDVPage-47caf28f.js'
            ];
            
            let results = '';
            
            for (const file of files) {
                try {
                    const response = await fetch(file);
                    const contentType = response.headers.get('content-type');
                    
                    if (response.ok && contentType && contentType.includes('application/javascript')) {
                        results += `<div class="status success">✅ ${file}: OK (${contentType})</div>`;
                        
                        // Tentar carregar como módulo
                        try {
                            const module = await import(file);
                            results += `<div class="status success">✅ Módulo ${file}: Carregado com sucesso</div>`;
                        } catch (importError) {
                            results += `<div class="status warning">⚠️ Módulo ${file}: Erro ao importar - ${importError.message}</div>`;
                        }
                    } else {
                        results += `<div class="status error">❌ ${file}: MIME type incorreto (${contentType})</div>`;
                    }
                } catch (error) {
                    results += `<div class="status error">❌ ${file}: Erro - ${error.message}</div>`;
                }
            }
            
            resultsDiv.innerHTML = results;
        }
    </script>
</body>
</html>
