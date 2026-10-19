import { createContext, useContext, useEffect, useState } from "react";
import { useGetMe, type User } from "@workspace/api-client-react";
import { setAuthTokenGetter } from "@workspace/api-client-react/custom-fetch";

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  token: string | null;
  setToken: (token: string | null) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setTokenState] = useState<string | null>(
    localStorage.getItem("novacrest_token")
  );

  useEffect(() => {
    setAuthTokenGetter(() => localStorage.getItem("novacrest_token"));
  }, []);

  const setToken = (newToken: string | null) => {
    if (newToken) {
      localStorage.setItem("novacrest_token", newToken);
    } else {
      localStorage.removeItem("novacrest_token");
    }
    setTokenState(newToken);
  };

  const { data: user, isLoading, error } = useGetMe({
    query: {
      enabled: !!token,
      retry: false,
    },
  });

  useEffect(() => {
    if (error) {
      setToken(null);
    }
  }, [error]);

  const logout = () => {
    setToken(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading: !!token && isLoading,
        token,
        setToken,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
