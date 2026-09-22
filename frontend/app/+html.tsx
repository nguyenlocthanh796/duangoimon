import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

/**
 * Root HTML configuration for Expo Router Web.
 * Injects Google Font 'Inter' with full weights (400, 500, 600, 700, 800),
 * crisp antialiasing resets, and modern web scrollbars.
 */
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="vi">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no, maximum-scale=1" />
        <title>ONGCHU Lean POS — Hệ Thống Quản Lý Bán Hàng Vị Chủ Quán</title>

        {/* Google Fonts: Inter */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500;1,600&family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />

        {/* Reset scrollview style on web */}
        <ScrollViewStyleReset />

        {/* Global Web Typography & Interaction CSS */}
        <style
          dangerouslySetInnerHTML={{
            __html: `
              html, body, #root {
                font-family: 'Inter', 'Be Vietnam Pro', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                -webkit-font-smoothing: antialiased;
                -moz-osx-font-smoothing: grayscale;
                text-rendering: optimizeLegibility;
                user-select: none;
                -webkit-user-select: none;
              }

              /* Cho phép chọn văn bản trong các ô input */
              input, textarea {
                user-select: auto !important;
                -webkit-user-select: auto !important;
                font-family: inherit;
              }

              /* Tabular numbers for clean financial alignment */
              .tabular-nums, [data-tabular="true"] {
                font-variant-numeric: tabular-nums !important;
              }

              /* Sleek web scrollbars */
              ::-webkit-scrollbar {
                width: 6px;
                height: 6px;
              }
              ::-webkit-scrollbar-track {
                background: transparent;
              }
              ::-webkit-scrollbar-thumb {
                background: rgba(148, 163, 184, 0.35);
                border-radius: 9999px;
              }
              ::-webkit-scrollbar-thumb:hover {
                background: rgba(100, 116, 139, 0.65);
              }

              /* Smooth cursor on clickable items */
              [role="button"], button, a {
                cursor: pointer !important;
              }
            `,
          }}
        />

        {/* Auto Recovery Script for Chunk Load & Cache Mismatch Errors */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Auto-recover if browser tries to load an outdated JS bundle hash
              window.addEventListener('error', function(e) {
                var target = e.target || e.srcElement;
                if (target && target.tagName === 'SCRIPT' && target.src && target.src.indexOf('.js') !== -1) {
                  var sessionKey = 'pos_reload_guard_' + target.src.split('/').pop();
                  if (!sessionStorage.getItem(sessionKey)) {
                    sessionStorage.setItem(sessionKey, '1');
                    console.warn('[OngChu POS] Outdated JS bundle detected, auto refreshing page...', target.src);
                    window.location.reload();
                  }
                }
              }, true);
            `,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
