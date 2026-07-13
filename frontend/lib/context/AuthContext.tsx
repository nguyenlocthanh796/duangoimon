import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { logger } from '../logger';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { decodeJwt } from '../auth-helpers';
import { api } from '../api';
import { getToken as getSecureToken, setToken as setSecureToken, getUser as getSecureUser, setUser as setSecureUser, clearToken as clearSecureToken } from '../secure-storage';

interface AuthContextType {
  token: string | null;
  username: string;
  userRole: string;
  branchId: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  isInitialized: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setTokenState] = useState<string | null>(null);
  const [username, setUsername] = useState<string>('');
  const [userRole, setUserRole] = useState<string>('');
  const [branchId, setBranchId] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  const router = useRouter();
  const segments = useSegments();

  // On mount, read token and user from secure storage
  useEffect(() => {
    const initAuth = async () => {
      try {
        const storedToken = await getSecureToken();
        const storedUser = await getSecureUser();
        if (storedToken) {
          const decoded = decodeJwt(storedToken);
          if (decoded && decoded.exp && decoded.exp * 1000 > Date.now()) {
            let user = null;
            let parseSuccess = true;
            if (storedUser) {
              try {
                user = storedUser;
              } catch (parseError) {
                logger.error('auth', 'Failed to parse pos_user:', parseError);
                await clearSecureToken();
                parseSuccess = false;
              }

              if (parseSuccess) {
                setTokenState(storedToken);
                setUsername(user?.username || '');
                setUserRole(decoded.role || user?.role || '');
                setBranchId(decoded.branch_id || user?.branch_id || null);
              } else {
                setTokenState(null);
                setUsername('');
                setUserRole('');
                setBranchId(null);
              }
            } else {
              // Token is expired, clear the token
              await clearSecureToken();
              setTokenState(null);
              setUsername('');
              setUserRole('');
            }
          }
        }
      } catch (e) {
        logger.error('auth', 'Error initializing auth:', e);
      } finally {
        setIsInitialized(true);
      }
    };
    initAuth();
  }, []);

  const login = async (userNm: string, pass: string) => {
    const res = await api.login(userNm, pass);
    if (res && res.access_token) {
      const decoded = decodeJwt(res.access_token);
      const role = decoded?.role || res.user?.role || '';
      const uName = res.user?.username || userNm;
      const bId = decoded?.branch_id || (res.user as any)?.branch_id || null;

      setTokenState(res.access_token);
      setUsername(uName);
      setUserRole(role);
      setBranchId(bId);

      if (res.user) {
        await setSecureUser(res.user);
      }
    }
  };

  const logout = async () => {
    try {
      api.logout();
    } catch (e) {
      logger.error('auth', 'API logout error:', e);
    }
    await clearSecureToken();
    setTokenState(null);
    setUsername('');
    setUserRole('');
    // Redirect to /login
    router.replace('/login');
  };

  // Route guard
  useEffect(() => {
    if (!isInitialized) return;

    const rootSegment = segments[0];
    const VALID_ROLES = ['admin', 'manager', 'cashier', 'accountant', 'kitchen'];

    if (!token) {
      if (rootSegment !== 'login') {
        router.replace('/login');
      }
    } else {
      // 1. Default-deny policy: check for unrecognized roles
      if (!userRole || !VALID_ROLES.includes(userRole)) {
        logger.warn('auth', `Unrecognized or missing role: "${userRole}". Force logging out.`);
        logout();
        return;
      }

      // 2. Redirect on login page or index root
      if (rootSegment === 'login' || !rootSegment) {
        if (userRole === 'admin' || userRole === 'manager') {
          router.replace('/quan-ly');
        } else if (userRole === 'cashier') {
          router.replace('/ban-hang');
        } else if (userRole === 'accountant') {
          router.replace('/ke-toan');
        } else if (userRole === 'kitchen') {
          router.replace('/ban-hang/kitchen');
        }
      } else {
        // 3. Subroute access authorization restrictions
        const segs = segments as string[];
        if (userRole === 'cashier') {
          if (rootSegment !== 'ban-hang') {
            router.replace('/ban-hang');
          }
        } else if (userRole === 'accountant') {
          if (rootSegment !== 'ke-toan' && rootSegment !== 'quan-ly') {
            router.replace('/ke-toan');
          }
        } else if (userRole === 'kitchen') {
          // kitchen can ONLY access /ban-hang/kitchen routes
          if (rootSegment !== 'ban-hang' || segs.length < 2 || segs[1] !== 'kitchen') {
            router.replace('/ban-hang/kitchen');
          }
        }
        // admin and manager roles have access to all routes (unrestricted)
      }
    }
  }, [isInitialized, token, userRole, segments]);

  if (!isInitialized) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <AuthContext.Provider
      value={{ token, username, userRole, branchId, login, logout, isInitialized }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
});
