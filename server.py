# =============================================================================
# VIV Fitness - Локальный HTTP-сервер разработки и тестирования PWA
# =============================================================================
# Назначение: Запуск веб-приложения на порту 3000 с поддержкой no-cache заголовков,
# CORS и корректной регистрацией Service Worker без кэширования статики в dev-режиме.
# =============================================================================

import http.server
import socketserver
import os

# БЛОК 1. Конфигурация сетевого порта и базовой рабочей директории
PORT = 3000
BASE_DIR = os.path.dirname(os.path.abspath(__file__))


# БЛОК 2. Кастомный обработчик запросов с отключением кэширования для dev-режима
class FitnessHandler(http.server.SimpleHTTPRequestHandler):
    """HTTP-обработчик, отдающий файлы приложения без принудительного браузерного кэша."""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=BASE_DIR, **kwargs)

    def end_headers(self):
        # Разрешение кросс-доменных запросов (CORS)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')

        # Принудительный сброс кэша для HTML, JS и Service Worker
        if self.path.endswith('sw.js') or self.path.endswith('.html') or self.path.endswith('.js') or self.path == '/':
            self.send_header('Service-Worker-Allowed', '/')
            self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
            self.send_header('Pragma', 'no-cache')
            self.send_header('Expires', '0')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()


# БЛОК 3. Сервер с мгновенным освобождением сетевого порта при перезапуске
class ReusableTCPServer(socketserver.TCPServer):
    allow_reuse_address = True


# БЛОК 4. Главная точка входа запуска сервера
def run_server():
    """Запускает HTTP-сервер на указанном порту с защитой от блокировки сокета."""
    with ReusableTCPServer(("", PORT), FitnessHandler) as httpd:
        print(f"VIV Fitness Server запущен: http://localhost:{PORT}")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nСервер успешно остановлен.")


if __name__ == '__main__':
    run_server()
