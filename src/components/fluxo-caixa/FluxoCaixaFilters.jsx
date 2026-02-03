import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon, Filter } from 'lucide-react';
import { format } from 'date-fns';

const FluxoCaixaFilters = ({
  dataSelecionada,
  setDataSelecionada,
  filtroTipo,
  setFiltroTipo,
  filtroDescricao,
  setFiltroDescricao
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center"><Filter className="mr-2 h-5 w-5 text-primary"/>Filtros e Período</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="space-y-1">
          <Label>Selecionar Data</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant={"outline"} className="w-full justify-start text-left font-normal">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dataSelecionada ? format(dataSelecionada, "dd/MM/yyyy") : <span>Escolha uma data</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={dataSelecionada} onSelect={setDataSelecionada} initialFocus /></PopoverContent>
          </Popover>
        </div>
        <div className="space-y-1">
          <Label>Tipo de Lançamento</Label>
          <Select value={filtroTipo} onValueChange={setFiltroTipo}>
            <SelectTrigger><SelectValue placeholder="Selecione o tipo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="entrada">Entrada</SelectItem>
              <SelectItem value="saida">Saída</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Buscar por Descrição</Label>
          <Input placeholder="Filtrar descrição..." value={filtroDescricao} onChange={(e) => setFiltroDescricao(e.target.value)} />
        </div>
      </CardContent>
    </Card>
  );
};

export default FluxoCaixaFilters;