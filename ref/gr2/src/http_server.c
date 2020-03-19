#include "http_server.h"
#include "http_utils.h"

#include "http_socket.h"

#include <assert.h>

#include <time.h>

#ifdef _MSC_VER
#    define localtime_r(A, B) localtime_s((B), (A))
#    define gmtime_r(A, B) gmtime_s((B), (A))
#endif

#define mime_length 208

const char *mimes[mime_length * 2] = {
    ".7z", "application/x-7z-compressed",
    ".aac", "audio/x-aac",
    ".ai", "application/illustrator",
    ".aif", "audio/x-aiff",
    ".aiff", "audio/x-aiff",
    ".air", "application/vnd.adobe.air-application-installer-package+zip",
    ".apk", "application/vnd.android.package-archive",
    ".asm", "text/x-asm",
    ".avi", "video/x-msvideo",
    ".bmp", "image/bmp",
    ".bz", "application/x-bzip",
    ".bz2", "application/x-bzip2",
    ".c", "text/x-c",
    ".cab", "application/vnd.ms-cab-compressed",
    ".cc", "text/x-c",
    ".chm", "application/vnd.ms-htmlhelp",
    ".class", "application/java-vm",
    ".conf", "text/plain",
    ".cpp", "text/x-c",
    ".crt", "application/x-x509-ca-cert",
    ".crx", "application/x-chrome-extension",
    ".css", "text/css",
    ".csv", "text/csv",
    ".cxx", "text/x-c",
    ".deb", "application/x-debian-package",
    ".djvu", "image/vnd.djvu",
    ".dmg", "application/x-apple-diskimage",
    ".doc", "application/msword",
    ".docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".dot", "application/msword",
    ".dotx", "application/vnd.openxmlformats-officedocument.wordprocessingml.template",
    ".dtd", "application/xml-dtd",
    ".dwg", "image/vnd.dwg",
    ".dxf", "image/vnd.dxf",
    ".ecma", "application/ecmascript",
    ".eml", "message/rfc822",
    ".eot", "application/vnd.ms-fontobject",
    ".eps", "application/postscript",
    ".epub", "application/epub+zip",
    ".f4v", "video/x-f4v",
    ".flac", "audio/x-flac",
    ".flv", "video/x-flv",
    ".gif", "image/gif",
    ".h", "text/x-c",
    ".hh", "text/x-c",
    ".hpp", "text/x-c",
    ".htm", "text/html",
    ".html", "text/html",
    ".icc", "application/vnd.iccprofile",
    ".ico", "image/x-icon",
    ".ics", "text/calendar",
    ".ini", "text/plain",
    ".jar", "application/java-archive",
    ".java", "text/x-java-source",
    ".jpeg", "image/jpeg",
    ".jpg", "image/jpeg",
    ".js", "application/javascript",
    ".json", "application/json",
    ".jsonml", "application/jsonml+json",
    ".latex", "application/x-latex",
    ".lha", "application/x-lzh-compressed",
    ".lnk", "application/x-ms-shortcut",
    ".log", "text/plain",
    ".lua", "text/x-lua",
    ".luac", "application/x-lua-bytecode",
    ".lzh", "application/x-lzh-compressed",
    ".m2a", "audio/mpeg",
    ".m2v", "video/mpeg",
    ".m3a", "audio/mpeg",
    ".m3u", "audio/x-mpegurl",
    ".m3u8", "application/vnd.apple.mpegurl",
    ".m4a", "audio/mp4",
    ".m4r", "audio/mp4",
    ".m4u", "video/vnd.mpegurl",
    ".m4v", "video/x-m4v",
    ".manifest", "text/cache-manifest",
    ".map", "application/json",
    ".mathml", "application/mathml+xml",
    ".md", "text/x-markdown",
    ".mdb", "application/x-msaccess",
    ".mid", "audio/midi",
    ".midi", "audio/midi",
    ".mkv", "video/x-matroska",
    ".mng", "video/x-mng",
    ".mobi", "application/x-mobipocket-ebook",
    ".mov", "video/quicktime",
    ".mp2", "audio/mpeg",
    ".mp2a", "audio/mpeg",
    ".mp3", "audio/mpeg",
    ".mp4", "video/mp4",
    ".mp4a", "audio/mp4",
    ".mp4v", "video/mp4",
    ".mpeg", "video/mpeg",
    ".mpg", "video/mpeg",
    ".mpga", "audio/mpeg",
    ".mpkg", "application/vnd.apple.installer+xml",
    ".nfo", "text/x-nfo",
    ".odb", "application/vnd.oasis.opendocument.database",
    ".odc", "application/vnd.oasis.opendocument.chart",
    ".odf", "application/vnd.oasis.opendocument.formula",
    ".odft", "application/vnd.oasis.opendocument.formula-template",
    ".odg", "application/vnd.oasis.opendocument.graphics",
    ".odi", "application/vnd.oasis.opendocument.image",
    ".odm", "application/vnd.oasis.opendocument.text-master",
    ".odp", "application/vnd.oasis.opendocument.presentation",
    ".ods", "application/vnd.oasis.opendocument.spreadsheet",
    ".odt", "application/vnd.oasis.opendocument.text",
    ".oga", "audio/ogg",
    ".ogg", "audio/ogg",
    ".ogv", "video/ogg",
    ".otc", "application/vnd.oasis.opendocument.chart-template",
    ".otf", "font/opentype",
    ".otg", "application/vnd.oasis.opendocument.graphics-template",
    ".oth", "application/vnd.oasis.opendocument.text-web",
    ".oti", "application/vnd.oasis.opendocument.image-template",
    ".otp", "application/vnd.oasis.opendocument.presentation-template",
    ".ots", "application/vnd.oasis.opendocument.spreadsheet-template",
    ".ott", "application/vnd.oasis.opendocument.text-template",
    ".p", "text/x-pascal",
    ".p10", "application/pkcs10",
    ".p12", "application/x-pkcs12",
    ".p7b", "application/x-pkcs7-certificates",
    ".p7c", "application/pkcs7-mime",
    ".p7m", "application/pkcs7-mime",
    ".p7r", "application/x-pkcs7-certreqresp",
    ".p7s", "application/pkcs7-signature",
    ".p8", "application/pkcs8",
    ".pas", "text/x-pascal",
    ".pcx", "image/x-pcx",
    ".pdf", "application/pdf",
    ".pfx", "application/x-pkcs12",
    ".pic", "image/x-pict",
    ".png", "image/png",
    ".pp", "text/x-pascal",
    ".pps", "application/vnd.ms-powerpoint",
    ".ppsx", "application/vnd.openxmlformats-officedocument.presentationml.slideshow",
    ".ppt", "application/vnd.ms-powerpoint",
    ".pptx", "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ".ps", "application/postscript",
    ".psd", "image/vnd.adobe.photoshop",
    ".pub", "application/x-mspublisher",
    ".qt", "video/quicktime",
    ".rar", "application/x-rar-compressed",
    ".rm", "application/vnd.rn-realmedia",
    ".rmvb", "application/vnd.rn-realmedia-vbr",
    ".rtf", "application/rtf",
    ".s", "text/x-asm",
    ".ser", "application/java-serialized-object",
    ".sh", "application/x-sh",
    ".sldx", "application/vnd.openxmlformats-officedocument.presentationml.slide",
    ".spc", "application/x-pkcs7-certificates",
    ".sql", "application/x-sql",
    ".svg", "image/svg+xml",
    ".svgz", "image/svg+xml",
    ".swf", "application/x-shockwave-flash",
    ".tar", "application/x-tar",
    ".tcl", "application/x-tcl",
    ".tex", "application/x-tex",
    ".text", "text/plain",
    ".tga", "image/x-tga",
    ".tif", "image/tiff",
    ".tiff", "image/tiff",
    ".torrent", "application/x-bittorrent",
    ".ttc", "application/x-font-ttf",
    ".ttf", "application/x-font-ttf",
    ".txt", "text/plain",
    ".udeb", "application/x-debian-package",
    ".uri", "text/uri-list",
    ".uris", "text/uri-list",
    ".urls", "text/uri-list",
    ".vcard", "text/vcard",
    ".vcf", "text/x-vcard",
    ".wav", "audio/x-wav",
    ".wbmp", "image/vnd.wap.wbmp",
    ".weba", "audio/webm",
    ".webm", "video/webm",
    ".webp", "image/webp",
    ".wks", "application/vnd.ms-works",
    ".wm", "video/x-ms-wm",
    ".wma", "audio/x-ms-wma",
    ".wmd", "application/x-ms-wmd",
    ".wmf", "application/x-msmetafile",
    ".wmv", "video/x-ms-wmv",
    ".wmx", "video/x-ms-wmx",
    ".wmz", "application/x-msmetafile",
    ".woff", "application/font-woff",
    ".woff2", "application/font-woff2",
    ".wpl", "application/vnd.ms-wpl",
    ".wps", "application/vnd.ms-works",
    ".wri", "application/x-mswrite",
    ".wsdl", "application/wsdl+xml",
    ".xap", "application/x-silverlight-app",
    ".xht", "application/xhtml+xml",
    ".xhtml", "application/xhtml+xml",
    ".xif", "image/vnd.xiff",
    ".xls", "application/vnd.ms-excel",
    ".xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ".xlt", "application/vnd.ms-excel",
    ".xltx", "application/vnd.openxmlformats-officedocument.spreadsheetml.template",
    ".xml", "application/xml",
    ".xps", "application/vnd.ms-xpsdocument",
    ".xsd", "application/xml",
    ".xsl", "application/xslt+xml",
    ".xslt", "application/xslt+xml",
    ".xul", "application/vnd.mozilla.xul+xml",
    ".yaml", "text/yaml",
    ".yml", "text/yaml",
    ".zip", "application/zip"
};

const char *default_mime = "application/octet-stream";

const char *get_mime(char *path) {

    size_t length = strlen(path);

    char found = 0;

    size_t looper = length;
    while ((looper > 0) && (!found)) {
        --looper;
        if (path[looper] == '.') {
            found = 1;
        } else if ((path[looper] == '/') || (path[looper] == '\\')) {
            found = 2;
        }
    }

    if (found != 1) {
        return default_mime;
    } else {

        char *extname = calloc(length - looper + 1, sizeof(char));
        memset(extname, 0, length - looper + 1);
        strncpy(extname, &path[looper], length - looper);

        const char *mime = NULL;
        int looper2 = 0;
        while (looper2 < mime_length) {
            if (strcmp(extname, mimes[looper2 * 2]) == 0) {
                mime = mimes[looper2 * 2 + 1];
            }
            ++looper2;
        }

        free(extname);

        if (mime == NULL) {
            return default_mime;
        } else {
            return mime;
        }

    }

}

int generate_date_head(char *buffer, int size) {

    time_t now = time(NULL);

    struct tm time_measure = {0};
    gmtime_r(&now, &time_measure);

    if (strftime(buffer, size, "%a, %e %b %Y %X %Z", &time_measure) == 0) {
        return -1;
    }

    return 0;

}

void http_error_message(struct server_handle *handle, struct client_response *response, int status_code, char *message) {

    if ((status_code / 100 >= 4) &&
        handle->custom_error &&
        handle->custom_error(handle, response, status_code, message)) {
        return;
    }

    char buffer[MAX_HEAD_BUFFER] = { 0 };
    sprintf(buffer, "%d", (int)strlen(message));

    response->set_http_status_code(response, status_code, message);

    response->set_http_header(response, "Server", "MewUI");
    response->set_http_header(response, "Content-Length", buffer);
    response->set_http_header(response, "Content-Type", "text/plain");

    if (response->request->keep_alive) {
        response->set_http_header(response, "Connection", "keep-alive");
    }

    response->write_response_data(response, message, 0, strlen(message));

    response->end(response);

}

void http_redirect(struct client_response *response, int status_code, char *message, char *location) {

    char buffer[MAX_HEAD_BUFFER];
    sprintf(buffer, "%d", (int)strlen(message));

    response->set_http_status_code(response, 301, "Moved Permanently");
    response->set_http_header(response, "Location", location);

    response->set_http_header(response, "Server", "MewUI");
    response->set_http_header(response, "Content-Length", buffer);
    response->set_http_header(response, "Content-Type", "text/plain");

    if (response->request->keep_alive) {
        response->set_http_header(response, "Connection", "keep-alive");
    }

    response->write_response_data(response, location, 0, strlen(location));

    response->end(response);

}

int get_http_resource(struct server_handle *handle, struct client_request *request, struct client_response *response) {

    if (handle->server->state != SERVER_STARTED) {
        return -1;
    }

    if (handle->custom_respond && handle->custom_respond(handle, request, response)) {
        return 0;
    }

    if (strcmp(request->lower_case_method, "get") != 0) {
        http_error_message(handle, response, 404, "Not Found");
        return 0;
    }

    struct http_fs *fs = handle->server->fs;

    ssize_t file_path_length = strlen(request->normalized_path) + 16;

    char *file_path = calloc(file_path_length, sizeof(char));
    memset(file_path, 0, file_path_length);

    strncpy(file_path, request->normalized_path, file_path_length);

    char parsed = 0;

    char gzip = 0;
    const char *mime = get_mime(file_path);

    struct http_file_state file_state = { 0 };

    if (request->path[strlen(request->path) - 1] != '/') {

        strncat(file_path, ".gz", file_path_length);

        if (fs->get_file_state(fs, file_path, &file_state) == 0) {

            if (file_state.file_type == 0) {
                file_path[strlen(file_path) - 3] = '\0';
            } else if (file_state.file_type == 2) {

                char *real_file_path = fs->get_real_file_path(fs, file_path);

                size_t location_length = strlen(real_file_path) + 2;

                char *location = calloc(location_length, sizeof(char));
                memset(location, 0, location_length);
                location[0] = '/'; location[1] = '\0';
                strncat(location, real_file_path, location_length);

                // remove .gz for redirection
                location[strlen(location) - 3] = '\0';
                http_redirect(response, 301, "Moved Permanently", location);
                delete_text(location);

                parsed = 1;

            }
            else {
                gzip = 1;
            }

        }
        else {
            file_path[strlen(file_path) - 3] = '\0';
        }

    }

    if (!parsed) {

        if (!gzip) {

            if (fs->get_file_state(fs, file_path, &file_state) == 0) {

                if (file_state.file_type == 0) {

                    if (request->path[strlen(request->path) - 1] != '/') {

                        size_t location_length = strlen(request->normalized_path) + 2;

                        char *location = calloc(location_length, sizeof(char));
                        memset(location, 0, location_length);
                        strncpy(location, request->normalized_path, location_length);
                        strncat(location, "/", location_length);

                        http_redirect(response, 301, "Moved Permanently", location);

                        delete_text(location);

                        parsed = 1;

                    } else {

                        strncat(file_path, "index.html.gz", file_path_length);
                        if ((fs->get_file_state(fs, file_path, &file_state) != 0) ||
                            (file_state.file_type == 0) ||
                            request->partial_content) {

                            file_path[strlen(file_path) - 3] = '\0';

                            if ((fs->get_file_state(fs, file_path, &file_state) != 0) || (file_state.file_type == 0)) {
                                http_error_message(handle, response, 404, "Not Found");
                                parsed = 1;
                            } else {
                                mime = "text/html";
                            }

                        } else {
                            mime = "text/html";
                            gzip = 1;
                        }

                    }

                } else if (file_state.file_type == 2) {

                    char *real_file_path = fs->get_real_file_path(fs, file_path);

                    size_t location_length = strlen(real_file_path) + 2;

                    char *location = calloc(location_length, sizeof(char));
                    memset(location, 0, location_length);
                    location[0] = '/'; location[1] = '\0';
                    strncat(location, real_file_path, location_length);

                    http_redirect(response, 301, "Moved Permanently", location);

                    delete_text(location);

                    parsed = 1;

                }

            } else {
                http_error_message(handle, response, 404, "Not Found");
                parsed = 1;
            }

        }

        if (!parsed) {
            if (request->range_start == -1) {
                request->range_start = 0;
            }

            if (file_state.file_size > 0) {

                if (request->range_end == -1) {
                    request->range_end = file_state.file_size - 1;
                }

                request->range_start = MAX(0, MIN(request->range_start, file_state.file_size - 1));
                request->range_end = MAX(0, MIN(request->range_end, file_state.file_size - 1));

            } else {
                request->range_start = -1;
                request->range_end = -1;
            }

            char buffer[MAX_HEAD_BUFFER];

            sprintf(buffer, "%llu-%lld-%ld", file_state.inode, file_state.file_size, file_state.last_modified_date);
            int etag = hash_code(buffer);

            char *last_modified_date = NULL;
            struct tm time_measure;
            if (localtime_r(&file_state.last_modified_date, &time_measure) &&
                strftime(buffer, MAX_HEAD_BUFFER, "%a, %e %b %Y %X %Z", &time_measure)) {
                last_modified_date = new_text(buffer);
            }

            char not_modified = 0;

            if (request->partial_content) {
                response->set_http_status_code(response, 206, "Partial Content");
            } else {
                if ((request->etag == etag) && last_modified_date && request->last_modified_date && (strcmp(request->last_modified_date, last_modified_date) == 0)) {
                    not_modified = 1;
                    response->set_http_status_code(response, 304, "Not Modified");
                } else {
                    response->set_http_status_code(response, 200, "OK");
                }
            }

            if (!generate_date_head(buffer, MAX_HEAD_BUFFER)) {
                response->set_http_header(response, "Date", buffer);
            }

            response->set_http_header(response, "Server", "MewUI");
            response->set_http_header(response, "Accept-Ranges", "bytes");


            if (request->partial_content && (request->range_start >= 0)) {

                sprintf(buffer, "bytes %lld-%lld/%lld", (long long)request->range_start, (long long)request->range_end, (long long)file_state.file_size);
                response->set_http_header(response, "Content-Range", buffer);

            } else {

                sprintf(buffer, "%d", etag);
                response->set_http_header(response, "ETag", buffer);

                if (last_modified_date) {
                    response->set_http_header(response, "Last-Modified", last_modified_date);
                }

            }

            delete_text(last_modified_date);

            if (!not_modified) {

                if (request->range_end == -1) {
                    response->set_http_header(response, "Content-Length", "0");
                } else {
                    sprintf(buffer, "%lld", (long long)request->range_end - request->range_start + 1);
                    response->set_http_header(response, "Content-Length", buffer);
                }

                if (gzip) {
                    response->set_http_header(response, "Content-Encoding", "gzip");
                }

            }

            response->set_http_header(response, "Content-Type", mime);

            if (request->keep_alive) {
                response->set_http_header(response, "Connection", "keep-alive");
            }

            if ((!not_modified) && (request->range_start >= 0)) {
                void *file = fs->open_file(fs, file_path);
                if (file) {

                    if ((request->range_start > 0) && (fs->seek_file(file, request->range_start))) {
                        fs->close_file(file); delete_text(file_path); return -1;
                    }

                    ssize_t rest = request->range_end - request->range_start + 1;

                    size_t read = 1;
                    while ((read > 0) && (rest > 0)) {

                        read = fs->read_file(file, buffer, MIN(MAX_HEAD_BUFFER, rest));
                        if (read > 0) {
                            rest -= read;
                            int sleep_times = 0;
                            ssize_t sent = 0;
                            while (((sent >= 0) && (sent < read)) || ((sent == -1) && (errno == EAGAIN))) {
                                ssize_t sent2 = response->write_response_data(response, buffer, sent, read - sent);
                                if (sent2 >= 0) {
                                    sleep_times = 0;
                                    sent += sent2;
                                } else {
                                    if (errno == EAGAIN) {
                                        if (sleep_times > 500 * 30) {
                                            fs->close_file(file); delete_text(file_path); return -1;
                                        } else {
                                            ++sleep_times;
                                            suspend(2000);
                                        }
                                    } else {
                                        fs->close_file(file); delete_text(file_path); return -1;
                                    }
                                }
                            }
                        }
                    }

                    fs->close_file(file);

                    response->end(response);

                    if (rest > 0) {
                        delete_text(file_path); return -1;
                    }

                }
                else {
                    delete_text(file_path); return -1;
                }
            }
        }
    }

    delete_text(file_path);

    return 0;

}

struct server *create_server(struct server *server, struct http_fs *fs, struct server_handle *handler, void *option, char suspended) {

    server->handle = handler;
    server->fs = fs;
    server->state = SERVER_SUSPENDED;

    handler->server = server;
    handler->request = &get_http_resource;

    if (SERVER_SUCCEEDED == handler->create(handler, option)) {
        if (!suspended) {
            resume_server(server);
        }
        return server;
    }

    return NULL;

}

int resume_server(struct server *server) {

    if (server->state == SERVER_SUSPENDED) {
        server->state = SERVER_STARTED;
        return server->handle->resume(server->handle);
    } else {
        return SERVER_SUCCEEDED;
    }

}

void destroy_server(struct server *server) {

    if (server->state == SERVER_STARTED) {
        server->handle->suspend(server->handle);
    }

    server->handle->destroy(server->handle);
}

int suspend_server(struct server *server) {

    if (server->state == SERVER_STARTED) {
        server->state = SERVER_SUSPENDED;
        return server->handle->suspend(server->handle);
    } else {
        return SERVER_SUCCEEDED;
    }

}
