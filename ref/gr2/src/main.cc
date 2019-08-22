#include <stdio.h>
#include <stdlib.h>

#include <windows.h>

typedef bool(__stdcall *granny_decompress)(
	int format, 
	bool file_is_byte_reversed, 
	int compressed_bytes_size, 
	void *compressed_bytes, 
	int stop_0, int stop_1, 
	int decompressed_bytes_size, 
	void *decompressed_bytes);

int main(int argc, char **argv) {

	HMODULE hndl_granny2 = LoadLibraryA("granny2.dll");
	granny_decompress decompress_function = (granny_decompress)GetProcAddress(
		hndl_granny2, 
		"_GrannyDecompressData@32");

	if (!decompress_function) {
		fprintf(stderr, "API GrannyDecompressData not found\n");
		return 1;
	}

	int format = atoi(argv[1]);
	int stop_0 = atoi(argv[2]);
	int stop_1 = atoi(argv[3]);
	int decompressed_size = atoi(argv[4]);

	int compressed_size = atoi(argv[5]);

	fprintf(stderr, "%d\n", decompressed_size);

	FILE *compressed_file = fopen(argv[6], "rb");

	void *compressed_bytes = malloc(compressed_size);
	size_t read = fread(compressed_bytes, sizeof(char), compressed_size, compressed_file);
	fclose(compressed_file);
	if (read != compressed_size) {
		fprintf(stderr, "Input size is not correct: %d, expected %d, %d\n", read, compressed_size);
		return 1;
	}

	void *decompressed_bytes = malloc(decompressed_size);
	bool ok = decompress_function(format, false, 
		compressed_size, compressed_bytes, 
		stop_0, stop_1, 
		decompressed_size, decompressed_bytes);
	if (!ok) {
		fprintf(stderr, "Failed to decompress data\n");
		return 1;
	}

	FILE *decompressed_file = fopen(argv[7], "wb");

	fwrite(decompressed_bytes, sizeof(char), decompressed_size, decompressed_file);

	fclose(decompressed_file);

	return 0;
}