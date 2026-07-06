#!/usr/bin/env python3
import http.server, socketserver, os

PORT = 8000
DIR = os.path.dirname(os.path.abspath(__file__))

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIR, **kwargs)

with socketserver.TCPServer(("", PORT), Handler) as httpd:
    print(f"Fonte: http://localhost:{PORT}/web/index.html")
    httpd.serve_forever()
