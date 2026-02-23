import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { configuracaoService } from '@/services/api';
import { Loader2, Save, SlidersHorizontal } from 'lucide-react';

const CHAVE_INCLUIR_INATIVOS_PADRAO = 'selecao_cliente_incluir_inativos_padrao';

const PersonalizacoesSettingsPage = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [valores, setValores] = useState({
    [CHAVE_INCLUIR_INATIVOS_PADRAO]: false,
  });

  const personalizacoesCatalogo = useMemo(() => ([
    {
      chave: CHAVE_INCLUIR_INATIVOS_PADRAO,
      nome: 'Pré-selecionar "Incluir clientes inativos"',
      descricao: 'Quando ativo, o seletor de clientes dentro da O.S abre com o filtro de inativos ligado por padrão.',
      tipo: 'boolean',
      grupo: 'Seleção de Cliente',
      ordem: 10,
    },
  ]), []);

  useEffect(() => {
    const carregar = async () => {
      setIsLoading(true);
      try {
        const response = await configuracaoService.getGrupo('personalizacoes');
        const data = response?.data?.data || response?.data || {};

        setValores((prev) => ({
          ...prev,
          [CHAVE_INCLUIR_INATIVOS_PADRAO]: Boolean(data?.[CHAVE_INCLUIR_INATIVOS_PADRAO]),
        }));
      } catch (error) {
        // Grupo ainda não criado: mantemos padrão local e permitimos salvar via upsert.
        if (error?.response?.status !== 404) {
          console.error('Erro ao carregar personalizações:', error);
          toast({
            title: 'Erro ao carregar personalizações',
            description: 'Não foi possível buscar as personalizações no servidor.',
            variant: 'destructive',
          });
        }
      } finally {
        setIsLoading(false);
      }
    };

    carregar();
  }, [toast]);

  const salvar = async () => {
    setIsSaving(true);
    try {
      const payload = personalizacoesCatalogo.map((item) => ({
        chave: item.chave,
        valor: Boolean(valores[item.chave]),
        tipo: item.tipo,
        nome: item.nome,
        descricao: item.descricao,
        ordem: item.ordem,
        visivel: true,
        editavel: true,
        obrigatorio: false,
      }));

      await configuracaoService.upsertGrupo('personalizacoes', payload);

      toast({
        title: 'Personalizações salvas',
        description: 'As preferências de sistema foram atualizadas com sucesso.',
      });
    } catch (error) {
      console.error('Erro ao salvar personalizações:', error);
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar as personalizações.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const secoes = useMemo(() => {
    return [
      {
        titulo: 'Seleção de Cliente',
        descricao: 'Comportamentos padrão relacionados ao modal de busca de cliente.',
        itens: personalizacoesCatalogo.filter((item) => item.grupo === 'Seleção de Cliente'),
      },
    ];
  }, [personalizacoesCatalogo]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="p-4 md:p-6 space-y-6"
    >
      <header className="space-y-2">
        <div className="flex items-center gap-3">
          <SlidersHorizontal className="h-7 w-7 text-primary" />
          <h1 className="text-3xl font-bold">Personalizações</h1>
        </div>
        <p className="text-muted-foreground">
          Configure padrões do sistema em um layout preparado para receber novas personalizações.
        </p>
      </header>

      {isLoading ? (
        <Card>
          <CardContent className="py-10 flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            Carregando personalizações...
          </CardContent>
        </Card>
      ) : (
        secoes.map((secao) => (
          <Card key={secao.titulo}>
            <CardHeader>
              <CardTitle>{secao.titulo}</CardTitle>
              <CardDescription>{secao.descricao}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {secao.itens.map((item) => (
                <div key={item.chave} className="flex items-center justify-between gap-4 rounded-lg border p-3">
                  <div className="space-y-1">
                    <Label htmlFor={item.chave} className="text-sm font-medium cursor-pointer">
                      {item.nome}
                    </Label>
                    <p className="text-xs text-muted-foreground">{item.descricao}</p>
                  </div>
                  <Switch
                    id={item.chave}
                    checked={Boolean(valores[item.chave])}
                    onCheckedChange={(checked) =>
                      setValores((prev) => ({ ...prev, [item.chave]: Boolean(checked) }))
                    }
                  />
                </div>
              ))}
            </CardContent>
            <CardFooter>
              <Button onClick={salvar} disabled={isSaving}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Salvar Personalizações
              </Button>
            </CardFooter>
          </Card>
        ))
      )}
    </motion.div>
  );
};

export default PersonalizacoesSettingsPage;
