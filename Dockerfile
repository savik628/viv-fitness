FROM nginx:alpine

# Удаляем дефолтные файлы Nginx
RUN rm -rf /usr/share/nginx/html/*

# Копируем конфигурацию веб-сервера
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Копируем все статические файлы приложения VIV
COPY . /usr/share/nginx/html/

# Настройка прав
RUN chmod -R 755 /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
