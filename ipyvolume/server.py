import sys
import os
from http.server import HTTPServer, SimpleHTTPRequestHandler
import ssl


def main(args=sys.argv):
    os.system("openssl req -nodes -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -subj '/CN=mylocalhost'")
    port = 443
    httpd = HTTPServer(('0.0.0.0', port), SimpleHTTPRequestHandler)
    httpd.socket = ssl.wrap_socket(httpd.socket, keyfile='key.pem', certfile="cert.pem", server_side=True)
    print(f"Server running on https://0.0.0.0:{port}")
    httpd.serve_forever()


if __name__ == "__main__":
    main()
