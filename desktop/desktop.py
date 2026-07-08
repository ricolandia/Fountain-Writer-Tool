#!/usr/bin/env python3
"""Fonte — Desktop (PyWebView)

Abre web/index.html em janela nativa usando o WebView do sistema.
Windows: Edge WebView2, Linux: WebKit GTK, macOS: WebKit nativo.

Uso:
    python3 desktop.py
"""
import webview, os, sys

DIR = os.path.dirname(os.path.abspath(__file__))
INDEX = os.path.join(DIR, '..', 'web', 'index.html')

if not os.path.exists(INDEX):
    print("Erro: web/index.html não encontrado.")
    print("Execute este script da raiz do projeto ou de desktop/")
    sys.exit(1)

webview.create_window(
    title='Fonte',
    url=INDEX,
    width=1200,
    height=800,
    resizable=True,
    fullscreen=False,
    min_size=(800, 600)
)
webview.start()
