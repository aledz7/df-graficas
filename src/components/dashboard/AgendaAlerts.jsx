import React, { useState, useEffect } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Bell, Cake, X } from 'lucide-react';
import { format, parseISO, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const AgendaAlerts = ({ clientes }) => {
    const [aniversariantes, setAniversariantes] = useState([]);

    useEffect(() => {
        if (!clientes || !Array.isArray(clientes) || clientes.length === 0) return;

        const hoje = new Date();
        const aniversariantesProximos = clientes.filter(cliente => {
            if (!cliente.data_nascimento_abertura) return false;
            
            try {
                const dataNasc = parseISO(cliente.data_nascimento_abertura);
                const proximoAniversario = new Date(hoje.getFullYear(), dataNasc.getMonth(), dataNasc.getDate());

                if (proximoAniversario < hoje) {
                    proximoAniversario.setFullYear(hoje.getFullYear() + 1);
                }
                
                const diasRestantes = differenceInDays(proximoAniversario, hoje);
                return diasRestantes >= 0 && diasRestantes <= 4;
            } catch (e) {
                return false;
            }
        }).sort((a,b) => {
            const dataNascA = new Date(a.data_nascimento_abertura);
            const proximoAniversarioA = new Date(hoje.getFullYear(), dataNascA.getMonth(), dataNascA.getDate());
            if (proximoAniversarioA < hoje) proximoAniversarioA.setFullYear(hoje.getFullYear() + 1);

            const dataNascB = new Date(b.data_nascimento_abertura);
            const proximoAniversarioB = new Date(hoje.getFullYear(), dataNascB.getMonth(), dataNascB.getDate());
            if (proximoAniversarioB < hoje) proximoAniversarioB.setFullYear(hoje.getFullYear() + 1);

            return proximoAniversarioA - proximoAniversarioB;
        });

        setAniversariantes(aniversariantesProximos);
    }, [clientes]);

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-5 w-5" />
                    {aniversariantes.length > 0 && (
                        <span className="absolute -top-1 -right-1 flex h-4 w-4">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 text-white text-xs justify-center items-center">
                                {aniversariantes.length}
                            </span>
                        </span>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
                <div className="grid gap-4">
                    <div className="space-y-2">
                        <h4 className="font-medium leading-none">Notificações</h4>
                        <p className="text-sm text-muted-foreground">
                            Aniversariantes dos próximos 4 dias.
                        </p>
                    </div>
                    <div className="grid gap-2">
                        {aniversariantes.length > 0 ? (
                            aniversariantes.map(cliente => (
                                <div key={cliente.id} className="grid grid-cols-[25px_1fr] items-start pb-4 last:mb-0 last:pb-0">
                                    <span className="flex h-2 w-2 translate-y-1 rounded-full bg-sky-500" />
                                    <div className="grid gap-1">
                                        <p className="text-sm font-medium leading-none flex items-center">
                                            <Cake className="mr-2 h-4 w-4 text-pink-500"/>
                                            {cliente.nome_completo || cliente.nome}
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                            {format(parseISO(cliente.data_nascimento_abertura), "dd 'de' MMMM", { locale: ptBR })}
                                        </p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-sm text-muted-foreground text-center py-4">Nenhum aniversário próximo.</p>
                        )}
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
};

export default AgendaAlerts;