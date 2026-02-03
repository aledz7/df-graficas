import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { motion } from 'framer-motion';

const ProdutoTabPromocao = ({ currentProduto, handleInputChange, handleDateChange }) => {
  return (
    <Card>
        <CardHeader>
            <CardTitle>Configurar Promoção</CardTitle>
            <CardDescription>Ative promoções com preços especiais e períodos definidos.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
                <Checkbox id="promocao_ativa" name="promocao_ativa" checked={currentProduto.promocao_ativa} onCheckedChange={(checked) => handleInputChange({ target: { name: 'promocao_ativa', checked, type: 'checkbox' }})}/>
                <Label htmlFor="promocao_ativa">Ativar Promoção para este Produto?</Label>
            </div>
            {currentProduto.promocao_ativa && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 pt-4 border-t">
                    <div>
                        <Label htmlFor="preco_promocional">Preço Promocional (R$)</Label>
                        <Input id="preco_promocional" name="preco_promocional" type="number" step="0.01" value={currentProduto.preco_promocional} onChange={handleInputChange} placeholder="0.00"/>
                        <p className="text-xs text-muted-foreground mt-1">Este preço será usado no PDV enquanto a promoção estiver ativa.</p>
                    </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="promo_data_inicio">Data de Início da Promoção</Label>
                            <Input id="promo_data_inicio" name="promo_data_inicio" type="date" value={currentProduto.promo_data_inicio || ''} onChange={handleInputChange}/>
                        </div>
                        <div>
                            <Label htmlFor="promo_data_fim">Data de Fim da Promoção</Label>
                            <Input id="promo_data_fim" name="promo_data_fim" type="date" value={currentProduto.promo_data_fim || ''} onChange={handleInputChange}/>
                        </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Deixe as datas em branco para uma promoção sem prazo definido.</p>
                </motion.div>
            )}
        </CardContent>
    </Card>
  );
};

export default ProdutoTabPromocao;