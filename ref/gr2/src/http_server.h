#ifndef http_server_h
#define http_server_h

#include <stdio.h>

#ifndef _MSC_VER
#    include <arpa/inet.h>
#else
#    include <windows.h>
#endif

#include "http_fs.h"
#include "http_socket.h"

#define SERVER_SUSPENDED 0
#define SERVER_STARTED 1

#define FAILED_TO_CREATE_SOCKET_FD 1
#define FAILED_TO_MAKE_SOCKET_REUSABLE 2
#define FAILED_TO_BIND_SOCKET_PORT 3
#define FAILED_TO_LISTEN_ON_SOCKET 4
#define FAILED_TO_SET_SOCKET_OPTIONS 5
#define FAILED_TO_CREATE_SOCKET_THREAD 6
#define FAILED_TO_MAKE_SOCKET_IPV4_ACCEPTABLE 7

#define NOT_STARTED 0
#define METHOD_PARSED 1
#define PATH_PARSED 2
#define PROTOCOL_PARSED 3
#define HEAD_PARSED 4
#define ALL_PARSE_FINISHED 5

#define SERVER_SUCCEEDED 0

#define MAX_HEAD_BUFFER 4096

#if defined(_MSC_VER)
#include <BaseTsd.h>
typedef SSIZE_T ssize_t;
#endif

#ifdef __cplusplus
extern "C" {
#endif

enum RESPONSE_STATE {
    READY,
    STATUS_SENDED,
    HEAD_SENDING,
    PAYLOAD_SENDING,
    FINISHED
};

struct server {

    struct server_handle *handle;

    struct http_fs *fs;

    int state;

};

struct client_request {

    int state;

    char *server_address;
    unsigned short server_port;

    char *client_address;
    unsigned short client_port;

    char *method;
    char *lower_case_method;

    char *path;
    char *normalized_path;

    char *query;

    char *protocol;

    char *host;
    char *lower_case_host;

    unsigned short port;

    char keep_alive;
    char gzip;

    char partial_content;

    ssize_t range_start;
    ssize_t range_end;

    char could_upgrade;

    ssize_t content_parsed;
    ssize_t content_length;
    char *content;

    int etag;
    char *last_modified_date;

};

struct client_response {

    void *client;

    struct client_request *request;

    enum RESPONSE_STATE state;

    void (*set_http_status_code)(struct client_response *response,
                                 int status_code, char *message);
    void (*set_http_header)(struct client_response *response,
                            char *header, char *value);
    ssize_t (*write_response_data)(struct client_response *response,
                                   char *buffer, int offset, int length);
    void (*end)(struct client_response* response);

};

struct server_handle {

    void *data;

    struct server *server;

    int (*create)(struct server_handle *handle, void *option);

    int (*resume)(struct server_handle *handle);

    void (*destroy)(struct server_handle *handle);

    int (*suspend)(struct server_handle *handle);

    int (*request)(struct server_handle *handle,
                   struct client_request *request,
                   struct client_response *response);

    int (*custom_respond)(struct server_handle *handle,
                          struct client_request *request,
                          struct client_response *response);

    int (*custom_error)(struct server_handle *handle,
                        struct client_response* response,
                        int status_code, char *message);

};

extern struct server *create_server(struct server *server, struct http_fs *fs, struct server_handle *handler, void *option, char suspended);
extern int resume_server(struct server *server);
extern void destroy_server(struct server *server);
extern int suspend_server(struct server *server);

extern void http_error_message(struct server_handle *handle, struct client_response *response, int status_code, char *message);

#ifdef __cplusplus
}
#endif

#endif
