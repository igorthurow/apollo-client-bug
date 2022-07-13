# Reproduction Steps

1. After cloning, install all dependencies with `npm install`.
2. Start the development server with `npm start`.
3. Render first time and look the console to see the merge function not called.
4. Remove the simulation of ssr data and reload the page on line 144.
5. Check that the merge function is not called yet but we dont have "ssr data" anymore.

# Considerations

The bug seems related with `ssrForceFetchDelay`, that interprets the data coming from persistence is same SSR and so skip the first request.
