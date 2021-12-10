Library used: https://github.com/imagemin/imagemin-webp
Settings:
```
    imageminWebp(
        {
            lossless: true,
            alphaQuality: 100,
            quality: 100
        }
    )
```


Network profile 10Mb/s up and down. 50ms latency

WebP:
643 network requests
Size (uncompressed): 29.8 MB (3.9MB are Webp)
Desktop load times: 27.24s 26.87s 27.45s

PNG:
644 network requests
Size (uncompressed): 34.2 MB (8.1MB are PNG)
Desktop load times: 28.84s 28.76s 28.44s

Can't load the full game on mobile (Google Pixel 2) due to server issues

WebP:
159 network requests
Size (uncompressed): 11.6 MB (2.4MB are Webp)
Mobile load times: 10.8s 10.81s 10.76s

PNG:
159 network requests
Size (uncompressed): 14.8 MB (5.6MB are PNG)
Mobile load times: 14.64s 13.37s 13.37s
