import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { catalogoParteService } from '@/services/api';
import PartesModalForm from './PartesModalForm';
import PartesModalManageView from './PartesModalManageView';
import PartesModalSearchView from './PartesModalSearchView';
import { getImageUrl } from '@/lib/imageUtils';

const initialParteState = { id: null, nome: '', imagem: '', imagem_url_externa: '', altura: '', largura: '' };

const PartesModal = ({ open, onOpenChange, onSelectPecas, allowMultipleSelection = false, initialView = 'search', manageModeOnly = false }) => {
  const { toast } = useToast();
  const [view, setView] = useState(manageModeOnly ? 'manage' : initialView);
  const [partes, setPartes] = useState([]);
  const [currentParte, setCurrentParte] = useState(initialParteState);
  const [searchTermPartes, setSearchTermPartes] = useState('');
  const [imagemPreview, setImagemPreview] = useState(null);
  const [selectedPecasMap, setSelectedPecasMap] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      loadPartes();
    }
  }, [open]);

  useEffect(() => {
    if (open) { 
      setView(manageModeOnly ? 'manage' : initialView);
      setSelectedPecasMap({}); 
      setCurrentParte(initialParteState);
      setImagemPreview(null);
      setSearchTermPartes('');
    }
  }, [manageModeOnly, initialView, open]);

  const loadPartes = async () => {
    setLoading(true);
    try {
      const response = await catalogoParteService.getAll();
      // Garante que partes seja sempre um array
      setPartes(Array.isArray(response.data) ? response.data : response.data.data || []);
    } catch (error) {
      console.error('Erro ao carregar partes:', error);
      toast({ 
        title: 'Erro ao carregar partes', 
        description: 'Não foi possível carregar as partes do catálogo.', 
        variant: 'destructive' 
      });
      // Em caso de erro, garante que partes seja um array vazio
      setPartes([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveParte = async () => {
    if (!currentParte.nome) {
      toast({ title: "Erro", description: "Nome é obrigatório.", variant: "destructive" });
      return;
    }

    const altura = parseFloat(currentParte.altura);
    const largura = parseFloat(currentParte.largura);

    if ((currentParte.altura && isNaN(altura)) || (altura && altura <= 0) || 
        (currentParte.largura && isNaN(largura)) || (largura && largura <= 0)) {
      toast({ title: "Erro", description: "Altura e Largura devem ser números positivos.", variant: "destructive" });
      return;
    }
    
    let parteToSave = { 
      ...currentParte,
      altura: altura ? altura.toFixed(2) : null,
      largura: largura ? largura.toFixed(2) : null,
    };

    // Ajusta os campos de imagem
    if (!parteToSave.imagem && parteToSave.imagem_url_externa) {
      delete parteToSave.imagem;
    } else if (parteToSave.imagem) {
      delete parteToSave.imagem_url_externa;
    }

    try {
      setLoading(true);
      if (parteToSave.id) {
        await catalogoParteService.update(parteToSave.id, parteToSave);
        toast({ title: "Sucesso", description: "Parte atualizada!" });
      } else {
        await catalogoParteService.create(parteToSave);
        toast({ title: "Sucesso", description: "Nova parte cadastrada!" });
      }
      await loadPartes();
      setCurrentParte(initialParteState);
      setImagemPreview(null);
      setView(manageModeOnly ? 'manage' : 'search');
    } catch (error) {
      console.error('Erro ao salvar parte:', error);
      toast({ 
        title: 'Erro ao salvar parte', 
        description: 'Não foi possível salvar a parte no catálogo.', 
        variant: 'destructive' 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditParte = (parte) => {
    setCurrentParte({
      ...parte,
      imagem_url_externa: parte.imagem_url_externa || ''
    });
    setImagemPreview(parte.imagem || parte.imagem_url_externa || null); 
    setView('form');
  };

  const handleDeleteParte = async (id) => {
    try {
      setLoading(true);
      await catalogoParteService.delete(id);
      toast({ title: "Sucesso", description: "Parte excluída!" });
      await loadPartes();
    } catch (error) {
      console.error('Erro ao excluir parte:', error);
      toast({ 
        title: 'Erro ao excluir parte', 
        description: 'Não foi possível excluir a parte do catálogo.', 
        variant: 'destructive' 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Criar preview local para melhor UX
      const localPreview = URL.createObjectURL(file);
      setImagemPreview(localPreview);

      // Criar FormData para envio do arquivo
      const formData = new FormData();
      formData.append('imagem', file);

      // Fazer upload da imagem para o servidor
      catalogoParteService.uploadImagem(formData)
        .then(response => {
          if (response.data && response.data.success) {
            setCurrentParte(prev => ({ 
              ...prev, 
              imagem: response.data.path,
              imagem_url_externa: '' 
            }));
            toast({ 
              title: "Upload concluído",
              description: "Imagem enviada com sucesso",
              variant: "default"
            });
          }
        })
        .catch(error => {
          console.error('Erro ao fazer upload da imagem:', error);
          toast({
            title: "Erro no upload",
            description: "Não foi possível enviar a imagem. Tente novamente.",
            variant: "destructive"
          });
          setImagemPreview(null);
        });
    }
  };

  const handleUrlExternaChange = (event) => {
    const url = event.target.value;
    setCurrentParte(prev => ({ ...prev, imagem_url_externa: url, imagem: '' }));
    setImagemPreview(url || null);
  };

  const getDisplayImage = (parte) => {
    if (parte.imagem) return getImageUrl(parte.imagem);
    if (parte.imagem_url_externa) return parte.imagem_url_externa;
    return null;
  };

  const filteredPartes = partes.filter(parte => 
    parte.nome.toLowerCase().includes(searchTermPartes.toLowerCase())
  );

  const toggleParteSelection = (parte) => {
    if (allowMultipleSelection) {
      setSelectedPecasMap(prev => ({
        ...prev,
        [parte.id]: !prev[parte.id]
      }));
    } else {
      onSelectPecas([parte]);
      onOpenChange(false);
    }
  };

  const handleConfirmSelection = () => {
    const selectedPecas = partes.filter(parte => selectedPecasMap[parte.id]);
    onSelectPecas(selectedPecas);
    onOpenChange(false);
  };

  const renderView = () => {
    switch (view) {
      case 'form':
        return (
          <PartesModalForm
            currentParte={currentParte}
            setCurrentParte={setCurrentParte}
            imagemPreview={imagemPreview}
            handleImageUpload={handleImageUpload}
            handleUrlExternaChange={handleUrlExternaChange}
            handleSaveParte={handleSaveParte}
            setView={setView}
            manageModeOnly={manageModeOnly}
            initialParteState={initialParteState}
            setImagemPreview={setImagemPreview}
            loading={loading}
          />
        );
      case 'manage':
        return (
          <PartesModalManageView
            partes={partes}
            handleEditParte={handleEditParte}
            handleDeleteParte={handleDeleteParte}
            setView={setView}
            setCurrentParte={setCurrentParte}
            setImagemPreview={setImagemPreview}
            initialParteState={initialParteState}
            getDisplayImage={getDisplayImage}
            manageModeOnly={manageModeOnly}
            loading={loading}
          />
        );
      default: 
        return (
          <PartesModalSearchView
            filteredPartes={filteredPartes}
            searchTermPartes={searchTermPartes}
            setSearchTermPartes={setSearchTermPartes}
            allowMultipleSelection={allowMultipleSelection}
            selectedPecasMap={selectedPecasMap}
            setSelectedPecasMap={setSelectedPecasMap}
            toggleParteSelection={toggleParteSelection}
            handleConfirmSelection={handleConfirmSelection}
            view={view} 
            setView={setView}
            setCurrentParte={setCurrentParte}
            setImagemPreview={setImagemPreview}
            initialParteState={initialParteState}
            getDisplayImage={getDisplayImage}
            onOpenChange={onOpenChange}
            loading={loading}
          />
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        {renderView()}
      </DialogContent>
    </Dialog>
  );
};

export default PartesModal;