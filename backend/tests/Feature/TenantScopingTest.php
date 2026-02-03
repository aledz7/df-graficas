<?php

namespace Tests\Feature;

use App\Models\Tenant;
use App\Models\User;
use App\Models\Produto;
use App\Models\Cliente;
use App\Models\Categoria;
use App\Models\Subcategoria;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;
use Illuminate\Support\Facades\Hash;

class TenantScopingTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Setup the test environment.
     */
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        
        // Debug: Show current database connection and tables
        $this->debugDatabaseState('Before creating test data');
        
        // Create two tenants
        $this->tenant1 = Tenant::create([
            'nome' => 'Tenant 1',
            'email' => 'tenant1@example.com',
            'dominio' => 'tenant1',
            'database_connection' => 'sqlite',
            'database_name' => ':memory:',
            'ativo' => true,
        ]);
        
        $this->tenant2 = Tenant::create([
            'nome' => 'Tenant 2',
            'email' => 'tenant2@example.com',
            'dominio' => 'tenant2',
            'database_connection' => 'sqlite',
            'database_name' => ':memory:',
            'ativo' => true,
        ]);
        
        // Create users for each tenant
        $this->user1 = User::create([
            'name' => 'User 1',
            'email' => 'user1@example.com',
            'password' => Hash::make('password'),
            'tenant_id' => $this->tenant1->id,
            'is_admin' => false,
            'ativo' => true,
        ]);
        
        $this->user2 = User::create([
            'name' => 'User 2',
            'email' => 'user2@example.com',
            'password' => Hash::make('password'),
            'tenant_id' => $this->tenant2->id,
            'is_admin' => false,
            'ativo' => true,
        ]);
        
        // Create a category for products
        $this->categoria = Categoria::create([
            'tenant_id' => $this->tenant1->id,
            'nome' => 'Test Category',
            'descricao' => 'Test Description',
            'slug' => 'test-category-1',
            'ativo' => true,
        ]);
        
        // Debug: Show database state after creating test data
        $this->debugDatabaseState('After creating test data');
        
        // Set the default user for tests
        $this->actingAs($this->user1);
    }
    
    /**
     * Helper method to show database state (for debugging purposes)
     * @param string $message
     * @return void
     */
    protected function debugDatabaseState(string $message): void
    {
        // This method can be implemented for debugging database state during tests
        // Example implementation (commented out):
        /*
        $tables = \DB::select('SELECT name FROM sqlite_master WHERE type="table"');
        foreach ($tables as $table) {
            $tableName = $table->name;
            if ($tableName === 'sqlite_sequence') continue;
            $count = \DB::table($tableName)->count();
            // Log or process table info as needed
        }
        */
    }
    
    /** @test */
    public function it_filters_products_by_tenant()
    {
        // Create products for each tenant
        $product1 = Produto::create([
            'tenant_id' => $this->tenant1->id,
            'nome' => 'Product 1',
            'codigo_produto' => 'P1',
            'status' => true,
            'unidade_medida' => 'UN',
            'tipo_produto' => 'produto',
            'categoria_id' => $this->categoria->id,
            'preco_custo' => 10.00,
            'preco_venda' => 20.00,
            'estoque' => 100,
            'estoque_minimo' => 10
        ]);
        
        $product2 = Produto::create([
            'tenant_id' => $this->tenant2->id,
            'nome' => 'Product 2',
            'codigo_produto' => 'P2',
            'status' => true,
            'unidade_medida' => 'UN',
            'tipo_produto' => 'produto',
            'categoria_id' => $this->categoria->id,
            'preco_custo' => 15.00,
            'preco_venda' => 25.00,
            'estoque' => 50,
            'estoque_minimo' => 5
        ]);
        
        // Act as user1 (tenant1)
        $this->actingAs($this->user1);
        
        // Should only see tenant1's products
        $response = $this->getJson('/api/produtos');
        
        $response->assertStatus(200)
            ->assertJsonCount(1, 'data.data')  // Check the nested data array for paginated results
            ->assertJsonFragment(['nome' => 'Product 1'])
            ->assertJsonMissing(['nome' => 'Product 2']);
    }
    
    /** @test */
    public function it_filters_clientes_by_tenant()
    {
        // Create clientes for each tenant
        $cliente1 = Cliente::create([
            'tenant_id' => $this->tenant1->id,
            'nome_completo' => 'Cliente 1',
            'tipo_pessoa' => 'Pessoa Física',
            'cpf_cnpj' => '12345678901',
            'telefone_principal' => '11999998888',
            'email' => 'cliente1@example.com',
            'codigo_cliente' => 'CLI-' . time() . '-1',
            'status' => true
        ]);
        
        $cliente2 = Cliente::create([
            'tenant_id' => $this->tenant2->id,
            'nome_completo' => 'Cliente 2',
            'tipo_pessoa' => 'Pessoa Física',
            'cpf_cnpj' => '98765432100',
            'telefone_principal' => '11999997777',
            'email' => 'cliente2@example.com',
            'codigo_cliente' => 'CLI-' . time() . '-2',
            'status' => true
        ]);
        
        // Act as user1 (tenant1)
        $this->actingAs($this->user1);
        
        // Should only see tenant1's clientes
        $response = $this->getJson('/api/clientes');
        
        $response->assertStatus(200)
            ->assertJsonCount(1, 'data.data')  // Check the nested data array for paginated results
            ->assertJsonFragment(['nome_completo' => 'Cliente 1'])
            ->assertJsonMissing(['nome_completo' => 'Cliente 2']);
    }
    
    /** @test */
    public function it_prevents_creating_resources_for_other_tenants()
    {
        // Create a category for the product
        $categoria = Categoria::create([
            'tenant_id' => $this->tenant1->id,
            'nome' => 'Test Category',
            'descricao' => 'Test Description',
            'ativo' => true,
            'slug' => 'test-category-' . time() . '-' . rand(1000, 9999),
        ]);
        
        // Act as user1 (tenant1)
        $this->actingAs($this->user1);
        
        // Try to create a product for tenant2
        $response = $this->postJson('/api/produtos', [
            'nome' => 'Product X',
            'codigo_produto' => 'PX',
            'status' => true,
            'unidade_medida' => 'UN',
            'tipo_produto' => 'produto',
            'categoria_id' => $categoria->id,
            'preco_custo' => 10.50,
            'preco_venda' => 15.99,
            'estoque' => 100,
            'estoque_minimo' => 5,
            'tenant_id' => $this->tenant2->id // This should be ignored
        ]);
        
        // Should ignore the provided tenant_id and use the authenticated user's tenant
        $response->assertStatus(201);
        $this->assertDatabaseHas('produtos', [
            'nome' => 'Product X',
            'tenant_id' => $this->tenant1->id // Should use user1's tenant
        ]);
    }
    
    /** @test */
    public function it_prevents_accessing_other_tenants_resources()
    {
        // Create a category for the product
        $categoria = Categoria::create([
            'tenant_id' => $this->tenant2->id,
            'nome' => 'Test Category 2',
            'descricao' => 'Test Description 2',
            'ativo' => true,
            'slug' => 'test-category-' . time() . '-' . rand(1000, 9999),
        ]);
        
        // Create a product for tenant2
        $product = Produto::create([
            'tenant_id' => $this->tenant2->id,
            'nome' => 'Product Y',
            'codigo_produto' => 'PY',
            'status' => true,
            'unidade_medida' => 'UN',
            'tipo_produto' => 'produto',
            'categoria_id' => $categoria->id,
            'preco_custo' => 20.00,
            'preco_venda' => 30.00,
            'estoque' => 50,
            'estoque_minimo' => 5
        ]);
        
        // Act as user1 (tenant1)
        $this->actingAs($this->user1);
        
        // Should not be able to access tenant2's product
        $response = $this->getJson("/api/produtos/{$product->id}");
        $response->assertStatus(404);
    }
    
    /** @test */
    public function super_admin_can_see_all_resources()
    {
        // Create a super admin user
        $superAdmin = User::create([
            'name' => 'Super Admin',
            'email' => 'superadmin@example.com',
            'password' => Hash::make('password'),
            'tenant_id' => $this->tenant1->id,
            'is_admin' => true,
            'is_super_admin' => true,
            'ativo' => true,
        ]);
        
        // Create products for each tenant
        $product1 = Produto::create([
            'tenant_id' => $this->tenant1->id,
            'nome' => 'Product 1',
            'codigo_produto' => 'P1',
            'status' => true,
            'unidade_medida' => 'UN',
            'tipo_produto' => 'produto',
            'categoria_id' => $this->categoria->id,
            'preco_custo' => 10.00,
            'preco_venda' => 20.00,
            'estoque' => 100,
            'estoque_minimo' => 10
        ]);
        
        $product2 = Produto::create([
            'tenant_id' => $this->tenant2->id,
            'nome' => 'Product 2',
            'codigo_produto' => 'P2',
            'status' => true,
            'unidade_medida' => 'UN',
            'tipo_produto' => 'produto',
            'categoria_id' => $this->categoria->id,
            'preco_custo' => 15.00,
            'preco_venda' => 25.00,
            'estoque' => 50,
            'estoque_minimo' => 5
        ]);
        
        // Act as super admin
        $this->actingAs($superAdmin);
        
        // Should see all products
        $response = $this->getJson('/api/produtos');
        
        $response->assertStatus(200)
            ->assertJsonCount(2, 'data.data')  // Check the nested data array for paginated results
            ->assertJsonFragment(['nome' => 'Product 1'])
            ->assertJsonFragment(['nome' => 'Product 2']);
    }
}
