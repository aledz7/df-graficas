<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Http\JsonResponse;

class ImageUploadController extends Controller
{
    /**
     * Upload de imagem principal para produtos
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function uploadImagem(Request $request): JsonResponse
    {
        try {
            // Verificar se o arquivo foi enviado
            if (!$request->hasFile('imagem')) {
                return response()->json([
                    'success' => false,
                    'message' => 'Nenhum arquivo foi enviado',
                    'errors' => ['imagem' => ['Nenhum arquivo foi enviado']]
                ], 422);
            }

            $image = $request->file('imagem');
            
            // Verificar se é um arquivo válido
            if (!$image->isValid()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Arquivo inválido',
                    'errors' => ['imagem' => ['Arquivo inválido']]
                ], 422);
            }

            // Verificar tipo MIME
            $allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
            if (!in_array($image->getMimeType(), $allowedMimes)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Tipo de arquivo não permitido',
                    'errors' => ['imagem' => ['Tipo de arquivo não permitido']]
                ], 422);
            }

            $tenant_id = auth()->user()->tenant_id;
            $filename = 'produto_' . time() . '_' . Str::random(10) . '.' . $image->getClientOriginalExtension();
            
            // Armazena a imagem no diretório do tenant
            $path = Storage::disk('public')->putFileAs(
                'tenants/' . $tenant_id . '/produtos',
                $image,
                $filename
            );
            
            // Verificar se o arquivo foi salvo
            if (!Storage::disk('public')->exists($path)) {
                throw new \Exception('Arquivo não foi salvo corretamente');
            }
            
            // Retorna o caminho da imagem para ser armazenado no banco
            return response()->json([
                'success' => true,
                'path' => $path,
                'url' => Storage::url($path)
            ]);
        } catch (\Exception $e) {
            \Log::error('Erro ao fazer upload da imagem', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Erro ao fazer upload da imagem: ' . $e->getMessage(),
                'errors' => ['imagem' => ['Erro ao fazer upload da imagem']]
            ], 500);
        }
    }

    /**
     * Upload de múltiplas imagens para galeria de produtos
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function uploadGaleria(Request $request): JsonResponse
    {
        // Log para debug
        \Log::info('Tentando fazer upload da galeria', [
            'all_files' => $request->allFiles(),
            'has_imagens' => $request->hasFile('imagens'),
            'imagens_count' => $request->file('imagens') ? count($request->file('imagens')) : 0,
            'all_data' => $request->all(),
            'request_keys' => array_keys($request->all()),
            'files_keys' => array_keys($request->allFiles())
        ]);

        // Verificar se há arquivos
        if (!$request->hasFile('imagens')) {
            \Log::error('Nenhum arquivo encontrado na requisição');
            return response()->json([
                'success' => false,
                'message' => 'Nenhum arquivo foi enviado',
                'errors' => ['imagens' => ['Nenhum arquivo foi enviado']]
            ], 422);
        }

        $files = $request->file('imagens');
        
        // Se não for um array, converter para array
        if (!is_array($files)) {
            $files = [$files];
        }

        \Log::info('Arquivos processados:', [
            'files_count' => count($files),
            'files' => array_map(function($file) {
                return [
                    'name' => $file->getClientOriginalName(),
                    'size' => $file->getSize(),
                    'mime_type' => $file->getMimeType()
                ];
            }, $files)
        ]);

        $uploadedUrls = [];
        $errors = [];
        $tenant_id = auth()->user()->tenant_id;

        foreach ($files as $index => $file) {
            try {
                // Verificar se é um arquivo válido
                if (!$file->isValid()) {
                    $errors["imagens.{$index}"] = ['Arquivo inválido'];
                    continue;
                }

                // Verificar tipo MIME
                $allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
                if (!in_array($file->getMimeType(), $allowedMimes)) {
                    $errors["imagens.{$index}"] = ['Tipo de arquivo não permitido'];
                    continue;
                }

                $filename = 'galeria_' . time() . '_' . Str::random(10) . '_' . $index . '.' . $file->getClientOriginalExtension();
                $path = "tenants/{$tenant_id}/produtos/galeria/{$filename}";
                
                // Criar diretório se não existir
                $directory = storage_path("app/public/tenants/{$tenant_id}/produtos/galeria");
                if (!file_exists($directory)) {
                    mkdir($directory, 0755, true);
                }

                // Fazer upload do arquivo usando Storage::disk('public')
                Storage::disk('public')->putFileAs(
                    "tenants/{$tenant_id}/produtos/galeria",
                    $file,
                    $filename
                );
                
                $uploadedUrls[] = $path;
                
                \Log::info("Arquivo {$index} enviado com sucesso", [
                    'filename' => $filename,
                    'path' => $path
                ]);

            } catch (\Exception $e) {
                \Log::error("Erro ao fazer upload do arquivo {$index}", [
                    'error' => $e->getMessage(),
                    'file' => $file->getClientOriginalName()
                ]);
                $errors["imagens.{$index}"] = ['Erro ao fazer upload: ' . $e->getMessage()];
            }
        }

        if (!empty($errors)) {
            return response()->json([
                'success' => false,
                'message' => 'Alguns arquivos falharam no upload',
                'errors' => $errors,
                'uploaded_urls' => $uploadedUrls
            ], 422);
        }

        return response()->json([
            'success' => true,
            'message' => 'Galeria enviada com sucesso',
            'urls' => $uploadedUrls
        ]);
    }

    /**
     * Upload de foto para clientes
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function uploadFotoCliente(Request $request): JsonResponse
    {
        try {
            // Verificar se o arquivo foi enviado
            if (!$request->hasFile('foto')) {
                return response()->json([
                    'success' => false,
                    'message' => 'Nenhum arquivo foi enviado',
                    'errors' => ['foto' => ['Nenhum arquivo foi enviado']]
                ], 422);
            }

            $image = $request->file('foto');
            
            // Verificar se é um arquivo válido
            if (!$image->isValid()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Arquivo inválido',
                    'errors' => ['foto' => ['Arquivo inválido']]
                ], 422);
            }

            // Verificar tipo MIME
            $allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
            if (!in_array($image->getMimeType(), $allowedMimes)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Tipo de arquivo não permitido',
                    'errors' => ['foto' => ['Tipo de arquivo não permitido']]
                ], 422);
            }

            $tenant_id = auth()->user()->tenant_id;
            $filename = 'cliente_' . time() . '_' . Str::random(10) . '.' . $image->getClientOriginalExtension();
            
            // Armazena a imagem no diretório do tenant
            $path = Storage::disk('public')->putFileAs(
                'tenants/' . $tenant_id . '/clientes',
                $image,
                $filename
            );
            
            // Verificar se o arquivo foi salvo
            if (!Storage::disk('public')->exists($path)) {
                throw new \Exception('Arquivo não foi salvo corretamente');
            }
            
            // Retorna o caminho da imagem para ser armazenado no banco
            return response()->json([
                'success' => true,
                'path' => $path,
                'url' => Storage::url($path)
            ]);
        } catch (\Exception $e) {
            \Log::error('Erro ao fazer upload da foto do cliente', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Erro ao fazer upload da foto: ' . $e->getMessage(),
                'errors' => ['foto' => ['Erro ao fazer upload da foto']]
            ], 500);
        }
    }

    /**
     * Upload de QR Code para contas bancárias
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function uploadQrCode(Request $request): JsonResponse
    {
        try {
            // Verificar se o arquivo foi enviado
            if (!$request->hasFile('qr_code')) {
                return response()->json([
                    'success' => false,
                    'message' => 'Nenhum arquivo foi enviado',
                    'errors' => ['qr_code' => ['Nenhum arquivo foi enviado']]
                ], 422);
            }

            $image = $request->file('qr_code');
            
            // Verificar se é um arquivo válido
            if (!$image->isValid()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Arquivo inválido',
                    'errors' => ['qr_code' => ['Arquivo inválido']]
                ], 422);
            }

            // Verificar tipo MIME
            $allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
            if (!in_array($image->getMimeType(), $allowedMimes)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Tipo de arquivo não permitido',
                    'errors' => ['qr_code' => ['Tipo de arquivo não permitido']]
                ], 422);
            }

            $tenant_id = auth()->user()->tenant_id;
            $filename = 'qr_code_' . time() . '_' . Str::random(10) . '.' . $image->getClientOriginalExtension();
            
            // Log para debug
            \Log::info('Tentando fazer upload de QR Code', [
                'tenant_id' => $tenant_id,
                'filename' => $filename,
                'original_name' => $image->getClientOriginalName(),
                'size' => $image->getSize(),
                'size_mb' => round($image->getSize() / (1024 * 1024), 2),
                'mime_type' => $image->getMimeType()
            ]);
            
            // Armazena a imagem no diretório do tenant
            $path = Storage::disk('public')->putFileAs(
                'tenants/' . $tenant_id . '/contas-bancarias',
                $image,
                $filename
            );
            
            // Verificar se o arquivo foi salvo
            if (!Storage::disk('public')->exists($path)) {
                throw new \Exception('Arquivo não foi salvo corretamente');
            }
            
            // Log do caminho salvo
            \Log::info('QR Code salvo com sucesso', [
                'path' => $path,
                'full_path' => Storage::disk('public')->path($path),
                'url' => Storage::url($path)
            ]);
            
            // Retorna o caminho da imagem para ser armazenado no banco
            return response()->json([
                'success' => true,
                'path' => $path,
                'url' => Storage::url($path)
            ]);
        } catch (\Exception $e) {
            \Log::error('Erro ao fazer upload do QR Code', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Erro ao fazer upload do QR Code: ' . $e->getMessage(),
                'errors' => ['qr_code' => ['Erro ao fazer upload do QR Code']]
            ], 500);
        }
    }

    /**
     * Upload de anexos para produção de OS
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function uploadAnexoProducao(Request $request): JsonResponse
    {
        try {
            // Verificar se o arquivo foi enviado
            if (!$request->hasFile('anexo')) {
                return response()->json([
                    'success' => false,
                    'message' => 'Nenhum arquivo foi enviado',
                    'errors' => ['anexo' => ['Nenhum arquivo foi enviado']]
                ], 422);
            }

            $file = $request->file('anexo');
            
            // Verificar se é um arquivo válido
            if (!$file->isValid()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Arquivo inválido',
                    'errors' => ['anexo' => ['Arquivo inválido']]
                ], 422);
            }

            // Verificar tipo MIME - permitir imagens e PDFs
            $allowedMimes = [
                'image/jpeg', 'image/png', 'image/gif', 'image/webp',
                'application/pdf'
            ];
            if (!in_array($file->getMimeType(), $allowedMimes)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Tipo de arquivo não permitido',
                    'errors' => ['anexo' => ['Tipo de arquivo não permitido']]
                ], 422);
            }

            $tenant_id = auth()->user()->tenant_id;
            $os_id = $request->input('os_id', 'geral');
            
            // Obter a extensão correta do arquivo
            $extension = $file->getClientOriginalExtension();
            if (empty($extension)) {
                // Se não conseguir obter a extensão pelo nome, usar o MIME type
                $mimeType = $file->getMimeType();
                $extensionMap = [
                    'image/jpeg' => 'jpg',
                    'image/png' => 'png',
                    'image/gif' => 'gif',
                    'image/webp' => 'webp',
                    'application/pdf' => 'pdf'
                ];
                $extension = $extensionMap[$mimeType] ?? 'bin';
            }
            
            $filename = 'anexo_' . time() . '_' . Str::random(10) . '.' . $extension;
            
            // Armazena o arquivo no diretório do tenant
            $path = Storage::disk('public')->putFileAs(
                'tenants/' . $tenant_id . '/producao/' . $os_id,
                $file,
                $filename
            );
            
            // Verificar se o arquivo foi salvo
            if (!Storage::disk('public')->exists($path)) {
                throw new \Exception('Arquivo não foi salvo corretamente');
            }
            
            // Retorna o caminho do arquivo para ser armazenado no banco
            $responseData = [
                'success' => true,
                'path' => $path,
                'url' => url('/storage/' . $path), // Usar URL completa
                'filename' => $filename, // Usar o nome do arquivo gerado com extensão
                'original_name' => $file->getClientOriginalName(), // Nome original do arquivo
                'type' => $file->getMimeType(),
                'size' => $file->getSize()
            ];
            
            return response()->json($responseData);
        } catch (\Exception $e) {
            \Log::error('Erro ao fazer upload do anexo', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Erro ao fazer upload do anexo: ' . $e->getMessage(),
                'errors' => ['anexo' => ['Erro ao fazer upload do anexo']]
            ], 500);
        }
    }

    /**
     * Upload de anexos para entrega de OS
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function uploadAnexoEntrega(Request $request): JsonResponse
    {
        try {
            // Verificar se o arquivo foi enviado
            if (!$request->hasFile('anexo')) {
                return response()->json([
                    'success' => false,
                    'message' => 'Nenhum arquivo foi enviado',
                    'errors' => ['anexo' => ['Nenhum arquivo foi enviado']]
                ], 422);
            }

            $file = $request->file('anexo');
            
            // Verificar se é um arquivo válido
            if (!$file->isValid()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Arquivo inválido',
                    'errors' => ['anexo' => ['Arquivo inválido']]
                ], 422);
            }

            // Verificar tipo MIME
            $allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
            if (!in_array($file->getMimeType(), $allowedMimes)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Tipo de arquivo não permitido',
                    'errors' => ['anexo' => ['Tipo de arquivo não permitido']]
                ], 422);
            }

            $tenant_id = auth()->user()->tenant_id;
            $os_id = $request->input('os_id', 'geral');
            
            // Obter a extensão correta do arquivo
            $extension = $file->getClientOriginalExtension();
            if (empty($extension)) {
                // Se não conseguir obter a extensão pelo nome, usar o MIME type
                $mimeType = $file->getMimeType();
                $extensionMap = [
                    'image/jpeg' => 'jpg',
                    'image/png' => 'png',
                    'image/gif' => 'gif',
                    'image/webp' => 'webp',
                    'application/pdf' => 'pdf'
                ];
                $extension = $extensionMap[$mimeType] ?? 'bin';
            }
            
            $filename = 'anexo_entrega_' . time() . '_' . Str::random(10) . '.' . $extension;
            
            // Armazena o arquivo no diretório do tenant (em uma pasta específica para entrega)
            $path = Storage::disk('public')->putFileAs(
                'tenants/' . $tenant_id . '/entrega/' . $os_id,
                $file,
                $filename
            );
            
            // Verificar se o arquivo foi salvo
            if (!Storage::disk('public')->exists($path)) {
                throw new \Exception('Arquivo não foi salvo corretamente');
            }
            
            // Retorna o caminho do arquivo para ser armazenado no banco
            $responseData = [
                'success' => true,
                'path' => $path,
                'url' => url('/storage/' . $path), // Usar URL completa
                'filename' => $filename, // Usar o nome do arquivo gerado com extensão
                'original_name' => $file->getClientOriginalName(), // Nome original do arquivo
                'type' => $file->getMimeType(),
                'size' => $file->getSize()
            ];
            
            return response()->json($responseData);
        } catch (\Exception $e) {
            \Log::error('Erro ao fazer upload do anexo de entrega', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Erro ao fazer upload do anexo: ' . $e->getMessage(),
                'errors' => ['anexo' => ['Erro ao fazer upload do anexo']]
            ], 500);
        }
    }

    /**
     * Upload de foto para funcionários
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function uploadFotoFuncionario(Request $request): JsonResponse
    {
        try {
            // Verificar se o arquivo foi enviado
            if (!$request->hasFile('foto')) {
                return response()->json([
                    'success' => false,
                    'message' => 'Nenhum arquivo foi enviado',
                    'errors' => ['foto' => ['Nenhum arquivo foi enviado']]
                ], 422);
            }

            $image = $request->file('foto');
            
            // Verificar se é um arquivo válido
            if (!$image->isValid()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Arquivo inválido',
                    'errors' => ['foto' => ['Arquivo inválido']]
                ], 422);
            }

            // Verificar tipo MIME
            $allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
            if (!in_array($image->getMimeType(), $allowedMimes)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Tipo de arquivo não permitido',
                    'errors' => ['foto' => ['Tipo de arquivo não permitido']]
                ], 422);
            }

            $tenant_id = auth()->user()->tenant_id;
            $filename = 'funcionario_' . time() . '_' . Str::random(10) . '.' . $image->getClientOriginalExtension();
            
            // Armazena a imagem no diretório do tenant
            $path = Storage::disk('public')->putFileAs(
                'tenants/' . $tenant_id . '/funcionarios',
                $image,
                $filename
            );
            
            // Verificar se o arquivo foi salvo
            if (!Storage::disk('public')->exists($path)) {
                throw new \Exception('Arquivo não foi salvo corretamente');
            }
            
            // Retorna o caminho da imagem para ser armazenado no banco
            return response()->json([
                'success' => true,
                'path' => $path,
                'url' => Storage::url($path)
            ]);
        } catch (\Exception $e) {
            \Log::error('Erro ao fazer upload da foto do funcionário', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Erro ao fazer upload da foto: ' . $e->getMessage(),
                'errors' => ['foto' => ['Erro ao fazer upload da foto']]
            ], 500);
        }
    }

    /**
     * Upload de anexos para movimentações de caixa (Sangria/Suprimento)
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function uploadAnexoMovimentacao(Request $request): JsonResponse
    {
        try {
            // Verificar se o arquivo foi enviado
            if (!$request->hasFile('anexo')) {
                return response()->json([
                    'success' => false,
                    'message' => 'Nenhum arquivo foi enviado',
                    'errors' => ['anexo' => ['Nenhum arquivo foi enviado']]
                ], 422);
            }

            $file = $request->file('anexo');
            
            // Verificar se é um arquivo válido
            if (!$file->isValid()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Arquivo inválido',
                    'errors' => ['anexo' => ['Arquivo inválido']]
                ], 422);
            }

            // Verificar tipo MIME - permitir imagens e PDFs
            $allowedMimes = [
                'image/jpeg', 'image/png', 'image/gif', 'image/webp',
                'application/pdf'
            ];
            if (!in_array($file->getMimeType(), $allowedMimes)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Tipo de arquivo não permitido',
                    'errors' => ['anexo' => ['Tipo de arquivo não permitido']]
                ], 422);
            }

            $tenant_id = auth()->user()->tenant_id;
            $movimentacao_id = $request->input('movimentacao_id', 'geral');
            
            // Obter a extensão correta do arquivo
            $extension = $file->getClientOriginalExtension();
            if (empty($extension)) {
                // Se não conseguir obter a extensão pelo nome, usar o MIME type
                $mimeType = $file->getMimeType();
                $extensionMap = [
                    'image/jpeg' => 'jpg',
                    'image/png' => 'png',
                    'image/gif' => 'gif',
                    'image/webp' => 'webp',
                    'application/pdf' => 'pdf'
                ];
                $extension = $extensionMap[$mimeType] ?? 'bin';
            }
            
            $filename = 'recibo_movimentacao_' . time() . '_' . Str::random(10) . '.' . $extension;
            
            // Armazena o arquivo no diretório do tenant (em uma pasta específica para movimentações)
            $path = Storage::disk('public')->putFileAs(
                'tenants/' . $tenant_id . '/movimentacoes/' . $movimentacao_id,
                $file,
                $filename
            );
            
            // Verificar se o arquivo foi salvo
            if (!Storage::disk('public')->exists($path)) {
                throw new \Exception('Arquivo não foi salvo corretamente');
            }
            
            // Retorna o caminho do arquivo para ser armazenado no banco
            $responseData = [
                'success' => true,
                'path' => $path,
                'url' => url('/storage/' . $path), // Usar URL completa
                'filename' => $filename, // Usar o nome do arquivo gerado com extensão
                'original_name' => $file->getClientOriginalName(), // Nome original do arquivo
                'type' => $file->getMimeType(),
                'size' => $file->getSize()
            ];
            
            return response()->json($responseData);
        } catch (\Exception $e) {
            \Log::error('Erro ao fazer upload do anexo de movimentação', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Erro ao fazer upload do anexo: ' . $e->getMessage(),
                'errors' => ['anexo' => ['Erro ao fazer upload do anexo']]
            ], 500);
        }
    }
}
