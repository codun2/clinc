# Laravel API runtime (dev server) with MySQL support
FROM php:8.4-cli

RUN apt-get update \
    && apt-get install -y --no-install-recommends libzip-dev unzip \
    && docker-php-ext-install pdo_mysql bcmath \
    && rm -rf /var/lib/apt/lists/*

# Composer (for running artisan/composer inside the container if needed)
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /app

EXPOSE 8000

# On a fresh clone (server) vendor/ is absent → install it (incl. dev deps so
# the faker-based seeders work). Locally vendor is bind-mounted → skipped.
# Then wait-migrate and serve. Code is bind-mounted via compose.
CMD ["sh", "-c", "[ -d vendor ] || composer install --optimize-autoloader --no-interaction; php artisan migrate --force || true; php artisan serve --host=0.0.0.0 --port=8000"]
