<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class Cors
{
    public function handle(Request $request, Closure $next)
    {
        $allowedOrigins = [
            'http://localhost:5173',
            'http://localhost:5174',
            'http://localhost:5180',
            'http://127.0.0.1:5173',
            'http://127.0.0.1:5174',
            'http://127.0.0.1:5180',
            'http://localhost:8000',
            env('FRONTEND_URL', 'http://localhost:5173'),
            'https://sistema-graficas.dfinformatica.net',
            'https://www.sistema-graficas.dfinformatica.net',
        ];

        $origin = $request->headers->get('Origin');
        $origin = in_array($origin, $allowedOrigins) ? $origin : $allowedOrigins[0];

        $headers = [
            'Access-Control-Allow-Origin' => $origin,
            'Access-Control-Allow-Methods' => 'POST, GET, OPTIONS, PUT, DELETE',
            'Access-Control-Allow-Credentials' => 'true',
            'Access-Control-Max-Age' => '86400',
            'Access-Control-Allow-Headers' => 'Content-Type, Authorization, X-Requested-With, X-XSRF-TOKEN, Accept, X-Socket-Id',
        ];

        if ($request->isMethod('OPTIONS')) {
            return new Response('', 200, $headers);
        }

        $response = $next($request);
        
        foreach ($headers as $key => $value) {
            $response->headers->set($key, $value);
        }

        return $response;
    }
}
