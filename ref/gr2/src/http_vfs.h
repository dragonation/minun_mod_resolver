#ifndef http_vfs_h
#define http_vfs_h

#include "http_fs.h"

#ifdef __cplusplus
extern "C" {
#endif

extern struct http_fs *http_vfs(struct http_fs *fs, char *base_path);
extern void destroy_http_vfs(struct http_fs *fs);

#ifdef __cplusplus
}
#endif

#endif
