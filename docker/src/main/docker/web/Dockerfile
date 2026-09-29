FROM nginx:alpine

RUN apk add --no-cache openssl

COPY web/dist /usr/share/nginx/html
COPY web/nginx.conf /etc/nginx/conf.d/default.conf
COPY web/docker-entrypoint.sh /usr/local/bin/family-manager-entrypoint
RUN chmod +x /usr/local/bin/family-manager-entrypoint

EXPOSE 80 443

ENTRYPOINT ["/usr/local/bin/family-manager-entrypoint"]
