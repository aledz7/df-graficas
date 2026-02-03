import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Save, Eye, CheckSquare } from 'lucide-react';

const EnvelopamentoActions = ({
  orcamentoTotal,
  onGeneratePdf,
  onSaveProgress,
  onFinalizeOrcamento,
  salvandoRascunho = false,
}) => {
  return (
    <motion.div
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      transition={{ type: "spring", stiffness: 100 }}
      className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg flex flex-col sm:flex-row justify-between items-center space-y-3 sm:space-y-0 sm:space-x-3"
    >
      <Card className="w-full sm:w-auto bg-gray-800 dark:bg-black text-white shadow-md flex-grow sm:flex-grow-0">
        <CardContent className="p-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <span className="text-base font-semibold mb-1 sm:mb-0 sm:mr-4">TOTAL ORÇAMENTO:</span>
            <span className="text-3xl font-bold">R$ {orcamentoTotal.toFixed(2)}</span>
          </div>
        </CardContent>
      </Card>
      <div className="flex w-full sm:w-auto space-x-3">
        <Button variant="outline" onClick={onGeneratePdf} className="flex-1 sm:flex-initial text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700">
          <Eye size={18} className="mr-2" /> Visualizar PDF
        </Button>
        <Button 
          variant="secondary" 
          onClick={onSaveProgress} 
          disabled={salvandoRascunho}
          className="flex-1 sm:flex-initial"
        >
          <Save size={18} className="mr-2" /> 
          {salvandoRascunho ? 'Salvando...' : 'Salvar Rascunho'}
        </Button>
        <Button onClick={onFinalizeOrcamento} className="flex-1 sm:flex-initial bg-orange-500 hover:bg-orange-600 text-white">
          <CheckSquare size={18} className="mr-2" /> Finalizar
        </Button>
      </div>
    </motion.div>
  );
};

export default EnvelopamentoActions;