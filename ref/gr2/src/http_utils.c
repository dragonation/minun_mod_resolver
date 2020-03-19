#include "http_utils.h"

#include <ctype.h>

#include <stdio.h>
#include <stdlib.h>

#include <errno.h>

#include <time.h>


char is_whitespace(char character) {

    switch (character) {

    case 9:
    case 10:
    case 11:
    case 12:
    case 13:
    case 32: {
        return 1;
    }

    default: {
        return 0;
    }

    }

}

void lower_case(char *destination, char *source, size_t length) {

    int looper = 0;
    while (looper < length) {
        destination[looper] = tolower(source[looper]);
        ++looper;
    }

}

char *new_lower_case(char *text) {

    size_t length = strlen(text);

    char *lower_case_text = calloc(length + 1, sizeof(char));
    memset(lower_case_text, 0, length + 1);

    lower_case(lower_case_text, text, length);

    lower_case_text[length] = '\0';

    return lower_case_text;

}

struct range parse_word(char *buffer, ssize_t offset, ssize_t size) {

    struct range result = { -1, 0 };

    ssize_t looper = offset;
    while ((looper < size) && (!result.length)) {

        if ((result.offset == -1) && (!is_whitespace(buffer[looper]))) {
            result.offset = looper;
        }

        if ((result.offset != -1) && is_whitespace(buffer[looper])) {
            result.length = looper - result.offset;
        }

        ++looper;
    }

    return result;

}

char *new_slice_text(char *text, struct range range) {

    if ((range.offset >= 0) && (range.length > 0)) {

        char *slice = calloc(range.length + 1, sizeof(char));
        memset(slice, 0, range.length + 1);
        if (slice) {
            strncpy(slice, &text[range.offset], range.length);
            slice[range.length] = '\0';
        }

        return slice;
    }
    else {
        return NULL;
    }

}

int delete_text(char *text) {
    if (text) {
        free(text); return 1;
    }
    else {
        return 0;
    }
}

char *new_text(char *text) {

    ssize_t length = strlen(text);

    char *new_text = calloc(length + 1, sizeof(char));
    memset(new_text, 0, length + 1);
    if (new_text) {
        strncpy(new_text, text, length);
        new_text[length] = '\0';
    }

    return new_text;
}

char is_root_path(char *path) {
    if ((path[0] == '/') || (path[0] == '\\')) {
        return 1;
    }
    else if ((path[1] == ':') && ((path[2] == '/') || (path[2] == '\\'))) {
        return 1;
    }
    else {
        return 0;
    }
}

char *new_normalized_path(char *path, char is_windows, char need_dot) {

    ssize_t path_length = strlen(path);

    char *new_path = calloc(path_length + 2, sizeof(char));
    memset(new_path, 0, path_length + 2);

    ssize_t offset = 0;

    if ((path[0] == '/') || (path[0] == '\\')) {
        new_path[0] = '/';
        ++offset;
    }

    ssize_t looper = 0;
    while (looper < path_length) {

        if (path[looper] == '.') {

            if ((looper == path_length - 1) || ((looper < path_length - 1) && ((path[looper + 1] == '/') || (path[looper + 1] == '\\')))) {

                looper += 2;

            }
            else if (((looper == path_length - 2) && (path[looper + 1] == '.')) ||
                ((looper < path_length - 2) && (path[looper + 1] == '.') && ((path[looper + 2] == '/') || (path[looper + 2] == '\\')))) {

                looper += 3;

                offset -= 2;
                while ((offset >= 0) && (new_path[offset] != '/') && (new_path[offset] != '\\')) {
                    --offset;
                }

                ++offset;

                if (offset < 0) {
                    delete_text(new_path); return NULL;
                }

            }
            else {

                while ((looper < path_length) && (path[looper] != '/') && (path[looper] != '\\')) {
                    new_path[offset] = path[looper];
                    ++offset;
                    ++looper;
                }

                new_path[offset] = is_windows ? '\\' : '/';
                ++offset;

            }

        }
        else if ((path[looper] == '/') || (path[looper] == '\\')) {

            while ((looper < path_length) && ((path[looper] == '/') || (path[looper] == '\\'))) {
                ++looper;
            }

        }
        else {

            while ((looper < path_length) && (path[looper] != '/') && (path[looper] != '\\')) {
                new_path[offset] = path[looper];
                ++offset;
                ++looper;
            }

            new_path[offset] = is_windows ? '\\' : '/';
            ++offset;

        }

    }

    while ((offset > 1) && ((new_path[offset - 1] == '/') || (new_path[offset - 1] == '\\'))) {
        --offset;
    }

    if ((offset == 2) && (new_path[1] == ':') && is_windows) {
        new_path[offset] = '\\';
        ++offset;
    }

    if (need_dot && (offset == 0)) {
        new_path[offset] = '.';
        ++offset;
    }

    new_path[offset] = '\0';

    if (is_root_path(path) ^ is_root_path(new_path)) {
        delete_text(new_path); return NULL;
    }

    return new_path;
}

void decode_url(char *result, const char *source) {

    char a, b;
    while (*source) {
        if ((*source == '%') &&
            ((a = source[1]) && (b = source[2])) &&
            (isxdigit(a) && isxdigit(b))) {
            if (a >= 'a')
                a -= 'a' - 'A';
            if (a >= 'A')
                a -= ('A' - 10);
            else
                a -= '0';
            if (b >= 'a')
                b -= 'a' - 'A';
            if (b >= 'A')
                b -= ('A' - 10);
            else
                b -= '0';
            *result++ = 16 * a + b;
            source += 3;
        }
        else if (*source == '+') {
            *result++ = ' ';
            source++;
        }
        else {
            *result++ = *source++;
        }
    }

    *result++ = '\0';

}

int hash_code(char *text) {

    size_t length = strlen(text);

    if (!length) {
        return 0;
    }

    int result = 0;

    int looper = 0;
    while (looper < length) {

        result = (((result << 5) - result) + text[looper]) | 0;

        ++looper;
    }

    return result;

}

int suspend(long microseconds) {

#ifndef _MSC_VER

    struct timespec time;

    time.tv_sec = 0;
    time.tv_nsec = microseconds * 1000;

    char finished = 0;
    do {
        if (nanosleep(&time, &time) != 0) {
            if (errno != EINTR) {
                return -1;
            }
        }
        else {
            finished = 1;
        }
    } while ((!finished) && ((time.tv_sec > 0) || (time.tv_nsec > 0)));

    return 0;

#else

    Sleep(microseconds / 1000);

    return 0;

#endif

}
