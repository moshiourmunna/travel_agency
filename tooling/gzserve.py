# Static server with gzip + cache headers, approximating production hosting (for Lighthouse). usage: python3 gzserve.py <port> <dir>
import gzip, http.server, os, sys
class H(http.server.SimpleHTTPRequestHandler):
    def send_head(self):
        path = self.translate_path(self.path)
        if os.path.isdir(path): path = os.path.join(path, 'index.html')
        if 'gzip' in self.headers.get('Accept-Encoding', '') and path.endswith(('.html', '.css', '.js', '.svg', '.json', '.xml')) and os.path.isfile(path):
            data = gzip.compress(open(path, 'rb').read(), 6)
            self.send_response(200); self.send_header('Content-Type', self.guess_type(path)); self.send_header('Content-Encoding', 'gzip')
            self.send_header('Content-Length', str(len(data))); self.send_header('Cache-Control', 'public, max-age=31536000' if '/assets/' in path else 'no-cache'); self.end_headers()
            import io; return io.BytesIO(data)
        return super().send_head()
    def end_headers(self):
        if '/assets/' in self.path and not self._headers_buffer[-1:] == [b'']: pass
        super().end_headers()
    def log_message(self, *a): pass
os.chdir(sys.argv[2]); http.server.ThreadingHTTPServer(('127.0.0.1', int(sys.argv[1])), H).serve_forever()
