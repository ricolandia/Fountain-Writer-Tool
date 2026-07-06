import React from 'react';
import { createRoot } from 'react-dom/client';
import { Excalidraw } from '@excalidraw/excalidraw';

function App() {
  const excRef = React.useRef(null);
  const [theme, setTheme] = React.useState('light');

  React.useEffect(() => {
    setTheme(document.documentElement.classList.contains('dark') ? 'dark' : 'light');

    const handleMessage = async (e) => {
      if (e.data.type === 'LOAD_SCENE' && excRef.current) {
        try { excRef.current.importScene(e.data.scene); } catch (err) {}
      }
      if (e.data.type === 'GET_SCENE' && excRef.current) {
        try {
          const scene = await excRef.current.exportScene();
          window.parent.postMessage({ type: 'SCENE_DATA', scene }, '*');
        } catch (err) {}
      }
      if (e.data.type === 'SET_THEME') {
        setTheme(e.data.theme);
      }
    };

    window.addEventListener('message', handleMessage);
    window.parent.postMessage({ type: 'EXCALIDRAW_READY' }, '*');
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  return React.createElement(Excalidraw, {
    ref: excRef,
    theme: theme,
  });
}

window.addEventListener('DOMContentLoaded', () => {
  const root = createRoot(document.getElementById('root'));
  root.render(React.createElement(App));
});
