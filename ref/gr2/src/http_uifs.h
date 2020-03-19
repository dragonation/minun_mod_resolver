#ifndef http_ui_h
#define http_ui_h

#include "http_fs.h"

#ifdef __cplusplus
extern "C" {
#endif

struct http_uifs_item {

    char *file_path;
    char file_type;

    unsigned long file_offset;
    char *file_content;
    size_t file_size;

    unsigned long last_modified_date;

    struct http_uifs_item *next;

};

struct http_uifs {

    void *buffer;

    struct http_uifs_item *tables[0xffff];

};

extern struct http_fs *http_uifs(struct http_fs *fs, char *base_path);
extern void destroy_http_uifs(struct http_fs *fs);

#ifdef __cplusplus
}
#endif

#endif
