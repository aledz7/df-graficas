<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Verificar se a tabela dados_usuario existe e tem dados de marketplace
        if (Schema::hasTable('dados_usuario')) {
            $dadosMarketplace = DB::table('dados_usuario')
                ->where('chave', 'vendas_marketplace')
                ->get();

            foreach ($dadosMarketplace as $dado) {
                try {
                    $vendasData = json_decode($dado->valor, true);
                    
                    if (is_array($vendasData)) {
                        foreach ($vendasData as $vendaData) {
                            // Criar a venda
                            $vendaId = DB::table('marketplace_vendas')->insertGetId([
                                'tenant_id' => DB::table('users')->where('id', $dado->user_id)->value('tenant_id'),
                                'user_id' => $dado->user_id,
                                'id_venda' => $vendaData['id'] ?? 'mkt-' . uniqid(),
                                'data_venda' => $vendaData['data_venda'] ?? now(),
                                'valor_total' => $vendaData['valor_total'] ?? 0,
                                'status_pedido' => $vendaData['status_pedido'] ?? 'Aguardando Envio',
                                'observacoes' => $vendaData['observacoes'] ?? null,
                                'cliente_nome' => $vendaData['cliente_nome'] ?? '',
                                'cliente_contato' => $vendaData['cliente_contato'] ?? null,
                                'cliente_endereco' => $vendaData['cliente_endereco'] ?? null,
                                'codigo_rastreio' => $vendaData['codigo_rastreio'] ?? null,
                                'link_produto' => $vendaData['link_produto'] ?? null,
                                'vendedor_id' => $vendaData['vendedor_id'] ?? null,
                                'vendedor_nome' => $vendaData['vendedor_nome'] ?? null,
                                'fotos_produto' => json_encode($vendaData['fotos_produto'] ?? []),
                                'metadados' => json_encode($vendaData['metadados'] ?? []),
                                'created_at' => now(),
                                'updated_at' => now(),
                            ]);

                            // Criar os produtos da venda
                            if (isset($vendaData['produtos']) && is_array($vendaData['produtos'])) {
                                foreach ($vendaData['produtos'] as $produtoData) {
                                    DB::table('marketplace_venda_produtos')->insert([
                                        'marketplace_venda_id' => $vendaId,
                                        'produto_id' => $produtoData['id'] ?? null,
                                        'nome' => $produtoData['nome'] ?? '',
                                        'quantidade' => $produtoData['quantidade'] ?? 1,
                                        'preco_unitario' => $produtoData['preco_unitario'] ?? 0,
                                        'subtotal' => $produtoData['subtotal'] ?? 0,
                                        'metadados' => json_encode($produtoData['metadados'] ?? []),
                                        'created_at' => now(),
                                        'updated_at' => now(),
                                    ]);
                                }
                            }
                        }
                    }
                } catch (\Exception $e) {
                    // Log do erro mas continua a migração
                    \Log::error('Erro ao migrar dados de marketplace para usuário ' . $dado->user_id . ': ' . $e->getMessage());
                }
            }

            // Remover os dados antigos da tabela dados_usuario
            DB::table('dados_usuario')
                ->where('chave', 'vendas_marketplace')
                ->delete();
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Não é possível reverter esta migração de forma segura
        // pois os dados foram transformados de JSON para estrutura normalizada
    }
}; 