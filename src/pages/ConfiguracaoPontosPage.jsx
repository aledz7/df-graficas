import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';
import { Star, Save, Settings, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';
import { safeJsonParse, formatCurrency } from '@/lib/utils';
import { configuracaoPontosService } from '@/services/configuracaoPontosService';

const PONTOS_POR_REAIS_PADRAO = 50;
const VALIDADE_PONTOS_MESES_PADRAO = 12;

const ConfiguracaoPontosPage = () => {
  const { toast } = useToast();
  const [config, setConfig] = useState({
    ativo: true,
    pontosPorReais: PONTOS_POR_REAIS_PADRAO,
    validadeMeses: VALIDADE_PONTOS_MESES_PADRAO,
    resgateMinimo: 50,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadConfig = async () => {
      try {
        setLoading(true);
        const configData = await configuracaoPontosService.getConfiguracaoComFallback();
        
        setConfig({
          ativo: configData.ativo !== undefined ? configData.ativo : true,
          pontosPorReais: configData.pontos_por_reais || PONTOS_POR_REAIS_PADRAO,
          validadeMeses: configData.validade_meses || VALIDADE_PONTOS_MESES_PADRAO,
          resgateMinimo: configData.resgate_minimo || 50,
        });
      } catch (error) {
        console.error('Erro ao carregar configuração de pontos:', error);
        toast({
          title: "Erro",
          description: "Erro ao carregar configuração do programa de pontos.",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    loadConfig();
  }, [toast]);

  const handleChange = (field, value) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      const configuracaoParaSalvar = {
        ativo: config.ativo,
        pontos_por_reais: config.pontosPorReais,
        validade_meses: config.validadeMeses,
        resgate_minimo: config.resgateMinimo,
        descricao: 'Programa de fidelidade configurado via interface',
      };
      
      const response = await configuracaoPontosService.salvarConfiguracao(configuracaoParaSalvar);
      
      if (response.success) {
        toast({
          title: "Configuração Salva!",
          description: response.message || "As configurações do programa de pontos foram atualizadas com sucesso."
        });
      } else {
        throw new Error(response.message || 'Erro ao salvar configuração');
      }
    } catch (error) {
      console.error('Erro ao salvar configuração:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao salvar configuração do programa de pontos.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Star className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Carregando configurações...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Star className="h-8 w-8 text-yellow-500" />
        <div>
          <h1 className="text-3xl font-bold">Configuração do Programa de Pontos</h1>
          <p className="text-muted-foreground">
            Configure as regras e parâmetros do programa de fidelidade
          </p>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Configurações Gerais
            </CardTitle>
            <CardDescription>
              Ative ou desative o programa de pontos e configure as regras básicas
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Status do Programa */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base font-medium">Programa de Pontos</Label>
                <p className="text-sm text-muted-foreground">
                  {config.ativo ? 'Ativo' : 'Inativo'} - {config.ativo ? 'Os clientes podem acumular e resgatar pontos' : 'O programa está temporariamente desabilitado'}
                </p>
              </div>
              <Switch
                checked={config.ativo}
                onCheckedChange={(checked) => handleChange('ativo', checked)}
              />
            </div>

            {/* Pontos por Reais */}
            <div className="space-y-2">
              <Label htmlFor="pontosPorReais">Valor em Reais para 1 Ponto</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="pontosPorReais"
                  type="number"
                  min="1"
                  value={config.pontosPorReais}
                  onChange={(e) => handleChange('pontosPorReais', parseFloat(e.target.value) || PONTOS_POR_REAIS_PADRAO)}
                  className="w-32"
                />
                <span className="text-sm text-muted-foreground">
                  = 1 ponto
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                Exemplo: R$ {formatCurrency(config.pontosPorReais)} em compras = 1 ponto
              </p>
            </div>

            {/* Validade dos Pontos */}
            <div className="space-y-2">
              <Label htmlFor="validadeMeses">Validade dos Pontos (meses)</Label>
              <Input
                id="validadeMeses"
                type="number"
                min="1"
                max="60"
                value={config.validadeMeses}
                onChange={(e) => handleChange('validadeMeses', parseInt(e.target.value) || VALIDADE_PONTOS_MESES_PADRAO)}
                className="w-32"
              />
              <p className="text-sm text-muted-foreground">
                Os pontos expiram após {config.validadeMeses} meses da data de ganho
              </p>
            </div>

            {/* Resgate Mínimo */}
            <div className="space-y-2">
              <Label htmlFor="resgateMinimo">Pontos Mínimos para Resgate</Label>
              <Input
                id="resgateMinimo"
                type="number"
                min="1"
                value={config.resgateMinimo}
                onChange={(e) => handleChange('resgateMinimo', parseInt(e.target.value) || 50)}
                className="w-32"
              />
              <p className="text-sm text-muted-foreground">
                Clientes precisam ter pelo menos {config.resgateMinimo} pontos para fazer resgates
              </p>
            </div>
          </CardContent>
          <CardFooter className="flex gap-2">
            <Button 
              onClick={handleSave} 
              disabled={saving}
              className="flex-1 sm:flex-none"
            >
              {saving ? (
                <>
                  <Star className="h-4 w-4 animate-spin mr-2" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Salvar Configurações
                </>
              )}
            </Button>
            <Button 
              variant="outline"
              onClick={async () => {
                try {
                  setSaving(true);
                  const response = await configuracaoPontosService.resetarConfiguracao();
                  if (response.success) {
                    toast({
                      title: "Configuração Resetada!",
                      description: response.message || "Configuração resetada para valores padrão."
                    });
                    // Recarregar configuração
                    const configData = await configuracaoPontosService.getConfiguracaoComFallback();
                    setConfig({
                      ativo: configData.ativo !== undefined ? configData.ativo : true,
                      pontosPorReais: configData.pontos_por_reais || PONTOS_POR_REAIS_PADRAO,
                      validadeMeses: configData.validade_meses || VALIDADE_PONTOS_MESES_PADRAO,
                      resgateMinimo: configData.resgate_minimo || 50,
                    });
                  }
                } catch (error) {
                  toast({
                    title: "Erro",
                    description: "Erro ao resetar configuração.",
                    variant: "destructive"
                  });
                } finally {
                  setSaving(false);
                }
              }}
              disabled={saving}
            >
              Resetar
            </Button>
          </CardFooter>
        </Card>
      </motion.div>

      {/* Card de Informações */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <Card className="bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700">
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div className="space-y-2">
                <h3 className="font-semibold text-blue-900 dark:text-blue-100">
                  Como Funciona o Programa de Pontos
                </h3>
                <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                  <li>• Clientes ganham pontos automaticamente em compras confirmadas</li>
                  <li>• A cada R$ {formatCurrency(config.pontosPorReais)} gastos = 1 ponto ganho</li>
                  <li>• Pontos expiram em {config.validadeMeses} meses</li>
                  <li>• Resgate mínimo de {config.resgateMinimo} pontos</li>
                  <li>• Pontos podem ser resgatados por descontos em compras futuras</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default ConfiguracaoPontosPage; 