import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Percent } from 'lucide-react';
import { motion } from 'framer-motion';

const ProdutoTabComissao = ({ currentProduto, handleInputChange }) => {
  return (
    <Card>
        <CardHeader>
            <CardTitle className="flex items-center"><Percent className="mr-2 h-5 w-5"/>Comissão</CardTitle>
            <CardDescription>Defina se este produto gera comissão para o vendedor.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
                <Checkbox id="permite_comissao" name="permite_comissao" checked={currentProduto.permite_comissao} onCheckedChange={(checked) => handleInputChange({ target: { name: 'permite_comissao', checked, type: 'checkbox' }})}/>
                <Label htmlFor="permite_comissao">Este produto gera comissão?</Label>
            </div>
             {currentProduto.permite_comissao && (
                 <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <Label htmlFor="percentual_comissao">Percentual da Comissão (%)</Label>
                    <Input id="percentual_comissao" name="percentual_comissao" type="number" step="0.1" value={currentProduto.percentual_comissao} onChange={handleInputChange} placeholder="Ex: 5"/>
                 </motion.div>
            )}
        </CardContent>
    </Card>
  );
};

export default ProdutoTabComissao;