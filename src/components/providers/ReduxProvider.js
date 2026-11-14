'use client';

import { Provider } from 'react-redux';
import { useEffect } from 'react';
import { store, persistor, hydrationSnapshot } from '@/lib/store/store';

export default function ReduxProvider({ children }) {
  useEffect(() => { persistor.persist(); }, []);
  return (
    <Provider store={store} serverState={hydrationSnapshot}>
      {children}
    </Provider>
  );
}
