#ifndef http_socket_h
#define http_socket_h

#include "http_fs.h"
#include "http_server.h"

#ifdef __cplusplus
extern "C" {
#endif

struct http_server_options {

    int backlog;

    unsigned short port;

    int ipv4;

};

extern struct server_handle *socket_server_handle(struct server_handle *handle);

#ifdef __cplusplus
}
#endif

#endif
