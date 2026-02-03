import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Camera } from 'lucide-react';
import { uploadService } from '@/services/api';
import { useToast } from '@/components/ui/use-toast';

const FuncionarioDadosPessoais = ({ formData, setFormData }) => {
    const { toast } = useToast();
    
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handlePhotoUpload = async (event) => {
        const file = event.target.files[0];
        if (file) {
            try {
                // Mostrar preview local para melhor UX
                const localPreview = URL.createObjectURL(file);
                setFormData(prev => ({ ...prev, foto: localPreview }));
                
                // Fazer upload da imagem para o servidor
                const response = await uploadService.uploadFotoFuncionario(file);
                if (response.data && response.data.success) {
                    // Armazenar o caminho da imagem no banco de dados (não a URL completa)
                    setFormData(prev => ({ ...prev, foto_url: response.data.path }));
                    
                    toast({
                        title: "Upload concluído",
                        description: "Foto enviada com sucesso",
                        variant: "default"
                    });
                }
            } catch (error) {
                console.error('Erro ao fazer upload da foto:', error);
                toast({
                    title: "Erro no upload",
                    description: "Não foi possível enviar a foto. Tente novamente.",
                    variant: "destructive"
                });
            }
        }
    };

    // Função para obter a URL da imagem para exibição
    const getImageUrl = () => {
        if (formData.foto && formData.foto.startsWith('blob:')) {
            // Se é um preview local (blob URL)
            return formData.foto;
        } else if (formData.foto_url) {
            // Se é um caminho salvo no banco, construir a URL completa
            const apiBaseUrl = import.meta.env.VITE_API_URL || '';
            return `${apiBaseUrl}/storage/${formData.foto_url}`;
        }
        return null;
    };

    return (
        <div className="space-y-6">
            <div className="flex items-start space-x-6">
                <div className="flex flex-col items-center space-y-2">
                    <Avatar className="h-32 w-32">
                        <AvatarImage src={getImageUrl()} alt={formData.name} />
                        <AvatarFallback className="text-4xl">{formData.name ? formData.name.charAt(0) : 'F'}</AvatarFallback>
                    </Avatar>
                    <Button asChild variant="outline" size="sm">
                        <label htmlFor="photo-upload" className="cursor-pointer">
                            <Camera className="mr-2 h-4 w-4" /> Selecionar Foto
                            <input id="photo-upload" type="file" className="sr-only" accept="image/*" onChange={handlePhotoUpload} />
                        </label>
                    </Button>
                </div>
                <div className="flex-grow grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <Label htmlFor="name">Nome Completo</Label>
                        <Input id="name" name="name" value={formData.name} onChange={handleInputChange} />
                    </div>
                    <div>
                        <Label htmlFor="data_nascimento">Data de Nascimento</Label>
                        <Input id="data_nascimento" name="data_nascimento" type="date" value={formData.data_nascimento} onChange={handleInputChange} />
                    </div>
                     <div>
                        <Label htmlFor="cpf">CPF</Label>
                        <Input id="cpf" name="cpf" value={formData.cpf} onChange={handleInputChange} />
                    </div>
                    <div>
                        <Label htmlFor="rg">RG</Label>
                        <Input id="rg" name="rg" value={formData.rg} onChange={handleInputChange} />
                    </div>
                     <div>
                        <Label htmlFor="emissor_rg">Órgão Emissor</Label>
                        <Input id="emissor_rg" name="emissor_rg" value={formData.emissor_rg} onChange={handleInputChange} />
                    </div>
                     <div>
                        <Label htmlFor="cargo">Cargo</Label>
                        <Input id="cargo" name="cargo" value={formData.cargo} onChange={handleInputChange} />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                 <div>
                    <Label htmlFor="cep">CEP</Label>
                    <Input id="cep" name="cep" value={formData.cep} onChange={handleInputChange} />
                </div>
                <div className="md:col-span-2">
                    <Label htmlFor="endereco">Endereço</Label>
                    <Input id="endereco" name="endereco" value={formData.endereco} onChange={handleInputChange} />
                </div>
                 <div>
                    <Label htmlFor="numero">Número</Label>
                    <Input id="numero" name="numero" value={formData.numero} onChange={handleInputChange} />
                </div>
                <div>
                    <Label htmlFor="complemento">Complemento</Label>
                    <Input id="complemento" name="complemento" value={formData.complemento} onChange={handleInputChange} />
                </div>
                <div>
                    <Label htmlFor="bairro">Bairro</Label>
                    <Input id="bairro" name="bairro" value={formData.bairro} onChange={handleInputChange} />
                </div>
                 <div>
                    <Label htmlFor="cidade">Cidade</Label>
                    <Input id="cidade" name="cidade" value={formData.cidade} onChange={handleInputChange} />
                </div>
                 <div>
                    <Label htmlFor="uf">UF</Label>
                    <Input id="uf" name="uf" value={formData.uf} onChange={handleInputChange} />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                    <Label htmlFor="telefone">Telefone Fixo</Label>
                    <Input id="telefone" name="telefone" value={formData.telefone} onChange={handleInputChange} />
                </div>
                <div>
                    <Label htmlFor="whatsapp">WhatsApp</Label>
                    <Input id="whatsapp" name="whatsapp" value={formData.whatsapp} onChange={handleInputChange} />
                </div>
                <div>
                    <Label htmlFor="celular">Celular</Label>
                    <Input id="celular" name="celular" value={formData.celular} onChange={handleInputChange} />
                </div>
                <div className="md:col-span-3">
                    <Label htmlFor="email">E-mail</Label>
                    <Input id="email" name="email" type="email" value={formData.email} onChange={handleInputChange} />
                </div>
            </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* <div>
                    <Label htmlFor="comissao_dropshipping">Comissão Dropshipping (%)</Label>
                    <Input id="comissao_dropshipping" name="comissao_dropshipping" type="number" value={formData.comissao_dropshipping} onChange={handleInputChange} />
                </div> */}
                <div>
                    <Label htmlFor="comissao_servicos">Comissão em Serviços (%)</Label>
                    <Input id="comissao_servicos" name="comissao_servicos" type="number" value={formData.comissao_servicos} onChange={handleInputChange} />
                </div>
            </div>
        </div>
    );
};

export default FuncionarioDadosPessoais;