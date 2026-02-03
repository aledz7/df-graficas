#!/bin/bash

# Script para iniciar o ambiente de desenvolvimento
# Este script inicia tanto o backend Laravel quanto o frontend Vite

echo "🚀 Iniciando ambiente de desenvolvimento Sistema Gráficas..."

# Verificar se o arquivo .env existe
if [ ! -f ".env" ]; then
    echo "📋 Criando arquivo .env a partir do .env.development..."
    cp .env.development .env
fi

# Iniciar o backend Laravel
echo "🔧 Iniciando backend Laravel na porta 8000..."
cd backend
php artisan serve --host=localhost --port=8000 &
BACKEND_PID=$!
cd ..

# Aguardar um pouco para o backend inicializar
sleep 3

# Verificar se o backend está rodando
if curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/api/me | grep -q "401\|200"; then
    echo "✅ Backend Laravel iniciado com sucesso!"
else
    echo "❌ Erro ao iniciar o backend Laravel"
    exit 1
fi

# Iniciar o frontend Vite
echo "⚡ Iniciando frontend Vite na porta 5180..."
npm run dev &
FRONTEND_PID=$!

# Aguardar um pouco para o frontend inicializar
sleep 5

# Verificar se o frontend está rodando
if curl -s -o /dev/null -w "%{http_code}" http://localhost:5180 | grep -q "200"; then
    echo "✅ Frontend Vite iniciado com sucesso!"
else
    echo "❌ Erro ao iniciar o frontend Vite"
    kill $BACKEND_PID 2>/dev/null
    exit 1
fi

echo ""
echo "🎉 Ambiente de desenvolvimento iniciado com sucesso!"
echo "📱 Frontend: http://localhost:5180"
echo "🔧 Backend: http://localhost:8000"
echo "📚 API Docs: http://localhost:8000/api/documentation (se disponível)"
echo ""
echo "Para parar os servidores, use Ctrl+C ou execute:"
echo "pkill -f 'php artisan serve'"
echo "pkill -f 'npm run dev'"
echo ""

# Manter o script rodando
wait

