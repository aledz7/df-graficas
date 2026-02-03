import React from 'react';
import ProductionFeed from '@/components/dashboard/ProductionFeed';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Activity } from 'lucide-react';

const FeedPage = () => {
    return (
        <div className="p-4 md:p-6 h-full">
            <Card className="h-full flex flex-col">
                <CardHeader>
                    <div className="flex items-center space-x-3">
                        <Activity size={28} className="text-primary"/>
                        <div>
                            <CardTitle className="text-2xl">Feed de Atividades</CardTitle>
                            <CardDescription>Acompanhe em tempo real todas as vendas, orçamentos e ordens de serviço.</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="flex-1 -mt-4">
                     <ProductionFeed defaultDateToday={false} />
                </CardContent>
            </Card>
        </div>
    );
};

export default FeedPage;