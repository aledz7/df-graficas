<?php

namespace App\Http\Controllers\Api;

use App\Models\Empresa;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class EmpresaController extends BaseController
{
    /**
     * Get the current empresa data
     *
     * @return JsonResponse
     */
    public function show(): JsonResponse
    {
        try {
            \Log::info('🔍 Buscando dados da empresa para tenant: ' . auth()->user()->tenant_id);
            
            $empresa = Empresa::getEmpresaAtual();
            
            \Log::info('🏢 Dados encontrados:', $empresa ? $empresa->toArray() : ['message' => 'Nenhuma empresa encontrada']);
            
            if (!$empresa) {
                // Se não existe empresa, criar uma com dados padrão
                \Log::info('📝 Criando empresa padrão...');
                $empresa = Empresa::create([
                    'tenant_id' => auth()->user()->tenant_id,
                    'nome_fantasia' => 'Sua Empresa',
                    'razao_social' => '',
                    'cnpj' => '',
                    'inscricao_estadual' => '',
                    'inscricao_municipal' => '',
                    'email' => 'contato@suaempresa.com',
                    'telefone' => '',
                    'whatsapp' => '',
                    'endereco_completo' => '',
                    'instagram' => '',
                    'site' => '',
                    'logo_url' => null,
                    'nome_sistema' => 'Sistema Gráficas',
                    'mensagem_rodape' => 'Obrigado pela preferência!',
                    'senha_supervisor' => null,
                    'termos_servico' => 'Termos de serviço padrão da empresa...',
                    'politica_privacidade' => 'Política de privacidade padrão da empresa...',
                ]);
                \Log::info('✅ Empresa padrão criada:', $empresa->toArray());
            }

            \Log::info('📤 Retornando dados da empresa:', $empresa->toArray());
            return $this->success($empresa);
        } catch (\Exception $e) {
            \Log::error('❌ Erro ao buscar dados da empresa: ' . $e->getMessage());
            return $this->error('Erro ao buscar dados da empresa: ' . $e->getMessage());
        }
    }

    /**
     * Update the current empresa data
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function update(Request $request): JsonResponse
    {
        try {
            $mensagens = [
                'nome_fantasia.required' => 'O nome fantasia é obrigatório.',
                'email.email' => 'Informe um e-mail válido.',
                'site.url' => 'O campo Site deve ser uma URL válida. Informe o endereço completo começando com http:// ou https:// (ex: https://www.suaempresa.com.br).',
            ];

            $dados = $request->validate([
                'nome_fantasia' => 'required|string|max:255',
                'razao_social' => 'nullable|string|max:255',
                'cnpj' => 'nullable|string|max:20',
                'inscricao_estadual' => 'nullable|string|max:20',
                'inscricao_municipal' => 'nullable|string|max:20',
                'email' => 'nullable|email|max:255',
                'telefone' => 'nullable|string|max:20',
                'whatsapp' => 'nullable|string|max:20',
                'endereco_completo' => 'nullable|string',
                'instagram' => 'nullable|string|max:255',
                'site' => 'nullable|url|max:255',
                'logo_url' => 'nullable|string',
                'nome_sistema' => 'nullable|string|max:255',
                'mensagem_rodape' => 'nullable|string',
                'senha_supervisor' => 'nullable|string|max:255',
                'termos_servico' => 'nullable|string',
                'politica_privacidade' => 'nullable|string',
            ], $mensagens);

            // Buscar ou criar a empresa atual
            $empresa = Empresa::firstOrCreate(
                ['tenant_id' => auth()->user()->tenant_id],
                [
                    'nome_fantasia' => 'Sua Empresa',
                    'nome_sistema' => 'Sistema Gráficas',
                    'mensagem_rodape' => 'Obrigado pela preferência!',
                ]
            );

            // Atualizar com os novos dados
            $empresa->update($dados);

            return $this->success($empresa, 'Dados da empresa atualizados com sucesso');
        } catch (ValidationException $e) {
            $errors = $e->errors();
            $mensagem = 'Não foi possível salvar. ';
            foreach ($errors as $campo => $msgs) {
                $mensagem .= is_array($msgs) ? implode(' ', $msgs) : $msgs;
                break;
            }
            return $this->error($mensagem);
        } catch (\Exception $e) {
            return $this->error('Erro ao atualizar dados da empresa: ' . $e->getMessage());
        }
    }

    /**
     * Upload logo da empresa
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function uploadLogo(Request $request): JsonResponse
    {
        $request->validate([
            'logo' => 'required|image|max:2048', // 2MB max
        ]);

        try {
            $tenant_id = auth()->user()->tenant_id;
            $image = $request->file('logo');
            $filename = 'logo_empresa_' . time() . '_' . Str::random(10) . '.' . $image->getClientOriginalExtension();
            
            // Armazena a imagem no diretório do tenant
            $path = Storage::disk('public')->putFileAs(
                'tenants/' . $tenant_id . '/empresa',
                $image,
                $filename
            );
            
            // Buscar ou criar a empresa atual
            $empresa = Empresa::firstOrCreate(
                ['tenant_id' => $tenant_id],
                [
                    'nome_fantasia' => 'Sua Empresa',
                    'nome_sistema' => 'Sistema Gráficas',
                    'mensagem_rodape' => 'Obrigado pela preferência!',
                ]
            );
            
            // Remove a logo anterior se existir
            if ($empresa->logo_url && Storage::disk('public')->exists($empresa->logo_url)) {
                Storage::disk('public')->delete($empresa->logo_url);
            }
            
            // Atualiza com o novo caminho
            $empresa->update(['logo_url' => $path]);
            
            return response()->json([
                'success' => true,
                'url' => Storage::url($path),
                'path' => $path,
                'message' => 'Logo atualizada com sucesso'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro ao fazer upload da logo: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get empresa data by tenant ID (public route)
     *
     * @param int $tenantId
     * @return JsonResponse
     */
    public function getByTenant($tenantId): JsonResponse
    {
        try {
            \Log::info('🔍 Buscando dados da empresa para tenant público: ' . $tenantId);
            
            $empresa = Empresa::withoutTenant()->where('tenant_id', $tenantId)->first();
            
            \Log::info('🏢 Dados encontrados para tenant público:', $empresa ? $empresa->toArray() : ['message' => 'Nenhuma empresa encontrada']);
            
            if (!$empresa) {
                return $this->notFound('Empresa não encontrada para este tenant');
            }

            \Log::info('📤 Retornando dados da empresa para tenant público:', $empresa->toArray());
            return $this->success($empresa);
        } catch (\Exception $e) {
            \Log::error('❌ Erro ao buscar dados da empresa por tenant: ' . $e->getMessage());
            return $this->error('Erro ao buscar dados da empresa: ' . $e->getMessage());
        }
    }

    /**
     * Test method to check empresa data
     *
     * @return JsonResponse
     */
    public function test(): JsonResponse
    {
        try {
            
            // Buscar empresa diretamente
            $empresa = Empresa::where('tenant_id', auth()->user()->tenant_id)->first();
            
            if ($empresa) {
                \Log::info('✅ Empresa encontrada no teste:', $empresa->toArray());
                return response()->json([
                    'success' => true,
                    'message' => 'Empresa encontrada',
                    'data' => $empresa,
                    'debug' => [
                        'user_id' => auth()->id(),
                        'tenant_id' => auth()->user()->tenant_id,
                        'empresa_id' => $empresa->id
                    ]
                ]);
            } else {
                \Log::warning('⚠️ Nenhuma empresa encontrada no teste');
                return response()->json([
                    'success' => false,
                    'message' => 'Nenhuma empresa encontrada',
                    'debug' => [
                        'user_id' => auth()->id(),
                        'tenant_id' => auth()->user()->tenant_id
                    ]
                ]);
            }
        } catch (\Exception $e) {
            \Log::error('❌ Erro no teste: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Erro: ' . $e->getMessage()
            ]);
        }
    }
}
