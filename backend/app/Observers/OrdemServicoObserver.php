<?php

namespace App\Observers;

use App\Models\OrdemServico;

class OrdemServicoObserver
{
    /**
     * Handle the OrdemServico "created" event.
     */
    public function created(OrdemServico $ordemServico): void
    {
        //
    }

    /**
     * Handle the OrdemServico "updated" event.
     */
    public function updated(OrdemServico $ordemServico): void
    {
        //
    }

    /**
     * Handle the OrdemServico "deleted" event.
     */
    public function deleted(OrdemServico $ordemServico): void
    {
        //
    }

    /**
     * Handle the OrdemServico "restored" event.
     */
    public function restored(OrdemServico $ordemServico): void
    {
        //
    }

    /**
     * Handle the OrdemServico "force deleted" event.
     */
    public function forceDeleted(OrdemServico $ordemServico): void
    {
        //
    }
}
