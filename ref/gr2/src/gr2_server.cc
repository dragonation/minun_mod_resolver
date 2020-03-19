#include <stdio.h>
#include <stdlib.h>

#include <windows.h>
#include <winsock2.h>
#include <ws2tcpip.h>

#include "http_server.h"
#include "http_vfs.h"
#include "http_uifs.h"

#include "json.h"
#include "base64.h"

using json = nlohmann::json;

typedef bool(__stdcall *granny_decompress)(
	int format, 
	bool file_is_byte_reversed, 
	int compressed_bytes_size, 
	void *compressed_bytes, 
	int stop_0, int stop_1, 
	int decompressed_bytes_size, 
	void *decompressed_bytes);

static granny_decompress decompress_function = nullptr;

static struct server_handle handle = {0};

int gr2_custom_respond(struct server_handle *handle,
                       struct client_request *request,
                       struct client_response *response);

int gr2_custom_error(struct server_handle *handle,
                     struct client_response* response,
                     int status_code, char *message);

void launch_gr2_server(char *ui_path, int port) {

    static struct http_fs fs = {0};
    http_vfs(&fs, ui_path);

    socket_server_handle(&handle);
    handle.custom_respond = &gr2_custom_respond;

    static struct http_server_options options = {0};
    options.backlog = 32;
    options.ipv4 = 1;
    options.port = port;

    static struct server server = {0};
    create_server(&server, &fs, &handle, &options, 0);

}

int decompress_gr2_data(struct server_handle *handle,
                       struct client_request *request,
                       struct client_response *response) {

    if (strcmp(request->lower_case_method, "post") != 0) {
        http_error_message(handle, response, 405, "Method Not Allowed");
        return 1;
    }

    if (!request->content) {
        http_error_message(handle, response, 400, "Bad Request");
        return 1;
    }

    auto data = json::parse(request->content, nullptr, false);
    if (data.is_discarded()) {
        http_error_message(handle, response, 400, "Bad Request");
        return 1;
    }

    if ((!data.contains("format")) || (!data["format"].is_number())) {
        http_error_message(handle, response, 400, "Bad Request");
        return 1;
    }

    if ((!data.contains("stop0")) || (!data["stop0"].is_number())) {
        http_error_message(handle, response, 400, "Bad Request");
        return 1;
    }

    if ((!data.contains("stop1")) || (!data["stop1"].is_number())) {
        http_error_message(handle, response, 400, "Bad Request");
        return 1;
    }

    if ((!data.contains("decompressedSize")) || (!data["decompressedSize"].is_number())) {
        http_error_message(handle, response, 400, "Bad Request");
        return 1;
    }

    if ((!data.contains("compressedSize")) || (!data["compressedSize"].is_number())) {
        http_error_message(handle, response, 400, "Bad Request");
        return 1;
    }

    if ((!data.contains("compressedData")) || (!data["compressedData"].is_string())) {
        http_error_message(handle, response, 400, "Bad Request");
        return 1;
    }

    int format = data["format"].get<int>();
    int stop_0 = data["stop0"].get<int>();
    int stop_1 = data["stop1"].get<int>();
    int decompressed_size = data["decompressedSize"].get<int>();
    int compressed_size = data["compressedSize"].get<int>();

    const std::string compressed_data_string = data["compressedData"].get<std::string>();
    int compressed_data_length = compressed_data_string.length() * 2;
    unsigned char *compressed_data = (unsigned char *)malloc(compressed_data_length);
    if (!b64_decode((const unsigned char *)compressed_data_string.c_str(), compressed_data_string.length(), compressed_data)) {
    	free(compressed_data);
        http_error_message(handle, response, 400, "Bad Request");
    	return 1;
    }

	char *decompressed_data = (char *)malloc(decompressed_size);
	bool ok = decompress_function(format, false, 
		compressed_size, compressed_data, 
		stop_0, stop_1, 
		decompressed_size, decompressed_data);
	if (!ok) {
    	free(compressed_data);
        http_error_message(handle, response, 500, "Internal Server Error");
		return 1;
	}

	int decompressed_data_length = 2 * decompressed_size;
	unsigned char *decompressed_data_string = (unsigned char *)malloc(decompressed_data_length);
	memset(decompressed_data_string, 0, decompressed_data_length);
	if (!b64_encode((const unsigned char *)decompressed_data, decompressed_size, decompressed_data_string)) {
		free(decompressed_data_string);
		free(compressed_data);
        http_error_message(handle, response, 500, "Internal Server Error");
		return 1;
	}

	free(compressed_data);

    json result = {
        { "succeeded", true },
        { "decompressedData", (char *)decompressed_data_string }
    };

    std::string json = result.dump();

    response->set_http_header(response, "Content-Type", "application/json");
    char buffer[32] = {0};
    sprintf(buffer, "%d", json.length());
    response->set_http_header(response, "Content-Length", buffer);
    response->write_response_data(response, (char *)json.c_str(), 0, json.length());
    response->end(response);

    free(decompressed_data_string);

    return 1;

}

int gr2_custom_respond(struct server_handle *handle,
                      struct client_request *request,
                      struct client_response *response) {

    if (strcmp(request->normalized_path, "/api/decompress") == 0) {
        return decompress_gr2_data(handle, request, response);
    }

    if (strcmp(request->normalized_path, "/api/exit") == 0) {
        gr2_custom_error(handle, response, 200, "OK");
        exit(0); return 1;
    }

    return gr2_custom_error(handle, response, 404, "Not Found");

}

int gr2_custom_error(struct server_handle *handle,
                    struct client_response* response,
                    int status_code, char *message) {

    http_error_message(handle, response, status_code, message);

    return 1;

}

static char *get_path(char *target, char *extras) {

    char exe_name[MAX_PATH] = {0};
    GetModuleFileName(NULL, exe_name, MAX_PATH);


    size_t exe_name_length = strlen(exe_name);
    while ((exe_name_length >= 0) && (exe_name[exe_name_length] != '\\')) {
        --exe_name_length;
    }
    exe_name[exe_name_length + 1] = '\0';

    strcat(exe_name, extras);
    strcpy(target, exe_name);

    return target;

}

static char *get_ui_path() {

    static char ui_path[MAX_PATH] = {0};
    return get_path(ui_path, "ui");

}

int main(int argc, char **argv) {

	HMODULE hndl_granny2 = LoadLibraryA("granny2.dll");

	decompress_function = (granny_decompress)GetProcAddress(
		hndl_granny2, 
		"_GrannyDecompressData@32");

	if (!decompress_function) {
		fprintf(stderr, "API GrannyDecompressData not found\n");
		return 1;
	}

	if (argc != 2) {
		fprintf(stdout, "Usage: Start a granny2 server to decompress oodle data\n");
		fprintf(stdout, "Command: granny2_server ${port}\n");
		return 1;
	}

	int port = atoi(argv[1]);
	if (!port) {
		fprintf(stderr, "Port is needed to start granny2 server\n");
		return 1;
	}

    WSADATA wsa_data;
    WORD version_requested = MAKEWORD(2, 1);
    int err = WSAStartup(version_requested, &wsa_data);
    if (err) {
        fprintf(stderr, "Failed to startup WSA supports\n");
        return 1;
    }

	launch_gr2_server(get_ui_path(), port);

    while (1) {
        Sleep(1000);
    }

    WSACleanup();

	return 0;
}