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
  // Return default values when used outside provider (e.g., on Dashboard)
  // This allows components to work in both Admin (with toggle) and Dashboard (live data only)
  if (context === undefined) {
    return {
      useMockData: false,
      setUseMockData: () => {},
      mockUserCount: 0,
      setMockUserCount: () => {},
    };
  }
  return context;
};
