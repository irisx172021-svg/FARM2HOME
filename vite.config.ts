import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, type Plugin } from 'vite';

/**
 * Ensures Vite HMR behaves robustly and portably across all environments:
 * - Localhost development (direct browser on port 3000 / custom port)
 * - Containerized environments (Docker, Kubernetes)
 * - Cloud IDEs / cloud previews (Google AI Studio, GitHub Codespaces, Gitpod)
 * - Reverse proxies with SSL/TLS termination on standard HTTP/HTTPS ports (80/443)
 *
 * Dynamically adapts to the browser's hostname, protocol (ws/wss), and port,
 * eliminates invalid URL generation on standard ports, removes localhost fallbacks
 * on remote hosts, and prevents unhandled promise rejections if WebSockets are proxied or unavailable.
 */
function portableHmrPlugin(): Plugin {
  return {
    name: 'vite-portable-hmr',
    transform(code, id) {
      if (id.includes('dist/client/client.mjs')) {
        let modified = code;

        // 1. Dynamic host formatting: omit trailing colon when port is default/empty
        modified = modified.replace(
          /const socketHost = [^;]+;/,
          'const socketHost = (hmrPort || importMetaUrl.port) ? `${importMetaUrl.hostname}:${hmrPort || importMetaUrl.port}/` : `${importMetaUrl.hostname}/`;'
        );

        // 2. Prevent fallback to localhost:5173 when running on a remote or proxied client
        modified = modified.replace(
          /const directSocketHost = [^;]+;/,
          'const directSocketHost = socketHost;'
        );

        // 3. Catch unhandled promise rejections so the application never triggers unhandled rejection errors
        modified = modified.replace(
          /transport\.connect\(createHMRHandler\(handleMessage\)\);/,
          'transport.connect(createHMRHandler(handleMessage)).catch((e) => console.debug("[vite] HMR connection unavailable in current environment:", e?.message || e));'
        );

        // 4. Demote failing websocket error messages to debug level to prevent error overlays in non-WS proxies
        modified = modified.replace(
          /console\.error\(\s*`\[vite\] failed to connect to websocket/g,
          'console.debug(`[vite] HMR websocket connection skipped'
        );

        return modified;
      }
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), portableHmrPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
