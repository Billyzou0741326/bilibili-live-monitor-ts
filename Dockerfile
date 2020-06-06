FROM alpine:3.11 as build
COPY . /root/app/
WORKDIR /root/app/
RUN apk add --no-cache              \
    build-base                      \
    nodejs                          \
    npm                             \
    && npm install                  \
    && npm install -g typescript    \
    && tsc

FROM alpine:3.11 as final
RUN apk add --no-cache          \
    nodejs
COPY --from=build /root/app/build/ /root/app/build/
COPY --from=build /root/app/node_modules/ /root/app/node_modules/
WORKDIR /root/app/
EXPOSE 8999 9001
CMD [ "node", "build/main.js" ]
