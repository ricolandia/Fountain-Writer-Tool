#!/usr/bin/env python3
"""Fonte — Desktop (PyWebView)

Abre web/index.html em janela nativa usando o WebView do sistema.
Windows: Edge WebView2, Linux: WebKit GTK, macOS: WebKit nativo.

Uso:
    python3 desktop/desktop.py   (modo dev)
    ./Fonte.exe                  (modo compilado)
"""
import webview, os, sys

if getattr(sys, 'frozen', False):
    BASE = sys._MEIPASS
else:
    BASE = os.path.dirname(os.path.abspath(__file__))

INDEX = os.path.join(BASE, 'web', 'index.html')

if not os.path.exists(INDEX):
    print("Erro: web/index.html não encontrado em", INDEX)
    print("Execute de desktop/ ou da raiz do projeto")
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
