import { createHandler, StartServer } from "@solidjs/start/server";

// mode: "async" instead of the default "stream".
//
// Streaming emits <div id="app"> empty, parks a <template> placeholder in
// it, and pushes the real markup after </html> for a client script to move
// into place. Anything that doesn't execute that script — a crawler, a
// link-preview bot, curl, DevTools' Preview pane — therefore sees a blank
// page. Since every route here fetches through the API before it has
// anything to show, that placeholder is what SSR produced for effectively
// every request.
//
// "async" waits for Suspense to settle and sends one complete document, so
// the HTML is meaningful without JS. The trade is TTFB: the response is
// held for the slowest query in the tree rather than streamed in pieces.
export default createHandler(
  () => (
    <StartServer
      document={({ assets, children, scripts }) => (
        <html lang="en">
          <head>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1" />
            <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
            <link rel="preconnect" href="https://fonts.googleapis.com" />
            <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
            <link
              href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400&display=swap"
              rel="stylesheet"
            />
            {assets}
          </head>
          <body>
            <div id="app">{children}</div>
            {scripts}
          </body>
        </html>
      )}
    />
  ),
  { mode: "async" },
);
