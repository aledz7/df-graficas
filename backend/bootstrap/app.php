<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // Register middleware aliases
        $middleware->alias([
            'tenant' => \App\Http\Middleware\SetTenantFromUser::class,
            'api.auth' => \App\Http\Middleware\ApiAuthenticate::class,
            'verificar.senha.master' => \App\Http\Middleware\VerificarSenhaMaster::class,
            'permission' => \App\Http\Middleware\CheckPermission::class,
            'funcionario' => \App\Http\Middleware\SetFuncionarioFromUser::class,
            'ensure.admin' => \App\Http\Middleware\EnsureAdmin::class,
        ]);

        // Apply tenant middleware to all API routes
        $middleware->appendToGroup('api', \App\Http\Middleware\SetTenantFromUser::class);
        
        // Apply vendedor middleware to OS routes
        $middleware->appendToGroup('api', \App\Http\Middleware\SetVendedorFromUser::class);
        
        // Apply funcionario middleware to all API routes
        $middleware->appendToGroup('api', \App\Http\Middleware\SetFuncionarioFromUser::class);
        
        $middleware->validateCsrfTokens(except: [
            'api/*',
            'sanctum/csrf-cookie',
            'login',
            'logout',
            'register',
        ]);

        // Adiciona headers CORS para todas as respostas
        $middleware->append(\App\Http\Middleware\Cors::class);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        //
    })->create();
