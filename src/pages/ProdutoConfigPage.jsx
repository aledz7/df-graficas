import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/components/ui/use-toast';
import { Package, Save, Settings, AlertTriangle, Palette, Tag, Ruler } from 'lucide-react';
import { motion } from 'framer-motion';
import { safeJsonParse } from '@/lib/utils';
import { apiDataManager } from '@/lib/apiDataManager';
import { useNavigate } from 'react-router-dom';


const unidadeMedidaOptions = [
  { value: 'unidade', label: 'Unidade (UN)' },
  { value: 'metro', label: 'Metro (m)' },
  { value: 'm2', label: 'Metro Quadrado (m²)' },
  { value: 'litro', label: 'Litro (L)' },
  { value: 'kg', label: 'Quilograma (kg)' },
  { value: 'caixa', label: 'Caixa (CX)' },
  { value: 'peca', label: 'Peça (PÇ)' },
];

const ProdutoConfigPage = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [config, setConfig] = useState({
    unidadeMedidaPadrao: 'unidade',
    geracaoCodigoAutomatica: true,
    prefixoCodigo: 'PROD-',
    notificarEstoqueBaixoPercentual: '20', // Notificar quando atingir 20% do estoque mínimo
    permitirEstoqueNegativo: false,
  });

  useEffect(() => {
        const loadData = async () => {
    const loadedConfig = safeJsonParse(await apiDataManager.getItem('produtoConfigGlobal'), {});
    if (Object.keys(loadedConfig).length > 0) {
      setConfig(prev => ({ ...prev, ...loadedConfig }));
    }
  
        };
        
        loadData();
    }, []);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setConfig(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSelectChange = (name, value) => {
    setConfig(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveConfig = async () => {
    await apiDataManager.setItem('produtoConfigGlobal', config);
    toast({
      title: 'Configurações Salvas!',
      description: 'As configurações de produtos e estoque foram atualizadas.',
      className: 'bg-green-500 text-white',
    });
  };



  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="p-4 md:p-8"
    >
      <Card className="shadow-xl">
        <CardHeader className="border-b">
          <div className="flex items-center space-x-4">
            <Package className="h-10 w-10 text-primary" />
            <div>
              <CardTitle className="text-3xl font-bold">Configurações de Produtos e Estoque</CardTitle>
              <CardDescription>
                Defina padrões e regras para o cadastro e gerenciamento de seus produtos.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6 space-y-8">
          
          <section className="space-y-4 p-6 border rounded-lg shadow-sm bg-card">
            <h3 className="text-xl font-semibold flex items-center"><Settings className="mr-2 h-6 w-6 text-primary/80" />Padrões de Cadastro</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="unidadeMedidaPadrao">Unidade de Medida Padrão</Label>
                <Select name="unidadeMedidaPadrao" value={config.unidadeMedidaPadrao} onValueChange={(value) => handleSelectChange('unidadeMedidaPadrao', value)}>
                  <SelectTrigger id="unidadeMedidaPadrao"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {unidadeMedidaOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">Será pré-selecionada ao cadastrar um novo produto.</p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox id="geracaoCodigoAutomatica" name="geracaoCodigoAutomatica" checked={config.geracaoCodigoAutomatica} onCheckedChange={(checked) => handleInputChange({ target: { name: 'geracaoCodigoAutomatica', checked, type: 'checkbox' }})}/>
                  <Label htmlFor="geracaoCodigoAutomatica">Gerar Código de Produto Automaticamente</Label>
                </div>
                {config.geracaoCodigoAutomatica && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <Label htmlFor="prefixoCodigo">Prefixo para Código Automático</Label>
                    <Input id="prefixoCodigo" name="prefixoCodigo" value={config.prefixoCodigo} onChange={handleInputChange} placeholder="Ex: SKU-"/>
                  </motion.div>
                )}
              </div>
            </div>
          </section>

          <section className="space-y-4 p-6 border rounded-lg shadow-sm bg-card">
            <h3 className="text-xl font-semibold flex items-center"><AlertTriangle className="mr-2 h-6 w-6 text-orange-500" />Alertas e Controle de Estoque</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="notificarEstoqueBaixoPercentual">Notificar Estoque Baixo (em % do Estoque Mínimo)</Label>
                <Input id="notificarEstoqueBaixoPercentual" name="notificarEstoqueBaixoPercentual" type="number" min="0" max="100" value={config.notificarEstoqueBaixoPercentual} onChange={handleInputChange} placeholder="Ex: 20"/>
                <p className="text-xs text-muted-foreground mt-1">Alerta quando o estoque atual atingir esta porcentagem do estoque mínimo definido no produto.</p>
              </div>
              <div className="flex items-center space-x-2 pt-6">
                  <Checkbox id="permitirEstoqueNegativo" name="permitirEstoqueNegativo" checked={config.permitirEstoqueNegativo} onCheckedChange={(checked) => handleInputChange({ target: { name: 'permitirEstoqueNegativo', checked, type: 'checkbox' }})}/>
                  <Label htmlFor="permitirEstoqueNegativo">Permitir Venda com Estoque Negativo?</Label>
              </div>
            </div>

          </section>
          
          <section className="space-y-4 p-6 border rounded-lg shadow-sm bg-card">
            <h3 className="text-xl font-semibold flex items-center"><Palette className="mr-2 h-6 w-6 text-purple-500" />Gerenciamento de Atributos</h3>
            <p className="text-sm text-muted-foreground">Acesse as áreas de cadastro para gerenciar categorias, cores e tamanhos que serão usados nas variações dos produtos.</p>
            <div className="flex flex-wrap gap-3">
                <Button variant="outline" onClick={() => navigate('/cadastros/categorias')}><Tag className="mr-2 h-4 w-4"/>Gerenciar Categorias</Button>
                <Button variant="outline" onClick={() => navigate('/cadastros/categorias')}><Palette className="mr-2 h-4 w-4"/>Gerenciar Cores</Button>
                <Button variant="outline" onClick={() => navigate('/cadastros/categorias')}><Ruler className="mr-2 h-4 w-4"/>Gerenciar Tamanhos</Button>
            </div>
          </section>

        </CardContent>
        <CardFooter className="border-t pt-6 flex justify-end">
          <Button onClick={handleSaveConfig} size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground text-lg">
            <Save size={20} className="mr-2" /> Salvar Configurações de Produtos
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  );
};

export default ProdutoConfigPage;