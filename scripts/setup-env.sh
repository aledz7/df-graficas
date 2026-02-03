#!/bin/bash

# Script para configurar o ambiente de desenvolvimento

# Verifica se o arquivo .env já existe
if [ -f .env ]; then
  echo "O arquivo .env já existe. Deseja sobrescrevê-lo? (s/n)"
  read -r response
  if [[ ! "$response" =~ ^[Ss]$ ]]; then
    echo "Configuração de ambiente cancelada."
    exit 0
  fi
fi

# Verifica se estamos em produção
if [ "$NODE_ENV" = "production" ]; then
  echo "Configurando ambiente de produção..."
  cp .env.production .env
else
  echo "Configurando ambiente de desenvolvimento..."
  cp .env.development .env
fi

echo "Arquivo .env configurado com sucesso!"
