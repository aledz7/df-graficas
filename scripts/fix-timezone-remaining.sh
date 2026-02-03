#!/bin/bash

# Script para listar e corrigir arquivos restantes com problema de timezone
# Uso: ./fix-timezone-remaining.sh [listar|corrigir]

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Diretório base
BASE_DIR="src"

# Função para listar arquivos com problema
listar_arquivos() {
    echo -e "${YELLOW}📋 Listando arquivos que ainda usam new Date().toISOString():${NC}\n"
    
    grep -rn "new Date()\.toISOString()" $BASE_DIR --include="*.js" --include="*.jsx" | while IFS=: read -r file line content; do
        echo -e "${RED}❌${NC} $file:$line"
        echo "   ${YELLOW}→${NC} $content"
        echo ""
    done
    
    TOTAL=$(grep -r "new Date()\.toISOString()" $BASE_DIR --include="*.js" --include="*.jsx" -l | wc -l)
    echo -e "${YELLOW}Total de arquivos: $TOTAL${NC}"
}

# Função para verificar se arquivo já tem import
tem_import() {
    local arquivo=$1
    grep -q "import.*formatDateForBackend.*from.*dateUtils" "$arquivo"
}

# Função para adicionar import se não existir
adicionar_import() {
    local arquivo=$1
    
    if ! tem_import "$arquivo"; then
        echo -e "${GREEN}✓${NC} Adicionando import em: $arquivo"
        
        # Encontrar a última linha de import
        local ultima_linha_import=$(grep -n "^import" "$arquivo" | tail -1 | cut -d: -f1)
        
        if [ -n "$ultima_linha_import" ]; then
            # Adicionar após a última linha de import
            sed -i "${ultima_linha_import}a import { formatDateForBackend } from '@/utils/dateUtils';" "$arquivo"
        else
            # Se não tem imports, adicionar no início
            sed -i "1i import { formatDateForBackend } from '@/utils/dateUtils';" "$arquivo"
        fi
    fi
}

# Função para corrigir arquivo
corrigir_arquivo() {
    local arquivo=$1
    
    echo -e "${YELLOW}🔧${NC} Corrigindo: $arquivo"
    
    # Adicionar import se necessário
    adicionar_import "$arquivo"
    
    # Substituir new Date().toISOString() por formatDateForBackend()
    sed -i 's/new Date()\.toISOString()/formatDateForBackend()/g' "$arquivo"
    
    echo -e "${GREEN}✓${NC} Arquivo corrigido!"
    echo ""
}

# Função principal
main() {
    local comando=${1:-listar}
    
    case $comando in
        listar)
            listar_arquivos
            ;;
        corrigir)
            echo -e "${YELLOW}⚠️  ATENÇÃO: Este script fará alterações nos arquivos!${NC}"
            echo -e "${YELLOW}Certifique-se de ter backup ou commit antes de continuar.${NC}\n"
            read -p "Deseja continuar? (s/N): " -n 1 -r
            echo ""
            
            if [[ $REPLY =~ ^[Ss]$ ]]; then
                echo -e "\n${GREEN}🚀 Iniciando correção...${NC}\n"
                
                grep -rl "new Date()\.toISOString()" $BASE_DIR --include="*.js" --include="*.jsx" | while read arquivo; do
                    corrigir_arquivo "$arquivo"
                done
                
                echo -e "${GREEN}✅ Correção concluída!${NC}"
                echo -e "${YELLOW}Lembre-se de testar o sistema antes de fazer commit.${NC}"
            else
                echo -e "${RED}❌ Operação cancelada.${NC}"
            fi
            ;;
        *)
            echo "Uso: $0 [listar|corrigir]"
            echo ""
            echo "Comandos:"
            echo "  listar   - Lista todos os arquivos com problema"
            echo "  corrigir - Corrige automaticamente todos os arquivos"
            exit 1
            ;;
    esac
}

# Executar
main "$@"

