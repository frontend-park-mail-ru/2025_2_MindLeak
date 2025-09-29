FROM node:20
WORKDIR /app

# Устанавливаем зависимости
COPY package*.json ./
RUN npm install

# Копируем всё приложение
COPY . .

EXPOSE 3000
CMD ["npm", "start"]
