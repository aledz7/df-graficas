import React from 'react';
import ApiDebug from '@/components/debug/ApiDebug';

const ApiDebugPage = () => {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Debug da API</h1>
      <ApiDebug />
    </div>
  );
};

export default ApiDebugPage; 