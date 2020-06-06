FROM alpine:3.11 as build_project
COPY . /root/app/
WORKDIR /root/app/
RUN apk add --no-cache              \
    build-base                      \
    nodejs                          \
    npm                             \
    && npm install                  \
    && npm install -g typescript    \
    && tsc

FROM alpine:3.11 as build_jemalloc
WORKDIR /root/
RUN apk add --no-cache                                          \
    build-base                                                  \
    autoconf                                                    \
    automake                                                    \
    git                                                         \
    && git clone https://github.com/jemalloc/jemalloc.git       \
    && cd jemalloc/ && git checkout 5.2.1                       \
    && ./autogen.sh                                             \
    && mkdir build/ && cd build/                                \
    && ../configure --prefix=/root                              \
    && make && make install

FROM alpine:3.11 as final
RUN apk add --no-cache nodejs
COPY --from=build_jemalloc /root/lib/libjemalloc.so.2 /root/lib/
COPY --from=build_project /root/app/build/ /root/app/build/
COPY --from=build_project /root/app/node_modules/ /root/app/node_modules/
WORKDIR /root/app/
EXPOSE 8999 9001
CMD LD_PRELOAD=/root/lib/libjemalloc.so.2 node build/main.js
