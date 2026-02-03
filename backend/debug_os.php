<?php

use App\Models\OrdemServico;
use Illuminate\Support\Facades\DB;

require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$id_os = 'OS-1758660912856';

echo "Checking for id_os: $id_os\n";

// Check with DB::table (includes soft deletes, ignores scopes)
$existsGlobal = DB::table('ordens_servico')->where('id_os', $id_os)->first();

if ($existsGlobal) {
    echo "Found in DB (Global):\n";
    print_r($existsGlobal);
} else {
    echo "Not found in DB (Global).\n";
}

// Check with Model (active only)
$existsModel = OrdemServico::where('id_os', $id_os)->first();
if ($existsModel) {
    echo "Found in Model (Active):\n";
} else {
    echo "Not found in Model (Active).\n";
}

// Check with Model (withTrashed)
$existsTrashed = OrdemServico::withTrashed()->where('id_os', $id_os)->first();
if ($existsTrashed) {
    echo "Found in Model (WithTrashed):\n";
} else {
    echo "Not found in Model (WithTrashed).\n";
}
