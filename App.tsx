import React, {useEffect, useState} from 'react';
import {ActivityIndicator, StatusBar, StyleSheet, View} from 'react-native';
import {NavigationContainer} from '@react-navigation/native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import type {Session} from '@supabase/supabase-js';
import {AppNavigator} from './src/navigation/AppNavigator';
import {LoginScreen} from './src/screens/Login';
import {getCurrentSession, onAuthSessionChange} from './src/services/auth';
import {palette} from './src/tokens';

function App(): React.JSX.Element {
  const [session, setSession] = useState<Session | null>(null);
  const [isBooting, setIsBooting] = useState(true);

  useEffect(() => {
    let isMounted = true;

    getCurrentSession()
      .then(currentSession => {
        if (isMounted) {
          setSession(currentSession);
          setIsBooting(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setSession(null);
          setIsBooting(false);
        }
      });

    const {data} = onAuthSessionChange(nextSession => {
      setSession(nextSession);
    });

    return () => {
      isMounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" backgroundColor={palette.bg} />
      <NavigationContainer>
        {isBooting ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={palette.terracotta} size="large" />
          </View>
        ) : session ? (
          <AppNavigator />
        ) : (
          <LoginScreen />
        )}
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: palette.bg,
  },
});

export default App;
