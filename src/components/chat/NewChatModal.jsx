import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, Users, UserPlus, Loader2 } from 'lucide-react';
import { userService } from '@/services/userService';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export default function NewChatModal({ open, onClose, onSelectUser, onCreateGroup }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [activeTab, setActiveTab] = useState('direct');
  const { toast } = useToast();
  const { user: currentUser } = useAuth();

  useEffect(() => {
    if (open) {
      loadUsers();
    } else {
      // Resetar ao fechar
      setSearchQuery('');
      setSelectedUsers([]);
      setGroupName('');
      setGroupDescription('');
      setActiveTab('direct');
    }
  }, [open]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const result = await userService.getAll({ ativo: true });
      // Filtrar o usuário atual
      const filteredUsers = result.data.filter(u => u.id !== currentUser?.id);
      setUsers(filteredUsers);
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os usuários',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(user =>
    user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleUserSelect = (user) => {
    if (activeTab === 'direct') {
      onSelectUser(user);
      onClose();
    } else {
      // Toggle seleção para grupo
      if (selectedUsers.find(u => u.id === user.id)) {
        setSelectedUsers(selectedUsers.filter(u => u.id !== user.id));
      } else {
        setSelectedUsers([...selectedUsers, user]);
      }
    }
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      toast({
        title: 'Erro',
        description: 'O nome do grupo é obrigatório',
        variant: 'destructive',
      });
      return;
    }

    if (selectedUsers.length === 0) {
      toast({
        title: 'Erro',
        description: 'Selecione pelo menos um membro',
        variant: 'destructive',
      });
      return;
    }

    try {
      await onCreateGroup({
        nome: groupName,
        descricao: groupDescription,
        member_ids: selectedUsers.map(u => u.id),
      });
      onClose();
    } catch (error) {
      // Erro já tratado no componente pai
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Nova Conversa</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="direct">
              <UserPlus className="h-4 w-4 mr-2" />
              Conversa Direta
            </TabsTrigger>
            <TabsTrigger value="group">
              <Users className="h-4 w-4 mr-2" />
              Criar Grupo
            </TabsTrigger>
          </TabsList>

          <TabsContent value="direct" className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar usuário..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <div className="max-h-96 overflow-y-auto space-y-2">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Nenhum usuário encontrado
                </div>
              ) : (
                filteredUsers.map((user) => (
                  <div
                    key={user.id}
                    onClick={() => handleUserSelect(user)}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={user.foto_url} />
                      <AvatarFallback>
                        {user.name?.charAt(0).toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-medium">{user.name || 'Usuário'}</p>
                      <p className="text-sm text-gray-500">{user.email}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="group" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="group-name">Nome do Grupo *</Label>
              <Input
                id="group-name"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="Ex: Equipe de Produção"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="group-description">Descrição (opcional)</Label>
              <Input
                id="group-description"
                value={groupDescription}
                onChange={(e) => setGroupDescription(e.target.value)}
                placeholder="Descrição do grupo"
              />
            </div>

            <div className="space-y-2">
              <Label>Selecionar Membros ({selectedUsers.length} selecionados)</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar usuários..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              <div className="max-h-64 overflow-y-auto space-y-2 mt-2">
                {loading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <div className="text-center py-4 text-gray-500 text-sm">
                    Nenhum usuário encontrado
                  </div>
                ) : (
                  filteredUsers.map((user) => {
                    const isSelected = selectedUsers.find(u => u.id === user.id);
                    return (
                      <div
                        key={user.id}
                        onClick={() => handleUserSelect(user)}
                        className={`
                          flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors
                          ${isSelected ? 'bg-blue-50 border-2 border-blue-500' : 'hover:bg-gray-50'}
                        `}
                      >
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={user.foto_url} />
                          <AvatarFallback>
                            {user.name?.charAt(0).toUpperCase() || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="font-medium">{user.name || 'Usuário'}</p>
                          <p className="text-sm text-gray-500">{user.email}</p>
                        </div>
                        {isSelected && (
                          <div className="h-5 w-5 rounded-full bg-blue-500 flex items-center justify-center">
                            <span className="text-white text-xs">✓</span>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          {activeTab === 'group' && (
            <Button onClick={handleCreateGroup} disabled={!groupName.trim() || selectedUsers.length === 0}>
              Criar Grupo
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
