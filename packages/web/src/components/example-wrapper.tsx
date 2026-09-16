import { Suspense } from 'solid-js';
import { isServer } from 'solid-js/web';
import { MetaProvider } from '@solidjs/meta';
import { Router } from '@solidjs/router';
import { FileRoutes } from '@solidjs/start';
import { getCookie } from 'vinxi/http';

import {
  ColorModeProvider,
  ColorModeScript,
  cookieStorageManagerSSR,
} from '@kobalte/core';

const getServerCookies = () => {
  'use server';
  const colorMode = getCookie('kb-color-mode');
  return colorMode ? `kb-color-mode=${colorMode}` : '';
};

export default function App() {
  const storageManager = cookieStorageManagerSSR(
    isServer ? getServerCookies() : document.cookie,
  );

  return (
    <Router
      root={(props) => (
        <MetaProvider>
          <Suspense>
            <ColorModeScript storageType={storageManager.type} />
            <ColorModeProvider storageManager={storageManager}>
              {props.children}
            </ColorModeProvider>
          </Suspense>
        </MetaProvider>
      )}
    >
      <FileRoutes />
    </Router>
  );
}
