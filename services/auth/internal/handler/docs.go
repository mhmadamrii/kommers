package handler

import (
	"net/http"

	"github.com/0xfaidev3/kommers/services/auth/api"
)

// swaggerUIPage loads Swagger UI from a CDN rather than vendoring the
// bundle — trades an internet dependency for zero extra repo weight/deps,
// acceptable for a local dev/testing tool.
const swaggerUIPage = `<!DOCTYPE html>
<html>
<head>
  <title>Auth Service API</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    window.onload = () => {
      SwaggerUIBundle({ url: "/openapi.yaml", dom_id: "#swagger-ui" });
    };
  </script>
</body>
</html>
`

func ServeAPIDocs(w http.ResponseWriter, _ *http.Request) {
	w.Header().Set("Content-Type", "text/html")
	_, _ = w.Write([]byte(swaggerUIPage))
}

func ServeOpenAPISpec(w http.ResponseWriter, _ *http.Request) {
	w.Header().Set("Content-Type", "application/yaml")
	_, _ = w.Write(api.OpenAPISpec)
}
