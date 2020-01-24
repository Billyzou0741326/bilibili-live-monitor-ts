FROM node:10
WORKDIR /
COPY . .
RUN npm install
EXPOSE 8999
CMD [ "node", "build/main.js" ]
