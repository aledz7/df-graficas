<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use App\Models\Venda;
use App\Observers\VendaObserver;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Registrar observers
        Venda::observe(VendaObserver::class);
    }
}
