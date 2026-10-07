import http.server
import socketserver
import os
import db_adapter

PORT = 3000
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

class FitnessHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=BASE_DIR, **kwargs)

    def do_GET(self):
        if self.path.startswith('/data/catalog.json'):
            try:
                db_adapter.check_and_sync()
            except Exception as e:
                print(f"[server] Ошибка авто-синхронизации каталога: {e}")
        return super().do_GET()

    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        if self.path.endswith('sw.js') or self.path.endswith('.html') or self.path.endswith('.js') or self.path == '/':
            self.send_header('Service-Worker-Allowed', '/')
            self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
            self.send_header('Pragma', 'no-cache')
            self.send_header('Expires', '0')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

class ReusableTCPServer(socketserver.TCPServer):
    allow_reuse_address = True

def run_server():
    try:
        db_adapter.check_and_sync()
    except Exception as e:
        print(f"[server] Начальная проверка базы: {e}")

    with ReusableTCPServer(("", PORT), FitnessHandler) as httpd:
        print(f"VIV Fitness Server running on http://localhost:{PORT}")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServer stopped.")

if __name__ == '__main__':
    run_server()
