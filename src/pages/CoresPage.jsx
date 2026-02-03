import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from "@/components/ui/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { PlusCircle, Edit, Trash2, Palette, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { corService } from '@/services/api';

const CoresPage = () => {
  const { toast } = useToast();
  const [cores, setCores] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentCor, setCurrentCor] = useState({ id: null, nome: '' });
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadCores();
  }, []);

  const loadCores = async () => {
    setLoading(true);
    try {
      const response = await corService.getAll();
      // O backend retorna dados paginados: { success: true, message: "...", data: { data: [...], current_page: 1, ... } }
      // Os dados reais estão em response.data.data.data
      const coresData = response.data?.data?.data || response.data?.data || response.data || [];
      setCores(Array.isArray(coresData) ? coresData : []);
    } catch (error) {
      console.error('Erro ao carregar cores:', error);
      toast({ 
        title: 'Erro ao carregar cores', 
        description: 'Não foi possível carregar os dados do servidor.', 
        variant: 'destructive' 
      });
      setCores([]);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (cor = null) => {
    if (cor) {
      setIsEditing(true);
      setCurrentCor(cor);
    } else {
      setIsEditing(false);
      setCurrentCor({ id: null, nome: '' });
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!currentCor.nome.trim()) {
      toast({ 
        title: 'Nome inválido', 
        description: 'O nome da cor não pode ser vazio.', 
        variant: 'destructive' 
      });
      return;
    }

    setLoading(true);
    try {
      if (isEditing) {
        await corService.update(currentCor.id, { nome: currentCor.nome });
        toast({ title: 'Sucesso', description: 'Cor atualizada com sucesso.' });
      } else {
        await corService.create({ nome: currentCor.nome });
        toast({ title: 'Sucesso', description: 'Nova cor adicionada com sucesso.' });
      }
      await loadCores();
      setIsModalOpen(false);
    } catch (error) {
      console.error('Erro ao salvar cor:', error);
      toast({ 
        title: 'Erro ao salvar cor', 
        description: 'Não foi possível salvar os dados no servidor.', 
        variant: 'destructive' 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Tem certeza que deseja excluir esta cor?')) {
      return;
    }

    setLoading(true);
    try {
      await corService.delete(id);
      toast({ title: 'Sucesso', description: 'Cor removida com sucesso.' });
      await loadCores();
    } catch (error) {
      console.error('Erro ao excluir cor:', error);
      toast({ 
        title: 'Erro ao excluir cor', 
        description: 'Não foi possível excluir a cor do servidor.', 
        variant: 'destructive' 
      });
    } finally {
      setLoading(false);
    }
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
            <Palette className="h-10 w-10 text-purple-500" />
            <div>
              <CardTitle className="text-3xl font-bold">Gerenciamento de Cores</CardTitle>
              <CardDescription>
                Cadastre e gerencie as cores disponíveis para os produtos.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <Button onClick={() => handleOpenModal()} className="mb-4" disabled={loading}>
            <PlusCircle size={18} className="mr-2" /> Nova Cor
          </Button>
          
          <ScrollArea className="h-[calc(100vh-22rem)]">
            {loading ? (
              <div className="flex justify-center items-center h-40">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2">Carregando cores...</span>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome da Cor</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!Array.isArray(cores) || cores.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={2} className="text-center py-4">
                        Nenhuma cor encontrada
                      </TableCell>
                    </TableRow>
                  ) : (
                    cores.map(cor => (
                      <TableRow key={cor.id}>
                        <TableCell className="font-medium">{cor.nome}</TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleOpenModal(cor)} 
                            disabled={loading}
                          >
                            <Edit size={16} />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleDelete(cor.id)} 
                            className="text-red-500" 
                            disabled={loading}
                          >
                            <Trash2 size={16} />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </ScrollArea>

          <Dialog open={isModalOpen} onOpenChange={(open) => !loading && setIsModalOpen(open)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {isEditing ? 'Editar Cor' : 'Nova Cor'}
                </DialogTitle>
                <DialogDescription>
                  {isEditing ? 'Edite as informações da cor.' : 'Adicione uma nova cor ao sistema.'}
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <Label htmlFor="cor-nome">Nome da Cor</Label>
                <Input 
                  id="cor-nome" 
                  value={currentCor.nome} 
                  onChange={(e) => setCurrentCor({ ...currentCor, nome: e.target.value })} 
                  placeholder="Ex: Vermelho, Azul, Verde..."
                  disabled={loading}
                />
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline" disabled={loading}>
                    Cancelar
                  </Button>
                </DialogClose>
                <Button onClick={handleSave} disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    'Salvar'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default CoresPage; 