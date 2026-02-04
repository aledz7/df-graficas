<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Corrige URLs em que a query string foi anexada com "&" em vez de "?".
 * Recria a requisição com a URI corrigida para o roteador casar a rota corretamente.
 * Ex.: api/cores&per_page=100 -> api/cores?per_page=100
 */
class NormalizeMalformedQueryString
{
    public function handle(Request $request, Closure $next): Response
    {
        $uri = $request->getRequestUri();

        // Se a URI contém "&" mas não contém "?" antes do primeiro "&", a URL está malformada
        $firstAmp = strpos($uri, '&');
        $firstQ = strpos($uri, '?');

        if ($firstAmp !== false && ($firstQ === false || $firstAmp < $firstQ)) {
            // Reescreve o primeiro "&" como "?"
            $fixedUri = substr_replace($uri, '?', $firstAmp, 1);

            // Recria a requisição com a URI corrigida
            $newRequest = Request::create(
                $fixedUri,
                $request->method(),
                $request->all(),
                $request->cookies->all(),
                $request->allFiles(),
                $request->server->all(),
                $request->getContent()
            );

            // Copia headers e session
            $newRequest->headers->replace($request->headers->all());
            if ($request->hasSession()) {
                $newRequest->setLaravelSession($request->session());
            }

            // Substitui a instância no container
            app()->instance('request', $newRequest);

            return $next($newRequest);
        }

        return $next($request);
    }
}
