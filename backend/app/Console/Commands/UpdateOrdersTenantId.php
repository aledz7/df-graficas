<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\OrdemServico;

class UpdateOrdersTenantId extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'orders:update-tenant {tenant_id}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Update tenant_id for orders without one';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $tenantId = $this->argument('tenant_id');
        
        $count = OrdemServico::whereNull('tenant_id')->update(['tenant_id' => $tenantId]);
        
        $this->info("Updated $count orders with tenant_id: $tenantId");
    }
}
