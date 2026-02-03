import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ProdutoTabDadosGerais from './tabs/ProdutoTabDadosGerais';
import ProdutoTabPrecoEstoque from './tabs/ProdutoTabPrecoEstoque';
import ProdutoTabPromocao from './tabs/ProdutoTabPromocao';
import ProdutoTabComissao from './tabs/ProdutoTabComissao';
import ProdutoTabVariacoes from './tabs/ProdutoTabVariacoes';
import ProdutoTabComposicao from './tabs/ProdutoTabComposicao';
import ProdutoTabImagens from './tabs/ProdutoTabImagens';
import ProdutoTabOrganizacao from './tabs/ProdutoTabOrganizacao';
import ProdutoTabDescricao from './tabs/ProdutoTabDescricao';

const ProdutoFormTabs = ({
  currentProduto,
  handleInputChange,
  handleSelectChange,
  handleDateChange,
  imagemPreview,
  handleImageUpload,
  galeriaPreviews,
  handleGaleriaImageUpload,
  removeGaleriaImage,
  categories,
  subcategories,
  productColors,
  productSizes,
  addVariacao,
  updateVariacao,
  removeVariacao,
  handleVariacaoImageUpload,
  handleVariacoesBulkUpload,
  activeTab,
  setActiveTab,
  allProducts,
  addComponente,
  removeComponente,
  updateComponenteQuantidade,
}) => {
  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <div className="mb-4">
        {/* Mobile: 3 rows of tabs */}
        <div className="block sm:hidden">
          <TabsList className="grid w-full grid-cols-4 h-auto p-1 mb-2">
            <TabsTrigger value="dadosGerais" className="flex items-center justify-center gap-1 py-3 px-2 text-sm font-medium">
              Gerais
            </TabsTrigger>
            <TabsTrigger value="descricao" className="flex items-center justify-center gap-1 py-3 px-2 text-sm font-medium">
              Descrição
            </TabsTrigger>
            <TabsTrigger value="precoEstoque" className="flex items-center justify-center gap-1 py-3 px-2 text-sm font-medium">
              Preço
            </TabsTrigger>
            <TabsTrigger value="promocao" className="flex items-center justify-center gap-1 py-3 px-2 text-sm font-medium">
              Promoção
            </TabsTrigger>
          </TabsList>
          <TabsList className="grid w-full grid-cols-4 h-auto p-1 mb-2">
            <TabsTrigger value="comissao" className="flex items-center justify-center gap-1 py-3 px-2 text-sm font-medium">
              Comissão
            </TabsTrigger>
            <TabsTrigger value="variacoes" className="flex items-center justify-center gap-1 py-3 px-2 text-sm font-medium">
              Variações
            </TabsTrigger>
            <TabsTrigger value="composicao" className="flex items-center justify-center gap-1 py-3 px-2 text-sm font-medium">
              Composição
            </TabsTrigger>
            <TabsTrigger value="imagens" className="flex items-center justify-center gap-1 py-3 px-2 text-sm font-medium">
              Imagens
            </TabsTrigger>
          </TabsList>
          <TabsList className="grid w-full grid-cols-2 h-auto p-1">
            <TabsTrigger value="organizacao" className="flex items-center justify-center gap-1 py-3 px-2 text-sm font-medium">
              Organização
            </TabsTrigger>
            <TabsTrigger value="dadosGerais" className="flex items-center justify-center gap-1 py-3 px-2 text-sm font-medium opacity-0 pointer-events-none">
              {/* Espaçador invisível */}
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Desktop: Single row */}
        <div className="hidden sm:block">
          <TabsList className="grid w-full grid-cols-9 h-auto p-1">
            <TabsTrigger value="dadosGerais" className="flex items-center justify-center gap-2 py-3 px-3 text-sm font-medium">
              Gerais
            </TabsTrigger>
            <TabsTrigger value="descricao" className="flex items-center justify-center gap-2 py-3 px-3 text-sm font-medium">
              Descrição
            </TabsTrigger>
            <TabsTrigger value="precoEstoque" className="flex items-center justify-center gap-2 py-3 px-3 text-sm font-medium">
              Preço
            </TabsTrigger>
            <TabsTrigger value="promocao" className="flex items-center justify-center gap-2 py-3 px-3 text-sm font-medium">
              Promoção
            </TabsTrigger>
            <TabsTrigger value="comissao" className="flex items-center justify-center gap-2 py-3 px-3 text-sm font-medium">
              Comissão
            </TabsTrigger>
            <TabsTrigger value="variacoes" className="flex items-center justify-center gap-2 py-3 px-3 text-sm font-medium">
              Variações
            </TabsTrigger>
            <TabsTrigger value="composicao" className="flex items-center justify-center gap-2 py-3 px-3 text-sm font-medium">
              Composição
            </TabsTrigger>
            <TabsTrigger value="imagens" className="flex items-center justify-center gap-2 py-3 px-3 text-sm font-medium">
              Imagens
            </TabsTrigger>
            <TabsTrigger value="organizacao" className="flex items-center justify-center gap-2 py-3 px-3 text-sm font-medium">
              Organização
            </TabsTrigger>
          </TabsList>
        </div>
      </div>

      <TabsContent value="dadosGerais">
        <ProdutoTabDadosGerais
          currentProduto={currentProduto}
          handleInputChange={handleInputChange}
        />
      </TabsContent>

      <TabsContent value="descricao">
        <ProdutoTabDescricao
          currentProduto={currentProduto}
          handleInputChange={handleInputChange}
        />
      </TabsContent>

      <TabsContent value="precoEstoque">
        <ProdutoTabPrecoEstoque
          currentProduto={currentProduto}
          handleInputChange={handleInputChange}
        />
      </TabsContent>

      <TabsContent value="promocao">
        <ProdutoTabPromocao
          currentProduto={currentProduto}
          handleInputChange={handleInputChange}
          handleDateChange={handleDateChange}
        />
      </TabsContent>
      
      <TabsContent value="comissao">
        <ProdutoTabComissao
          currentProduto={currentProduto}
          handleInputChange={handleInputChange}
        />
      </TabsContent>

      <TabsContent value="variacoes">
        <ProdutoTabVariacoes
          currentProduto={currentProduto}
          handleInputChange={handleInputChange}
          productColors={productColors}
          productSizes={productSizes}
          addVariacao={addVariacao}
          updateVariacao={updateVariacao}
          removeVariacao={removeVariacao}
          handleVariacaoImageUpload={handleVariacaoImageUpload}
          handleVariacoesBulkUpload={handleVariacoesBulkUpload}
        />
      </TabsContent>
      
      <TabsContent value="composicao">
        <ProdutoTabComposicao
          currentProduto={currentProduto}
          handleInputChange={handleInputChange}
          allProducts={allProducts}
          addComponente={addComponente}
          removeComponente={removeComponente}
          updateComponenteQuantidade={updateComponenteQuantidade}
        />
      </TabsContent>

      <TabsContent value="imagens">
        <ProdutoTabImagens
          currentProduto={currentProduto}
          imagemPreview={imagemPreview}
          handleImageUpload={handleImageUpload}
          galeriaPreviews={galeriaPreviews}
          handleGaleriaImageUpload={handleGaleriaImageUpload}
          removeGaleriaImage={removeGaleriaImage}
        />
      </TabsContent>

      <TabsContent value="organizacao">
        <ProdutoTabOrganizacao
          currentProduto={currentProduto}
          handleInputChange={handleInputChange}
          handleSelectChange={handleSelectChange}
          categories={categories}
          subcategories={subcategories}
        />
      </TabsContent>
    </Tabs>
  );
};

export default ProdutoFormTabs;