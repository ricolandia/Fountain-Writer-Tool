#!/usr/bin/env python3
import http.server, socketserver, os
PORT = 8000
DIR = os.path.dirname(os.path.abspath(__file__))
class H(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=DIR, **kw)
with socketserver.TCPServer(("", PORT), H) as httpd:
    print(f"Fonte: http://localhost:{PORT}/web/index.html")
    print(f"Teste: http://localhost:{PORT}/web/test-excalidraw.html")
    httpd.serve_forever()
