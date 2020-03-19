#include "http_uifs.h"

#include <stdlib.h>

#ifndef _MSC_VER
    #include <strings.h>
#endif

#include <string.h>

#include <sys/stat.h>

struct http_uifs_file {
    long offset;
    struct http_uifs_item *item;
};

int get_hash_code(char *file_path) {

    size_t length = strlen(file_path);
    if (length == 0) {
        return 0;
    }

    int result = 0;

    int looper = 0;
    while (looper < length) {

        result = ((((result << 5) - result) + (unsigned char)(file_path[looper])) | 0) & 0xFFFF;

        ++looper;
    }

    return result;

}

struct http_uifs_item *get_uifs_file_item(struct http_fs *fs, char *file_path) {

    if (file_path[0] == '/') {
        ++file_path;
    }

    struct http_uifs *uifs = fs->extra_data;

    int hash_code = get_hash_code(file_path);
    struct http_uifs_item *item = uifs->tables[hash_code];

    while (item && (strcmp(item->file_path, file_path) != 0)) {
        item = item->next;
    }
    return item;

}

int get_uifs_file_state(struct http_fs *fs, char *file_path, struct http_file_state *state) {

    if (strcmp(file_path, "/") == 0) {

        state->inode = 0;
        state->file_type = 0;

        state->last_modified_date = 0;

        state->file_size = 0;

        return 0;

    } else {

        struct http_uifs_item *item = get_uifs_file_item(fs, file_path);

        if (item) {

            state->inode = item->file_offset;
            state->file_type = item->file_type;

            state->last_modified_date = item->last_modified_date;

            state->file_size = item->file_size;

            return 0;

        } else {
            return -1;
        }

    }

}

char *get_uifs_real_file_path(struct http_fs *fs, char *file_path) {

    if (strcmp(file_path, "/") == 0) {

        return file_path;

    } else {

        struct http_uifs_item *item = get_uifs_file_item(fs, file_path);

        if (item->file_type == 2) {
            return item->file_content;
        } else {
            return file_path;
        }

    }

    return file_path;
}

void *open_uifs_file(struct http_fs *fs, char *file_path) {

    struct http_uifs_item *item = get_uifs_file_item(fs, file_path);

    if (item) {

        struct http_uifs_file *file = malloc(sizeof(struct http_uifs_file));
        memset(file, 0, sizeof(struct http_uifs_file));
        if (file) {
            file->item = item;
            file->offset = 0;
        }

        return file;

    } else {
        return NULL;
    }

}

int seek_uifs_file(void *file, long offset) {

    struct http_uifs_file *uifs_file = file;

    if ((offset < uifs_file->item->file_size) && (offset >= 0)) {

        uifs_file->offset = offset;

        return 0;

    } else {
        return -1;
    }

}

size_t read_uifs_file(void *file, char *buffer, size_t size) {

    struct http_uifs_file *uifs_file = file;

    if (uifs_file->offset + size >= uifs_file->item->file_size) {
        size = uifs_file->item->file_size - uifs_file->offset;
    }

    if (size > 0) {

        memcpy(buffer, uifs_file->item->file_content + uifs_file->offset, size);

        uifs_file->offset += size;

        return size;

    } else {
        return 0;
    }

}

int close_uifs_file(void *file) {

    free(file);

    return 0;

}

unsigned long read_number_le(char *buffer, size_t offset, int count) {

    unsigned long number = 0;

    while (count > 0) {
        --count;
        number = (number << 8) | (unsigned char)buffer[offset + count];
    }

    return number;
}

void destroy_http_uifs(struct http_fs *fs) {

    fs->base_path = NULL;

    if (fs->extra_data) {

        struct http_uifs *uifs = fs->extra_data;

        free(uifs->buffer);

        int looper = 0;
        while (looper < 0xffff) {

            struct http_uifs_item *item = uifs->tables[looper];
            while (item) {
                struct http_uifs_item *next = item->next;
                free(item);
                item = next;
            }

            ++looper;
        }

        free(fs->extra_data);
        fs->extra_data = NULL;
    }

    fs->get_file_state = NULL;

    fs->get_real_file_path = NULL;

    fs->open_file = NULL;

    fs->seek_file = NULL;

    fs->read_file = NULL;

    fs->close_file = NULL;

}

struct http_fs *http_uifs(struct http_fs *fs, char *base_path) {

    struct stat file_state;
    if (stat(base_path, &file_state) == 0) {

        fs->base_path = base_path;

        struct http_uifs *uifs = malloc(sizeof(struct http_uifs));
        fs->extra_data = uifs;

        memset(uifs, 0, sizeof(struct http_uifs));

        FILE *file = fopen(base_path, "r");
        if (!file) {
            fs->base_path = NULL; fs->extra_data = NULL; free(uifs); return NULL;
        }

        uifs->buffer = malloc(file_state.st_size);
        memset(uifs->buffer, 0, file_state.st_size);
        if (fread(uifs->buffer, sizeof(char), file_state.st_size, file) != file_state.st_size) {
            fs->base_path = NULL; fs->extra_data = NULL; free(uifs->buffer); free(uifs); return NULL;
        }
        if (fclose(file)) {
            fs->base_path = NULL; fs->extra_data = NULL; free(uifs->buffer); free(uifs); return NULL;
        }

        size_t offset = 0;

        unsigned short rest = read_number_le(uifs->buffer, offset, 2); offset += 2;
        while (rest > 0) {
            --rest;

            unsigned short hash_code = read_number_le(uifs->buffer, offset, 2); offset += 2;

            unsigned short file_count = read_number_le(uifs->buffer, offset, 2); offset += 2;

            struct http_uifs_item *last_item = NULL;

            while (file_count > 0) {

                --file_count;

                struct http_uifs_item *item = malloc(sizeof(struct http_uifs_item));
                memset(item, 0, sizeof(struct http_uifs_item));
                item->next = NULL;
                if (!last_item) {
                    uifs->tables[hash_code] = item;
                } else {
                    last_item->next = item;
                }

                last_item = item;

                item->file_path = ((char *)uifs->buffer) + read_number_le(uifs->buffer, offset, 4); offset += 4;
                item->file_type = read_number_le(uifs->buffer, offset, 1); ++offset;

                if (item->file_type != 0) {
                    item->file_offset = read_number_le(uifs->buffer, offset, 4); offset += 4;
                    item->file_content = ((char *)uifs->buffer) + item->file_offset;
                    item->file_size = read_number_le(uifs->buffer, offset, 4); offset += 4;
                    item->last_modified_date = read_number_le(uifs->buffer, offset, 4); offset += 4;
                } else {
                    item->file_content = NULL;
                    item->file_offset = 0;
                    item->file_size = 0;
                    item->last_modified_date = 0;
                }

            }

        }

        fs->get_file_state = &get_uifs_file_state;

        fs->get_real_file_path = &get_uifs_real_file_path;

        fs->open_file = &open_uifs_file;

        fs->seek_file = &seek_uifs_file;

        fs->read_file = &read_uifs_file;

        fs->close_file = &close_uifs_file;

        fs->destroy = &destroy_http_uifs;

        return fs;

    } else {
        return NULL;
    }

}
