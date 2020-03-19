#ifndef _MSC_VER
#    include <unistd.h>
#    include <sys/socket.h>
#else
#    include <winsock2.h>
#    include <ws2tcpip.h>
#    define inet_ntop(A, B, C, D) WSAAddressToString((B), sizeof (B), 0, C, D)
#endif

#include "http_socket.h"

#include "http_utils.h"

#include <assert.h>

#include <ctype.h>
#include <string.h>

#include <stdlib.h>
#include <stdio.h>

#include <signal.h>
#include <errno.h>

#include <sys/stat.h>

#define MAX_BUFFER 131072

#ifndef MSG_NOSIGNAL
#   define MSG_NOSIGNAL 0
#endif

#if defined(_WIN32) || defined(WIN32) || defined(_WIN64) || defined(WIN64) || defined(__CYGWIN__) || defined(__CYGWIN32__) || defined(__CYGWIN64__) || defined(__MINGW__) || defined(__MINGW32__) || defined(__MINGW64__) || defined(__BORLANDC__)
#   define IS_WINDOWS 1
#else
#   define IS_WINDOWS 0
#endif

struct client_thread {

    struct server_thread *server;

    struct sockaddr_in socket_ipv4;
    struct sockaddr_in6 socket_ipv6;

    int fd;

};

struct server_thread {

    struct server_handle *handle;

    int ipv4;

    char *address;
    unsigned short port;

    int backlog;

    struct sockaddr_in socket_ipv4;
    struct sockaddr_in6 socket_ipv6;

    int fd;

    HANDLE thread;

    volatile int client_count;

};

static struct http_server_options default_http_server_options = { 32, 80, 0 };

static int read_request_data(struct client_thread *client, char *buffer, int length);

static int write_response_data(struct client_thread *client, char *buffer, int length);

static void response_set_http_status_code(struct client_response *response, int status_code, char *message) {

    assert(response->state <= READY);

    char buffer[MAX_HEAD_BUFFER] = { 0 };

    sprintf(buffer, "HTTP/1.1 %d %s\r\n", status_code, message);

    write_response_data(response->client, buffer, strlen(buffer));

    response->state = STATUS_SENDED;

}

static void response_send_http_header(struct client_response *response, char *header, char *value) {

    assert(response->state <= HEAD_SENDING);

    if (response->state < STATUS_SENDED) {
        response->set_http_status_code(response, 200, "OK");
        response->state = HEAD_SENDING;
    }

    char buffer[MAX_HEAD_BUFFER] = { 0 };

    sprintf(buffer, "%s: %s\r\n", header, value);

    write_response_data(response->client, buffer, strlen(buffer));

}

static ssize_t response_write_response_data(struct client_response* response, char* payload, int offset, int size) {

    assert(response->state < FINISHED);

    if (response->state < PAYLOAD_SENDING) {
        write_response_data(response->client, "\r\n", 2);
        response->state = PAYLOAD_SENDING;
    }

    return write_response_data(response->client, payload + offset, size);

}

static void response_end(struct client_response* response) {

    assert(response->state < FINISHED);

    if (response->state < STATUS_SENDED) {
        response->set_http_status_code(response, 200, "OK");
    }

    if (response->state < PAYLOAD_SENDING) {
        write_response_data(response->client, "\r\n", 2);
    }

    write_response_data(response->client, "\r\n", 2);

    response->state = FINISHED;

}

static struct client_response *sokect_response(void* client, struct client_response *response, struct client_request *request) {

    response->client = client;
    response->state = READY;
    response->request = request;

    response->set_http_status_code = &response_set_http_status_code;
    response->set_http_header = &response_send_http_header;
    response->write_response_data = &response_write_response_data;
    response->end = &response_end;

    return response;

}

static void clear_request(struct client_request *request) {

    request->state = 0;

    if (request->server_address) {
        delete_text(request->server_address); request->server_address = NULL;
    }
    request->server_port = 0;

    if (request->client_address) {
        delete_text(request->client_address); request->client_address = NULL;
    }
    request->client_port = 0;

    if (request->method) {
        delete_text(request->method); request->method = NULL;
    }

    if (request->lower_case_method) {
        delete_text(request->lower_case_method); request->lower_case_method = NULL;
    }

    if (request->path) {
        delete_text(request->path); request->path = NULL;
    }

    if (request->normalized_path) {
        delete_text(request->normalized_path); request->normalized_path = NULL;
    }

    if (request->query) {
        delete_text(request->query); request->query = NULL;
    }

    if (request->protocol) {
        delete_text(request->protocol); request->protocol = NULL;
    }

    if (request->host) {
        delete_text(request->host); request->host = NULL;
    }

    if (request->lower_case_host) {
        delete_text(request->lower_case_host); request->lower_case_host = NULL;
    }

    if (request->last_modified_date) {
        delete_text(request->last_modified_date); request->last_modified_date = NULL;
    }

    request->port = 0;

    request->keep_alive = 0;
    request->gzip = 0;

    request->partial_content = 0;
    request->range_start = -1;
    request->range_end = -1;

    request->could_upgrade = 0;

    request->etag = 0;

    request->content_length = 0;
    request->content_parsed = 0;

    if (request->content) {
        free(request->content);
    }

}

static ssize_t parse_request(char *buffer, ssize_t size, struct client_request *request, int tls) {

    struct range range = { 0, 0 };

    if (request->state == NOT_STARTED) {

        range = parse_word(buffer, 0, size);
        char *method = new_slice_text(buffer, range);
        if (!method) {
            return 0;
        }

        if (request->method) {
            delete_text(request->method);
        }
        request->method = method;

        if (request->lower_case_method) {
            delete_text(request->lower_case_method);
        }
        request->lower_case_method = new_lower_case(method);

        request->state = METHOD_PARSED;

    }

    if (request->state == METHOD_PARSED) {

        ssize_t last_offset = range.offset + range.length;

        range = parse_word(buffer, last_offset, size);
        char *path = new_slice_text(buffer, range);
        if (!path) {
            return last_offset;
        }

        if (request->path) {
            delete_text(request->path);
        }
        request->path = path;

        char *no_host_path = NULL;
        if (path[0] != '/') {

            int slash_count = 0;
            ssize_t looper = 0;
            while ((looper < range.length) && (slash_count < 3)) {

                if (path[looper] == '/') {
                    ++slash_count;
                }

                if (slash_count != 3) {
                    ++looper;
                }

            }

            struct range normalized_range = { looper, range.length - looper };

            no_host_path = new_slice_text(path, normalized_range);

        }
        else {
            no_host_path = new_text(path);
        }

        size_t no_host_path_length = strlen(no_host_path);
        ssize_t looper = 0;
        while ((no_host_path[looper] != '?') && (looper < no_host_path_length)) {
            ++looper;
        }

        struct range range = { 0, looper };
        char *path_to_normalize = new_slice_text(no_host_path, range);
        char *normalized_path = new_normalized_path(path_to_normalize, 0, 0);
        delete_text(path_to_normalize);

        char *decoded_path = calloc(strlen(normalized_path) + 1, sizeof(char));
        memset(decoded_path, 0, strlen(normalized_path) + 1);
        decode_url(decoded_path, normalized_path);
        delete_text(normalized_path);

        if (request->normalized_path) {
            delete_text(request->normalized_path);
        }
        request->normalized_path = new_text(decoded_path);
        free(decoded_path);

        range.offset = looper + 1;
        range.length = no_host_path_length - range.offset;
        if (request->query) {
            delete_text(request->query);
        }
        request->query = new_slice_text(no_host_path, range);

        delete_text(no_host_path);

        request->state = PATH_PARSED;

    }

    if (request->state == PATH_PARSED) {

        ssize_t last_offset = range.offset + range.length;

        ssize_t protocol_offset = -1;
        ssize_t protocol_length = 0;

        ssize_t looper = range.offset + range.length;
        while ((looper < size) && (buffer[looper] != 10) && (buffer[looper - 1] != 13)) {

            if ((protocol_offset == -1) && (!is_whitespace(buffer[looper]))) {
                protocol_offset = looper;
            }

            ++looper;
        }

        protocol_length = looper - 1 - protocol_offset;

        if ((looper >= size) || (protocol_offset == -1) || (!protocol_length)) {
            return last_offset;
        }

        range.offset = protocol_offset;
        range.length = protocol_length;

        char *protocol = new_slice_text(buffer, range);
        if (!protocol) {
            return last_offset;
        }

        if (request->protocol) {
            delete_text(request->protocol);
        }
        request->protocol = protocol;

        request->state = PROTOCOL_PARSED;

    }

    if (request->state == PROTOCOL_PARSED) {

        ssize_t looper = range.offset + range.length + 1;

        while ((looper < size) && (request->state != HEAD_PARSED)) {

            if ((looper < size + 1) && (buffer[looper] == 13) && (buffer[looper + 1] == 10)) {

                request->state = HEAD_PARSED;

                range.offset = looper + 2;
                range.length = 0;

            }
            else {

                ssize_t last_offset = looper;

                ssize_t field_offset = -1;
                ssize_t field_length = 0;

                while ((looper < size) && (!field_length)) {

                    if ((field_offset == -1) && (!is_whitespace(buffer[looper]))) {
                        field_offset = looper;
                    }

                    if ((field_offset != -1) && (buffer[looper] == ':')) {
                        field_length = looper - field_offset;
                    }

                    ++looper;
                }

                if (!field_length) {
                    return last_offset;
                }

                ssize_t value_offset = -1;
                ssize_t value_length = 0;
                while ((looper < size) && (!value_length)) {

                    if ((value_offset == -1) && (!is_whitespace(buffer[looper]))) {
                        value_offset = looper;
                    }

                    if ((value_offset != -1) && (looper > 0) && (buffer[looper] == 10) && (buffer[looper - 1] == 13)) {
                        value_length = looper - value_offset - 1;
                    }

                    ++looper;
                }

                if (!value_length) {
                    return last_offset;
                }

                range.offset = field_offset;
                range.length = field_length;

                char *field = new_slice_text(buffer, range);

                char *lower_case_field = new_lower_case(field);

                range.offset = value_offset;
                range.length = value_length;

                char *value = new_slice_text(buffer, range);

                if (strcmp("host", lower_case_field) == 0) {

                    char *host = NULL;
                    unsigned short port = tls ? 443 : 80;

                    ssize_t looper2 = 0;
                    while ((looper2 < range.length) && (value[looper2] != ':')) {
                        ++looper2;
                    }

                    if (looper2 >= range.length) {
                        host = new_text(value);
                    }
                    else {

                        range.offset = 0;
                        range.length = looper2;
                        host = new_slice_text(value, range);

                        port = atoi(&value[looper2 + 1]);

                    }

                    if (request->host) {
                        delete_text(request->host);
                    }
                    request->host = host;

                    if (request->lower_case_host) {
                        delete_text(request->lower_case_host);
                    }
                    request->lower_case_host = new_lower_case(host);

                    request->port = port;

                } else if (strcmp("connection", lower_case_field) == 0) {

                    request->keep_alive = (strcmp("keep-alive", value) == 0) ? 1 : 0;

                } else if (strcmp("accept-encoding", lower_case_field) == 0) {

                    request->gzip = strstr(value, "gzip") ? 1 : 0;

                } else if (strcmp("upgrade-insecure-requests", lower_case_field) == 0) {

                    request->could_upgrade = (strcmp("1", value) == 0) ? 1 : 0;

                } else if (strcmp("range", lower_case_field) == 0) {

                    request->partial_content = 1;

                    request->range_start = -1;
                    request->range_end = -1;

                    ssize_t length = strlen(value);

                    const char *prefix = "bytes=";
                    const ssize_t prefix_length = strlen(prefix);

                    if (length > prefix_length) {

                        struct range bytes_range = { 0, prefix_length };

                        char *value_prefix = new_slice_text(value, bytes_range);
                        if (strcmp(value_prefix, prefix) == 0) {

                            ssize_t looper = 0;
                            while ((looper + prefix_length < length) && (value[looper + prefix_length] != '-')) {
                                ++looper;
                            }

                            if (looper + prefix_length < length) {

                                if (looper > 0) {

                                    bytes_range.offset = prefix_length;
                                    bytes_range.length = looper;

                                    char *range_start = new_slice_text(value, bytes_range);

                                    request->range_start = atoi(range_start);

                                    delete_text(range_start);

                                }

                                ++looper;
                                if (looper + prefix_length < length) {

                                    bytes_range.offset = prefix_length + looper;
                                    bytes_range.length = length - bytes_range.offset;

                                    char *range_end = new_slice_text(value, bytes_range);

                                    request->range_end = atoi(range_end);

                                    delete_text(range_end);

                                }

                            }

                        }

                        delete_text(value_prefix);

                    }

                } else if (strcmp("content-length", lower_case_field) == 0) {

                    request->content_length = atoi(value);

                } else if (strcmp("if-none-match", lower_case_field) == 0) {

                    request->etag = atoi(value);

                } else if (strcmp("if-modified-since", lower_case_field) == 0) {

                    request->last_modified_date = new_text(value);

                }

                delete_text(field);
                delete_text(lower_case_field);
                delete_text(value);

            }

        }

    }

    if (request->content_length && (request->state == HEAD_PARSED)) {

        if (!request->content) {
            request->content = malloc(request->content_length + 1);
            memset(request->content, 0, request->content_length + 1);
        }

        ssize_t content_length = MIN(request->content_length, request->content_parsed + size - range.offset);

        int looper = 0;
        while (request->content_parsed + looper < content_length) {
            request->content[request->content_parsed + looper] = buffer[range.offset + looper];
            ++looper;
        }

        request->content_parsed = content_length;

        range.length = looper;

        if (request->content_length == request->content_parsed) {
            request->state = ALL_PARSE_FINISHED;
        }

    } else {
        request->state = ALL_PARSE_FINISHED;
    }

    return range.offset + range.length;

}

static DWORD WINAPI handle_client_socket(void *data) {

    struct client_thread *client = (struct client_thread *)data;

    struct timeval timeout = { 0, 1000 };
    if (setsockopt(client->fd, SOL_SOCKET, SO_RCVTIMEO, (char *)&timeout, sizeof(timeout)) < 0) {
        close(client->fd); free(data); return 0;
    }
    if (setsockopt(client->fd, SOL_SOCKET, SO_SNDTIMEO, (char *)&timeout, sizeof(timeout)) < 0) {
        close(client->fd); free(data); return 0;
    }

    char buffer[MAX_BUFFER] = { 0 };

    ssize_t next_offset = 0;

    struct client_request request = { 0 };
    struct client_response response = { 0 };

    clear_request(&request);

    sokect_response(client, &response, &request);

    if (client->server->ipv4) {
        request.client_address = new_text(inet_ntoa(client->socket_ipv4.sin_addr));
        request.client_port = ntohs(client->socket_ipv4.sin_port);
    } else {
        char address[INET6_ADDRSTRLEN] = { 0 };
        inet_ntop(AF_INET6, &client->socket_ipv6.sin6_addr, address, INET6_ADDRSTRLEN);
        request.client_address = new_text(address);
        request.client_port = ntohs(client->socket_ipv6.sin6_port);
    }

    request.server_address = new_text(client->server->address);
    request.server_port = client->server->port;

    request.port = 80;

    int closed = 0;

    time_t last_activity_time = time(NULL);

    while (!closed) {

        if (MAX_BUFFER - next_offset <= 0) {

            closed = 1;

        } else if (client->server->handle->server->state == SERVER_SUSPENDED) {

            closed = 1;

        } else {

            ssize_t received = read_request_data(client, &buffer[next_offset], MAX_BUFFER - next_offset);
            if (received > 0) {

                last_activity_time = time(NULL);

                ssize_t new_offset = parse_request(buffer, next_offset + received, &request, 0);
                if (new_offset < received) {

                    ssize_t looper = 0;
                    while (looper < received - new_offset) {
                        buffer[looper] = buffer[new_offset + looper];
                        ++looper;
                    }

                    next_offset = looper;

                }

                if (request.state == ALL_PARSE_FINISHED) {

                    if (client->server->handle->request(client->server->handle, &request, &response) != 0) {
                        closed = 1;
                    }

                    if (!request.keep_alive) {
                        closed = 1;
                    }

                    clear_request(&request);

                    request.port = 80;

                }

                last_activity_time = time(NULL);

            } else if (received == 0) {

                if (time(NULL) - last_activity_time > 60) {
                    closed = 1;
                } else {
                    suspend(1000);
                }

            } else if ((received < 0) && (errno != EAGAIN)) {

                closed = 1;

            } else {

                if (time(NULL) - last_activity_time > 60) {
                    closed = 1;
                } else {
                    suspend(1000);
                }

            }

        }

    }

#ifdef _MSC_VER
    shutdown(client->fd, SD_BOTH);
#else
    shutdown(client->fd, SHUT_RDWR);
#endif

#ifdef _MSC_VER
    closesocket(client->fd);
#else
    close(client->fd);
#endif

    free(data);

    return 0;

}

static int read_request_data(struct client_thread *client, char *buffer, int length) {

    return recv(client->fd, buffer, length, 0);

}

static int write_response_data(struct client_thread *client, char *buffer, int length) {

    int written = 0;
    while (written != length) {

        int result = send(client->fd, buffer + written, length - written, MSG_NOSIGNAL);

        if (result < 0) {
            return result;
        }

        written += result;
    }

    return written;

}

static DWORD WINAPI handle_server_socket(void *data) {

    struct server_thread *server = (struct server_thread *)data;

    while (server->handle->server->state == SERVER_STARTED) {

        struct client_thread *client = malloc(sizeof(struct client_thread));
        memset(client, 0, sizeof(struct client_thread));

        client->server = server;

        if (server->ipv4) {
            socklen_t client_length = sizeof(client->socket_ipv4);
            client->fd = accept(server->fd, (struct sockaddr *)&client->socket_ipv4, &client_length);
        } else {
            socklen_t client_length = sizeof(client->socket_ipv6);
            client->fd = accept(server->fd, (struct sockaddr *)&client->socket_ipv6, &client_length);
        }

        if (server->handle->server->state == SERVER_STARTED) {

            HANDLE thread = CreateThread(NULL, 0, &handle_client_socket, client, 0, NULL);
            if (!thread) {
                close(client->fd); free(client); break;
            }

        } else {
            close(client->fd); free(client);
        }

    }

#ifdef _MSC_VER
    shutdown(server->fd, SD_BOTH);
#else
    shutdown(server->fd, SHUT_RDWR);
#endif

    close(server->fd);

    server->handle->server->state = SERVER_SUSPENDED;

    delete_text(server->address);

    return 0;
}

static int suspend_http_server(struct server_thread *server) {

    close(server->fd);

    return SERVER_SUCCEEDED;

}

static int resume_http_server(struct server_thread *server) {

    if (server->ipv4) {
        server->fd = socket(AF_INET, SOCK_STREAM, 0);
    } else {
        server->fd = socket(AF_INET6, SOCK_STREAM, 0);
    }
    if (server->fd < 0) {
        close(server->fd); return FAILED_TO_CREATE_SOCKET_FD;
    }

    int on = 1;
    if (setsockopt(server->fd, SOL_SOCKET, SO_REUSEADDR, (char *)&on, sizeof(on)) < 0) {
        close(server->fd); return FAILED_TO_MAKE_SOCKET_REUSABLE;
    }

    if (!server->ipv4) {
        on = 0;
        if (setsockopt(server->fd, IPPROTO_IPV6, IPV6_V6ONLY, (char *)&on, sizeof(on)) < 0) {
            close(server->fd); return FAILED_TO_MAKE_SOCKET_IPV4_ACCEPTABLE;
        }
    }

#if defined(__ANDROID__) && defined(__LP64__)
    on = 1;
    if (setsockopt(server->fd, SOL_SOCKET, SO_REUSEPORT, (char *)&on, sizeof(on)) < 0) {
        close(server->fd); return FAILED_TO_MAKE_SOCKET_REUSABLE;
    }
#endif

    memset(&server->socket_ipv4, 0, sizeof(server->socket_ipv4));
    memset(&server->socket_ipv6, 0, sizeof(server->socket_ipv6));
    if (server->ipv4) {

        server->socket_ipv4.sin_family = AF_INET;
        server->socket_ipv4.sin_port = htons(server->port);
        server->socket_ipv4.sin_addr.s_addr = htonl(INADDR_ANY);

        if (bind(server->fd, (struct sockaddr *)&server->socket_ipv4, sizeof(server->socket_ipv4)) != 0) {
            close(server->fd); return FAILED_TO_BIND_SOCKET_PORT;
        }

    } else {

        server->socket_ipv6.sin6_family = AF_INET6;
        server->socket_ipv6.sin6_port = htons(server->port);
        server->socket_ipv6.sin6_addr = in6addr_any;

        if (bind(server->fd, (struct sockaddr *)&server->socket_ipv6, sizeof(server->socket_ipv6)) != 0) {
            close(server->fd); return FAILED_TO_BIND_SOCKET_PORT;
        }

    }

    if (listen(server->fd, server->backlog) != 0) {
        close(server->fd); return FAILED_TO_LISTEN_ON_SOCKET;
    }

    if (server->ipv4) {
        server->address = new_text(inet_ntoa(server->socket_ipv4.sin_addr));
    } else {
        char address[INET6_ADDRSTRLEN] = { 0 };
        inet_ntop(AF_INET6, &server->socket_ipv6.sin6_addr, address, INET6_ADDRSTRLEN);
        server->address = new_text(address);
    }

    server->thread = CreateThread(NULL, 0, &handle_server_socket, server, 0, NULL);
    if (!server->thread) {
        close(server->fd); return FAILED_TO_CREATE_SOCKET_THREAD;
    }

    return SERVER_SUCCEEDED;

}

static void destroy_http_server(struct server_thread *server) {

    free(server);

}

static struct server_thread *create_http_server(struct server_handle *handle, unsigned short port, int backlog, int ipv4) {

    struct server_thread *server = malloc(sizeof(struct server_thread));

    memset(server, 0, sizeof(struct server_thread));

    server->address = NULL;

    server->fd = 0;

    server->client_count = 0;

    server->port = port;

    server->backlog = backlog;

    server->handle = handle;

    server->ipv4 = ipv4;

    return server;

}

static int socket_server_create(struct server_handle *handle, struct http_server_options *options) {

    if (!options) {
        options = &default_http_server_options;
    }

    handle->data = create_http_server(handle, options->port, options->backlog, options->ipv4);

    return SERVER_SUCCEEDED;

}

static int socket_server_resume(struct server_handle *handle) {

    return resume_http_server(handle->data);

}

static int socket_server_suspend(struct server_handle *handle) {

    return suspend_http_server(handle->data);

}

static void socket_server_destroy(struct server_handle *handle) {

    destroy_http_server(handle->data);

}

struct server_handle *socket_server_handle(struct server_handle *handle) {

    handle->create = &socket_server_create;
    handle->resume = &socket_server_resume;
    handle->suspend = &socket_server_suspend;
    handle->destroy = &socket_server_destroy;

    handle->custom_respond = NULL;
    handle->custom_error = NULL;

    return handle;

}
