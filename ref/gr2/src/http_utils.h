#ifndef http_utils_h
#define http_utils_h

#include <sys/types.h>

#ifndef _MSC_VER
#    include <strings.h>
#endif

#ifndef MIN
#   define MIN(A,B) ((A) > (B)) ? (B) : (A)
#endif

#ifndef MAX
#   define MAX(A,B) ((A) > (B)) ? (A) : (B)
#endif

#ifdef _MSC_VER
#   include <BaseTsd.h>
#   include <CRTDEFS.H>
#   include <Windows.h>
    typedef SSIZE_T ssize_t;
#endif

struct range {
    ssize_t offset;
    ssize_t length;
};

extern void lower_case(char *destination, char *source, size_t length);
extern char *new_lower_case(char *text);
extern struct range parse_word(char *buffer, ssize_t offset, ssize_t size);
extern char *new_slice_text(char *text, struct range range);
extern int delete_text(char *text);
extern char *new_text(char *text);
extern char is_root_path(char *path);
extern char *new_normalized_path(char *path, char is_windows, char need_dot);
extern void decode_url(char *result, const char *source);

extern int hash_code(char *text);

extern char is_whitespace(char character);

extern int suspend(long microseconds);

#endif // http_utils_h
