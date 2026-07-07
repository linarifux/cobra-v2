FROM node:alpine3.21 as build

#Build application
WORKDIR /app
COPY package.json .
RUN npm install
COPY . .
RUN npm run build

#Server with Nginx
FROM nginx:alpine
WORKDIR /usr/share/nginx/html
RUN rm -rf *
COPY --from=build /app/build .
EXPOSE 80
ENTRYPOINT ["nginx", "-g", "daemon off;"]