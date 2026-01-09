import { createContext, useContext, useState, ReactNode } from "react";

interface MockDataContextType {
  useMockData: boolean;
  setUseMockData: (value: boolean) => void;
  mockUserCount: number;
  setMockUserCount: (count: number) => void;
}

const MockDataContext = createContext<MockDataContextType | undefined>(undefined);

export const MockDataProvider = ({ children }: { children: ReactNode }) => {
  const [useMockData, setUseMockData] = useState(true);
  const [mockUserCount, setMockUserCount] = useState(15); // Default mock user count

  return (
    <MockDataContext.Provider value={{ useMockData, setUseMockData, mockUserCount, setMockUserCount }}>
      {children}
    </MockDataContext.Provider>
  );
};

export const useMockData = () => {
  const context = useContext(MockDataContext);
  if (context === undefined) {
    throw new Error("useMockData must be used within a MockDataProvider");
  }
  return context;
};
