#ifndef http_fs_h
#define http_fs_h

#include <stdio.h>

#ifdef __cplusplus
extern "C" {
#endif

struct http_file_state {
    
    char file_type;
    
    unsigned long long inode;
    
    long long file_size;
    
    long last_modified_date;
    
};

struct http_fs {
    
    char *base_path;
    
    void *extra_data;
    
    int (*get_file_state)(struct http_fs *fs, char *file_path, struct http_file_state *state);
    
    char *(*get_real_file_path)(struct http_fs *fs, char *file_path);
    
    void *(*open_file)(struct http_fs *fs, char *file_path);
    
    int (*seek_file)(void *file, long offset);
    
    size_t (*read_file)(void *file, char *buffer, size_t size);
    
    int (*close_file)(void *file);

    void (*destroy)(struct http_fs *fs);
    
};

#ifdef __cplusplus
}
#endif

#endif
