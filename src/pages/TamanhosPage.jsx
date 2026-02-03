import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from "@/components/ui/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { PlusCircle, Edit, Trash2, Ruler, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { tamanhoService } from '@/services/api';

const TamanhosPage = () => {
  const { toast } = useToast();
  const [tamanhos, setTamanhos] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentTamanho, setCurrentTamanho] = useState({ id: null, nome: '' });
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadTamanhos();
  }, []);

  const loadTamanhos = async () => {
    setLoading(true);
    try {
      const response = await tamanhoService.getAll();
      const tamanhosData = response.data?.data?.data || response.data?.data || response.data || [];
      setTamanhos(Array.isArray(tamanhosData) ? tamanhosData : []);
    } catch (error) {
      console.error('Erro ao carregar tamanhos:', error);
      toast({ 
        title: 'Erro ao carregar tamanhos', 
        description: 'Não foi possível carregar os dados do servidor.', 
        variant: 'destructive' 
      });
      setTamanhos([]);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (tamanho = null) => {
    if (tamanho) {
      setIsEditing(true);
      setCurrentTamanho(tamanho);
    } else {
      setIsEditing(false);
      setCurrentTamanho({ id: null, nome: '' });
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!currentTamanho.nome.trim()) {
      toast({ 
        title: 'Nome inválido', 
        description: 'O nome do tamanho não pode ser vazio.', 
        variant: 'destructive' 
      });
      return;
    }

    setLoading(true);
    try {
      if (isEditing) {
        await tamanhoService.update(currentTamanho.id, { nome: currentTamanho.nome });
        toast({ title: 'Sucesso', description: 'Tamanho atualizado com sucesso.' });
      } else {
        await tamanhoService.create({ nome: currentTamanho.nome });
        toast({ title: 'Sucesso', description: 'Novo tamanho adicionado com sucesso.' });
      }
      await loadTamanhos();
      setIsModalOpen(false);
    } catch (error) {
      console.error('Erro ao salvar tamanho:', error);
      toast({ 
        title: 'Erro ao salvar tamanho', 
        description: 'Não foi possível salvar os dados no servidor.', 
        variant: 'destructive' 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Tem certeza que deseja excluir este tamanho?')) {
      return;
    }

    setLoading(true);
    try {
      await tamanhoService.delete(id);
      toast({ title: 'Sucesso', description: 'Tamanho removido com sucesso.' });
      await loadTamanhos();
    } catch (error) {
      console.error('Erro ao excluir tamanho:', error);
      toast({ 
        title: 'Erro ao excluir tamanho', 
        description: 'Não foi possível excluir o tamanho do servidor.', 
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
            <Ruler className="h-10 w-10 text-blue-500" />
            <div>
              <CardTitle className="text-3xl font-bold">Gerenciamento de Tamanhos</CardTitle>
              <CardDescription>
                Cadastre e gerencie os tamanhos disponíveis para os produtos.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <Button onClick={() => handleOpenModal()} className="mb-4" disabled={loading}>
            <PlusCircle size={18} className="mr-2" /> Novo Tamanho
          </Button>
          
          <ScrollArea className="h-[calc(100vh-22rem)]">
            {loading ? (
              <div className="flex justify-center items-center h-40">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2">Carregando tamanhos...</span>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome do Tamanho</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tamanhos.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={2} className="text-center py-4">
                        Nenhum tamanho encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    tamanhos.map(tamanho => (
                      <TableRow key={tamanho.id}>
                        <TableCell className="font-medium">{tamanho.nome}</TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleOpenModal(tamanho)} 
                            disabled={loading}
                          >
                            <Edit size={16} />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleDelete(tamanho.id)} 
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
                  {isEditing ? 'Editar Tamanho' : 'Novo Tamanho'}
                </DialogTitle>
                <DialogDescription>
                  {isEditing ? 'Edite as informações do tamanho.' : 'Adicione um novo tamanho ao sistema.'}
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <Label htmlFor="tamanho-nome">Nome do Tamanho</Label>
                <Input 
                  id="tamanho-nome" 
                  value={currentTamanho.nome} 
                  onChange={(e) => setCurrentTamanho({ ...currentTamanho, nome: e.target.value })} 
                  placeholder="Ex: P, M, G, GG, 38, 40, 42..."
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

export default TamanhosPage; 