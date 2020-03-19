#include "http_fs.h"

#include <stdlib.h>

#ifndef _MSC_VER
#    include <strings.h>
#else
#    define S_ISDIR(m) (((m) & 0170000) == (0040000))
#endif 

#include <string.h>

#include <sys/stat.h>

void normalize_path(char *file_path) {

#ifdef _MSC_VER

    size_t length = strlen(file_path);
    size_t looper = 0;
    while (looper < length) {
        if (file_path[looper] == '/') {
            file_path[looper] = '\\';
        }
        ++looper;
    }

#endif

}

int get_vfs_file_state(struct http_fs *fs, char *file_path, struct http_file_state *state) {
    
    char *final_file_path = calloc(strlen(fs->base_path) + strlen(file_path) + 2, sizeof(char));
    memset(final_file_path, 0, strlen(fs->base_path) + strlen(file_path) + 2);
    
    strcpy(final_file_path, fs->base_path);
    strcat(final_file_path, file_path);

    normalize_path(final_file_path);

    struct stat file_state;
    if (stat(final_file_path, &file_state) == 0) {
        
        free(final_file_path);
        
        state->file_type = S_ISDIR(file_state.st_mode) ? 0 : 1;
        
        state->inode = file_state.st_ino;
        
        if (state->file_type == 1) {
            state->file_size = file_state.st_size;
        } else {
            state->file_size = 0;
        }
        
        state->last_modified_date = file_state.st_mtime;
        
        return 0;
        
    } else {
        
        free(final_file_path);
        
        return -1;
    }
    
}

char *get_vfs_real_file_path(struct http_fs *fs, char *file_path) {
    return file_path;
}

void *open_vfs_file(struct http_fs *fs, char *file_path) {
    
    char *final_file_path = calloc(strlen(fs->base_path) + strlen(file_path) + 2, sizeof(char));
    memset(final_file_path, 0, strlen(fs->base_path) + strlen(file_path) + 2);
    
    strcpy(final_file_path, fs->base_path);
    strcat(final_file_path, file_path);

    normalize_path(final_file_path);
    
    FILE *file = fopen(final_file_path, "r");
    
    free(final_file_path);
    
    return file;
    
}

int seek_vfs_file(void *file, long offset) {
    return fseek(file, offset, SEEK_SET);
}

size_t read_vfs_file(void *file, char *buffer, size_t size) {
    return fread(buffer, sizeof(char), size, file);
}

int close_vfs_file(void *file) {
    return fclose(file);
}

void destroy_http_vfs(struct http_fs *fs) {
    
    fs->base_path = NULL;
    
    fs->extra_data = NULL;
    
    fs->get_file_state = NULL;
    
    fs->get_real_file_path = NULL;
    
    fs->open_file = NULL;
    
    fs->seek_file = NULL;
    
    fs->read_file = NULL;
    
    fs->close_file = NULL;
    
}

struct http_fs *http_vfs(struct http_fs *fs, char *base_path) {
    
    fs->base_path = base_path;
    
    fs->get_file_state = &get_vfs_file_state;
    
    fs->get_real_file_path = &get_vfs_real_file_path;
    
    fs->open_file = &open_vfs_file;
    
    fs->seek_file = &seek_vfs_file;
    
    fs->read_file = &read_vfs_file;
    
    fs->close_file = &close_vfs_file;

    fs->destroy = &destroy_http_vfs;

    return fs;
}
