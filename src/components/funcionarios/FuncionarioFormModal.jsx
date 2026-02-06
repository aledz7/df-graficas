import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/components/ui/use-toast";
import {
  Save,
  User,
  Wallet,
  Shield,
  KeyRound,
  Percent,
  Loader2,
  DollarSign,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import FuncionarioDadosPessoais from "./FuncionarioDadosPessoais";
import FuncionarioSalario from "./FuncionarioSalario";
import FuncionarioPermissions from "./FuncionarioPermissions";
import FuncionarioCredenciais from "./FuncionarioCredenciais";
import FuncionarioComissoes from "./FuncionarioComissoes";
import { funcionarioService } from "@/services/funcionarioService";
import { useValidationError } from "@/hooks/useValidationError";

const getNextFuncionarioId = async () => {
  try {
    const response = await funcionarioService.getAll();
    const funcionarios = response.data || [];

    if (funcionarios.length === 0) return 1;

    const idsNumericos = funcionarios
      .map((f) => parseInt(f.id, 10))
      .filter((id) => !isNaN(id));

    if (idsNumericos.length === 0) return 1;
    const maxId = Math.max(...idsNumericos);
    return maxId + 1;
  } catch (error) {
    console.error("Erro ao buscar próximo ID:", error);
    return 1;
  }
};

const initialFuncionarioState = () => ({
  id: null,
  name: "",
  data_nascimento: "",
  cpf: "",
  rg: "",
  emissor_rg: "",
  cep: "",
  endereco: "",
  numero: "",
  complemento: "",
  bairro: "",
  cidade: "",
  uf: "",
  cargo: "",
  telefone: "",
  whatsapp: "",
  celular: "",
  email: "",
  comissao_dropshipping: "0",
  comissao_servicos: "0",
  permite_receber_comissao: false,
  foto: null,
  foto_url: null,
  status: true,
  salario_base: "",
  vales: [],
  faltas: [],
  permissions: {},
  senha: "",
});

const FuncionarioFormModal = ({ isOpen, onClose, funcionario }) => {
  const { toast } = useToast();
  const { showError } = useValidationError();
  const [formData, setFormData] = useState(initialFuncionarioState());
  const [activeTab, setActiveTab] = useState("dadosPessoais");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [markSalarioAsSaved, setMarkSalarioAsSaved] = useState(null);

  useEffect(() => {
    if (isOpen) {
      if (funcionario?.id) {
        // Editando funcionário existente
        const loadData = async () => {
          try {
            setIsLoading(true);
            const response = await funcionarioService.getById(funcionario.id);
            const funcionarioData = response.data;

            if (funcionarioData) {
              // Mapear os dados para o formato esperado pelo formulário
              const mappedData = {
                ...initialFuncionarioState(),
                ...funcionarioData,
                data_nascimento: funcionarioData.data_nascimento
                  ? (String(funcionarioData.data_nascimento).includes("T")
                      ? String(funcionarioData.data_nascimento).slice(0, 10)
                      : funcionarioData.data_nascimento)
                  : "",
                emissor_rg: funcionarioData.emissor_rg || "",
                comissao_dropshipping:
                  funcionarioData.comissao_dropshipping?.toString() || "0",
                comissao_servicos:
                  funcionarioData.comissao_servicos?.toString() || "0",
                salario_base:
                  funcionarioData.salario_base &&
                  funcionarioData.salario_base > 0
                    ? funcionarioData.salario_base.toString()
                    : funcionarioData.salarioBase &&
                      funcionarioData.salarioBase > 0
                    ? funcionarioData.salarioBase.toString()
                    : "",
                permite_receber_comissao: Boolean(
                  funcionarioData.permite_receber_comissao
                ),
                vales: Array.isArray(funcionarioData.vales)
                  ? funcionarioData.vales
                  : [],
                faltas: Array.isArray(funcionarioData.faltas)
                  ? funcionarioData.faltas
                  : [],
                permissions:
                  typeof funcionarioData.permissions === "object" &&
                  funcionarioData.permissions !== null
                    ? funcionarioData.permissions
                    : {},
                foto_url: funcionarioData.foto_url || null,
              };

              setFormData(mappedData);
            } else {
              toast({
                title: "Erro",
                description: "Funcionário não encontrado.",
                variant: "destructive",
              });
            }
          } catch (error) {
            console.error("Erro ao carregar funcionário:", error);
            toast({
              title: "Erro",
              description: "Erro ao carregar dados do funcionário.",
              variant: "destructive",
            });
          } finally {
            setIsLoading(false);
          }
        };

        loadData();
      } else {
        // Novo funcionário - limpar formulário
        setFormData(initialFuncionarioState());
      }
    }
  }, [isOpen, funcionario?.id]);

  const handleSave = async () => {
    try {
      setIsSaving(true);

      // Preparar os dados para salvar
      const dataToSave = {
        ...formData,
        // Campos específicos que precisam de tratamento especial
        data_nascimento: formData.data_nascimento || null,
        emissor_rg: formData.emissor_rg || null,
        comissao_dropshipping: parseFloat(formData.comissao_dropshipping) || 0,
        comissao_servicos: parseFloat(formData.comissao_servicos) || 0,
        salario_base:
          formData.salario_base && formData.salario_base !== ""
            ? parseFloat(formData.salario_base)
            : 0,
        permite_receber_comissao: Boolean(formData.permite_receber_comissao),
        status: Boolean(formData.status),
        // Funcionários nunca podem ser admin - is_admin é sempre false
        // A administração de tenants é feita por um sistema separado
        is_admin: false,
        // Garantir que arrays e objetos estejam no formato correto
        vales: Array.isArray(formData.vales) ? formData.vales : [],
        faltas: Array.isArray(formData.faltas) ? formData.faltas : [],
        permissions:
          typeof formData.permissions === "object" &&
          formData.permissions !== null
            ? formData.permissions
            : {},
        // Mapear senha para password (campo esperado pelo backend)
        password: formData.senha || null,
        // Garantir que foto_url seja incluído explicitamente
        foto_url: formData.foto_url || null,
        // Garantir tema padrão 'light' na criação
        theme: formData.theme || "light",
      };

      // Não enviar campo "senha" em texto puro para o backend
      delete dataToSave.senha;

      if (formData.id) {
        // Atualizar funcionário existente
        await funcionarioService.update(formData.id, dataToSave);
        toast({
          title: "Sucesso!",
          description: "Funcionário atualizado com sucesso.",
        });
      } else {
        // Criar novo funcionário
        await funcionarioService.create(dataToSave);
        toast({
          title: "Sucesso!",
          description: "Funcionário cadastrado com sucesso.",
        });
      }

      // Marcar o salário como salvo se a função estiver disponível
      if (markSalarioAsSaved && typeof markSalarioAsSaved === "function") {
        markSalarioAsSaved();
      }

      onClose(true); // Passa true para indicar que a lista deve ser atualizada
    } catch (error) {
      showError(error, "Ocorreu um erro ao salvar o funcionário.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading && funcionario?.id) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0">
          <DialogTitle className="sr-only">
            Carregando dados do funcionário
          </DialogTitle>
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2">Carregando dados do funcionário...</span>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0">
        <DialogTitle className="sr-only">
          {formData.id
            ? `Editar Funcionário: ${formData.name || "Sem Nome"}`
            : "Novo Funcionário"}
        </DialogTitle>
        <div className="p-6 border-b">
          <h2 className="text-2xl font-bold">
            {formData.id
              ? `Editar Funcionário: ${formData.name || "Sem Nome"}`
              : "Novo Funcionário"}
          </h2>
          {formData.id && (
            <p className="text-sm text-muted-foreground">Cód: {formData.id}</p>
          )}
        </div>
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex-grow flex flex-col overflow-hidden"
        >
          <div className="px-6 mt-4">
            <TabsList className="grid w-full grid-cols-5 h-auto p-1">
              <TabsTrigger value="dadosPessoais" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-2 px-1 text-xs sm:text-sm">
                <User className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Dados Pessoais</span>
                <span className="sm:hidden">Dados</span>
              </TabsTrigger>
              <TabsTrigger value="salario" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-2 px-1 text-xs sm:text-sm">
                <Wallet className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Salário</span>
                <span className="sm:hidden">Salário</span>
              </TabsTrigger>
              <TabsTrigger value="comissoes" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-2 px-1 text-xs sm:text-sm">
                <DollarSign className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Comissões</span>
                <span className="sm:hidden">Comissões</span>
              </TabsTrigger>
              <TabsTrigger value="credenciais" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-2 px-1 text-xs sm:text-sm">
                <KeyRound className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Credenciais</span>
                <span className="sm:hidden">Login</span>
              </TabsTrigger>
              <TabsTrigger value="permissoes" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-2 px-1 text-xs sm:text-sm">
                <Shield className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Permissões</span>
                <span className="sm:hidden">Permissões</span>
              </TabsTrigger>
            </TabsList>
          </div>
          <ScrollArea className="flex-grow overflow-y-auto">
            <div className="p-6">
              <TabsContent value="dadosPessoais">
                <FuncionarioDadosPessoais
                  formData={formData}
                  setFormData={setFormData}
                />
              </TabsContent>
              <TabsContent value="salario">
                <FuncionarioSalario
                  formData={formData}
                  setFormData={setFormData}
                  onSalarioSaved={setMarkSalarioAsSaved}
                />
                <Card className="mt-6">
                  <CardHeader>
                    <CardTitle>Configurações de Comissão</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="permite-comissao"
                        checked={formData.permite_receber_comissao || false}
                        onCheckedChange={(checked) =>
                          setFormData((prev) => ({
                            ...prev,
                            permite_receber_comissao: checked,
                          }))
                        }
                      />
                      <Label htmlFor="permite-comissao">
                        Permitir que este funcionário receba comissões de vendas
                      </Label>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="comissoes">
                <FuncionarioComissoes
                  formData={formData}
                  setFormData={setFormData}
                />
              </TabsContent>
              <TabsContent value="credenciais">
                <FuncionarioCredenciais
                  formData={formData}
                  setFormData={setFormData}
                />
              </TabsContent>
              <TabsContent value="permissoes">
                <FuncionarioPermissions
                  formData={formData}
                  setFormData={setFormData}
                />
              </TabsContent>
            </div>
          </ScrollArea>
        </Tabs>
        <div className="p-6 border-t flex justify-end space-x-2 bg-slate-50 dark:bg-slate-800">
          <Button
            variant="outline"
            onClick={() => onClose()}
            disabled={isSaving || isLoading}
          >
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isSaving || isLoading}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {formData.id ? "Atualizando..." : "Salvando..."}
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                {formData.id ? "Atualizar" : "Salvar"}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FuncionarioFormModal;
