<?php

namespace App\Traits;

use Illuminate\Support\Str;
use Illuminate\Support\Facades\Storage;

trait UploadsFiles
{
    /**
     * Salva uma imagem base64 em uma pasta específica
     *
     * @param string $base64Image
     * @param string $folder
     * @return string|null
     */
    protected function saveBase64Image($base64Image, $folder = 'uploads')
    {
        try {
            // Verifica se é uma string base64 válida
            if (!preg_match('/^data:image\/(\w+);base64,/', $base64Image, $type)) {
                return null;
            }

            // Extrai o tipo da imagem e os dados
            $imageType = strtolower($type[1]); // png, jpg, etc
            $base64Data = substr($base64Image, strpos($base64Image, ',') + 1);
            $decodedImage = base64_decode($base64Data);

            if ($decodedImage === false) {
                return null;
            }

            // Gera um nome único para o arquivo
            $fileName = Str::uuid() . '.' . $imageType;
            $folderPath = $folder . '/' . date('Y/m');

            // Salva o arquivo
            Storage::disk('public')->put($folderPath . '/' . $fileName, $decodedImage);

            return $folderPath . '/' . $fileName;
        } catch (\Exception $e) {
            \Log::error('Erro ao salvar imagem: ' . $e->getMessage());
            return null;
        }
    }

    /**
     * Remove um arquivo do storage
     *
     * @param string|null $path
     * @return bool
     */
    protected function deleteFile($path)
    {
        if (!$path) {
            return false;
        }

        try {
            return Storage::disk('public')->delete($path);
        } catch (\Exception $e) {
            \Log::error('Erro ao deletar arquivo: ' . $e->getMessage());
            return false;
        }
    }
} 