import { createContext, useContext, useState, useEffect } from 'react';

// Cria o contexto vazio
const DeviceContext = createContext();

export function DeviceProvider({ children }) {
  // Define o estado inicial com base no tamanho da tela na hora que o app abre
  const [device, setDevice] = useState({
    isMobile: window.innerWidth <= 768,
    isTablet: window.innerWidth <= 1024 && window.innerWidth > 768,
    isDesktop: window.innerWidth > 1024,
    largura: window.innerWidth
  });

  useEffect(() => {
    // Função que recalcula os booleanos quando a tela muda
    const handleResize = () => {
      setDevice({
        isMobile: window.innerWidth <= 768,
        isTablet: window.innerWidth <= 1024 && window.innerWidth > 768,
        isDesktop: window.innerWidth > 1024,
        largura: window.innerWidth
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <DeviceContext.Provider value={device}>
      {children}
    </DeviceContext.Provider>
  );
}

// Hook customizado para facilitar a importação nas telas
export const useDevice = () => useContext(DeviceContext);