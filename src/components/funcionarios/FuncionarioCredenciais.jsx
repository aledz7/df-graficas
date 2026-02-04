import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { AlertCircle, Eye, EyeOff, CheckCircle, Info, Shield } from 'lucide-react';
import { funcionarioService } from '@/services/funcionarioService';

const FuncionarioCredenciais = ({ formData, setFormData }) => {
    const [showPassword, setShowPassword] = useState(false);
    const [resetting, setResetting] = useState(false);
    const [novaSenhaGerada, setNovaSenhaGerada] = useState(null);
    const [erroReset, setErroReset] = useState(null);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const hasCredentials = formData.senha || formData.email;

    return (
        <Card>
            <CardHeader>
                <CardTitle>Credenciais de Acesso</CardTitle>
                <CardDescription>
                    Defina o login e a senha para o funcionário acessar o sistema.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-1">
                    <Label htmlFor="email">Email (Login)</Label>
                    <Input 
                        id="email" 
                        name="email" 
                        type="email"
                        value={formData.email || ''} 
                        onChange={handleInputChange}
                        placeholder="ex: joao.silva@empresa.com"
                    />
                    <p className="text-xs text-muted-foreground">
                        O email será usado como login no sistema. Se não informado, será gerado automaticamente.
                    </p>
                </div>
                <div className="space-y-1">
                    <Label htmlFor="senha">Senha</Label>
                    <div className="relative">
                        <Input 
                            id="senha" 
                            name="senha" 
                            type={showPassword ? 'text' : 'password'}
                            value={formData.senha || ''} 
                            onChange={handleInputChange}
                            placeholder="••••••••"
                        />
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute inset-y-0 right-0 h-full px-3"
                            onClick={() => setShowPassword(!showPassword)}
                        >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Por segurança, a senha atual não é exibida pelo sistema. Para alterá-la, digite uma nova senha e salve.
                    </p>
                    {formData?.id && (
                        <div className="flex items-center gap-2 mt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={async () => {
                                    setErroReset(null);
                                    setNovaSenhaGerada(null);
                                    try {
                                        setResetting(true);
                                        const resp = await funcionarioService.resetPassword(formData.id);
                                        const nova = resp?.new_password || resp?.data?.new_password;
                                        setNovaSenhaGerada(nova || '');
                                    } catch (e) {
                                        setErroReset(e?.response?.data?.message || e.message || 'Erro ao resetar senha');
                                    } finally {
                                        setResetting(false);
                                    }
                                }}
                                disabled={resetting}
                            >
                                {resetting ? 'Gerando nova senha...' : 'Gerar nova senha' }
                            </Button>
                            {novaSenhaGerada !== null && (
                                <span className="text-xs">
                                    Nova senha: <span className="font-mono font-semibold">{novaSenhaGerada || '—'}</span>
                                </span>
                            )}
                            {erroReset && (
                                <span className="text-xs text-red-600">{erroReset}</span>
                            )}
                        </div>
                    )}
                </div>

                <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                        <Switch
                            id="is_admin"
                            checked={formData.is_admin || false}
                            onCheckedChange={(checked) => 
                                setFormData(prev => ({ ...prev, is_admin: checked }))
                            }
                        />
                        <Label htmlFor="is_admin" className="flex items-center gap-2">
                            <Shield className="h-4 w-4" />
                            Admin?
                        </Label>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Marque esta opção se o funcionário deve ter privilégios de administrador no sistema.
                    </p>
                </div>

                {hasCredentials && (
                    <div className="flex items-start text-sm text-green-600 bg-green-50 dark:bg-green-900/30 p-3 rounded-md border border-green-200 dark:border-green-700">
                        <CheckCircle size={20} className="mr-3 mt-0.5 text-green-500" />
                        <div>
                            <h4 className="font-semibold text-green-800 dark:text-green-200">Integração com Sistema de Login</h4>
                            <p className="text-xs text-green-700 dark:text-green-400 mt-1">
                                As credenciais informadas serão automaticamente sincronizadas com a tabela de usuários do sistema, 
                                permitindo que o funcionário faça login usando o email e senha configurados.
                            </p>
                        </div>
                    </div>
                )}

                <div className="flex items-start text-sm text-blue-600 bg-blue-50 dark:bg-blue-900/30 p-3 rounded-md border border-blue-200 dark:border-blue-700">
                    <Info size={20} className="mr-3 mt-0.5 text-blue-500" />
                    <div>
                        <h4 className="font-semibold text-blue-800 dark:text-blue-200">Como Funciona</h4>
                        <ul className="text-xs text-blue-700 dark:text-blue-400 mt-1 space-y-1">
                            <li>• Um registro será criado na tabela <code>users</code> automaticamente</li>
                            <li>• O funcionário poderá fazer login usando o email e senha configurados</li>
                            <li>• As alterações nas credenciais são sincronizadas automaticamente</li>
                            <li>• Se o funcionário for removido, o usuário também será removido</li>
                        </ul>
                    </div>
                </div>

                <div className="flex items-start text-sm text-yellow-600 bg-yellow-50 dark:bg-yellow-900/30 p-3 rounded-md border border-yellow-200 dark:border-yellow-700">
                    <AlertCircle size={20} className="mr-3 mt-0.5 text-yellow-500" />
                    <div>
                        <h4 className="font-semibold text-yellow-800 dark:text-yellow-200">Aviso de Segurança</h4>
                        <p className="text-xs text-yellow-700 dark:text-yellow-400 mt-1">
                           Esta é uma configuração inicial. Para um ambiente seguro, recomenda-se implementar 
                           políticas de senha forte, autenticação de dois fatores e auditoria de acessos em uma próxima etapa.
                        </p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

export default FuncionarioCredenciais;