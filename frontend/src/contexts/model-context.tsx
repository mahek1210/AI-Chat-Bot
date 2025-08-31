import { createContext, useContext, useEffect, useState } from "react";

interface ModelContextType {
  selectedModel: string;
  setSelectedModel: (model: string) => void;
}

const ModelContext = createContext<ModelContextType | undefined>(undefined);

const STORAGE_KEY = "selected-model";

export const ModelProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedModel, setSelectedModelState] = useState<string>("gpt-4o");

  useEffect(() => {
    // Load selected model from localStorage on mount
    const savedModel = localStorage.getItem(STORAGE_KEY);
    if (savedModel) {
      setSelectedModelState(savedModel);
    }
  }, []);

  const setSelectedModel = (model: string) => {
    setSelectedModelState(model);
    localStorage.setItem(STORAGE_KEY, model);
  };

  return (
    <ModelContext.Provider value={{ selectedModel, setSelectedModel }}>
      {children}
    </ModelContext.Provider>
  );
};

export const useModel = () => {
  const context = useContext(ModelContext);
  if (context === undefined) {
    throw new Error("useModel must be used within a ModelProvider");
  }
  return context;
};
