# Reproduction Steps

1. After cloning, install all dependencies with `npm install`.
2. Start the development server with `npm start`.
3. Renders the first time and sees on the console that it didn't print an `@@merge function called`, that is, it didn't call the merge function. This is probably because I'm simulating data coming from the SSR and using `forceFetchDelay: 1000`
4. Remove the simulation of data coming from SSR on line 144 and reload the page.
5. See in the console that it didn't print an `@@merge function called`, that is, it still hasn't called the merge function as I expected, even though it doesn't have data coming from the SSR.

# Considerations
The main code have some commentaries about some points that can help to understand the issue.

The bug seems related with `ssrForceFetchDelay`, that interprets the data coming from persistence is same as SSR and so skip the first request.
