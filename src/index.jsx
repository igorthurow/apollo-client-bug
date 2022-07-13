/*** SCHEMA ***/
import {
  GraphQLSchema,
  GraphQLObjectType,
  GraphQLID,
  GraphQLString,
  GraphQLList
} from 'graphql'

const PersonType = new GraphQLObjectType({
  name: 'Person',
  fields: {
    id: { type: GraphQLID },
    name: { type: GraphQLString }
  }
})

const peopleData = [
  { id: 1, name: 'John Smith' },
  { id: 2, name: 'Sara Smith' },
  { id: 3, name: 'Budd Deey' }
]

const QueryType = new GraphQLObjectType({
  name: 'Query',
  fields: {
    people: {
      type: new GraphQLList(PersonType),
      resolve: () => peopleData
    }
  }
})

const schema = new GraphQLSchema({ query: QueryType })

/*** LINK ***/
import { graphql, print } from 'graphql'
import { ApolloLink, Observable } from '@apollo/client'

const link = new ApolloLink((operation) => {
  return new Observable(async (observer) => {
    const { query, operationName, variables } = operation
    try {
      const result = await graphql({
        schema,
        source: print(query),
        variableValues: variables,
        operationName
      })
      observer.next(result)
      observer.complete()
    } catch (err) {
      observer.error(err)
    }
  })
})

/*** APP ***/
import { LocalForageWrapper, CachePersistor } from 'apollo3-cache-persist'
import localforage from 'localforage'
import React from 'react'
import { createRoot } from 'react-dom/client'
import {
  ApolloClient,
  ApolloProvider,
  InMemoryCache,
  gql,
  useQuery,
  useLazyQuery
} from '@apollo/client'
import './index.css'

const PersistorStorage = new LocalForageWrapper(
  localforage.createInstance({
    name: 'apollo-persistor-storage',
    storeName: 'apollo-cache'
  })
)

const ALL_PEOPLE = gql`
  query AllPeople {
    people {
      id
      name
    }
  }
`

//Simulate SSR extracted cache
const ssrExtractedCache = {
  'Person:4': {
    __typename: 'Person',
    id: '4',
    name: 'Igor Thurow'
  },
  'Person:5': {
    __typename: 'Person',
    id: '5',
    name: 'Marcel Bigode'
  },
  'Person:6': {
    __typename: 'Person',
    id: '6',
    name: 'Ed O Brabo'
  },
  ROOT_QUERY: {
    __typename: 'Query',
    people: [
      {
        __ref: 'Person:4'
      },
      {
        __ref: 'Person:5'
      },
      {
        __ref: 'Person:6'
      }
    ]
  }
}

const buildCache = async () => {
  const cache = new InMemoryCache({
    typePolicies: {
      Person: {
        fields: {
          id: {
            merge: (_, incoming) => {
              //Expect this merge function run everytime that query is called on useQuery
              //But will not run on the first render.
              console.log('expect id', incoming)

              return incoming
            }
          }
        }
      }
    }
  })

  //After you write your cache, on the first app render, please remove this NormalizedCacheObject from .restore. That will be: cache.restore() (empty)
  //Because we will already writed the cache on local, so will necessary remove this to reproduce the bug.
  //After you remove this, we will simulate the SSR return no cache, and the expected is request occurs normally on client and normalize the data. But not occurs.
  cache.restore(ssrExtractedCache)
  const initialInMemoryCache = cache.extract()

  const cachePersistor = new CachePersistor({
    cache,
    storage: PersistorStorage,
    maxSize: false
  })

  await cachePersistor.restore()

  //Merge incoming ssr extracted data with stale persisted cache
  if (Object.keys(initialInMemoryCache).length) {
    const persistedCache = cache.extract()
    const buildedCache = { ...persistedCache, ...initialInMemoryCache }

    cache.restore(buildedCache)

    await cachePersistor.persist()
  }

  return cache
}

//ssrForceFetchDelay and ssrMode is necessary because we have a hybrid render application, and ssr will make requests and pass to client hydrate.
//But the expected is should not skip first request when we have cached data that coming from local, not ssr.
//If change ssrForceFetchDelay to 0 the bug will not occurs anymore.
const buildClient = async (ssrMode = false) =>
  new ApolloClient({
    cache: await buildCache(),
    link,
    ssrForceFetchDelay: ssrMode ? 0 : 1000,
    ssrMode
  })

function App() {
  const { data, loading } = useQuery(ALL_PEOPLE, {
    fetchPolicy: 'cache-and-network',
    errorPolicy: 'none'
  })
  const [fetch] = useLazyQuery(ALL_PEOPLE, {
    fetchPolicy: 'cache-and-network',
    errorPolicy: 'none'
  })

  return (
    <main>
      <h1>Apollo Client Issue Reproduction</h1>
      {!loading &&
        data.people.map(({ id, name }) => (
          <h2 key={id}>
            {id}
            {name}
          </h2>
        ))}
      <button onClick={fetch}>fetch</button>
    </main>
  )
}

const container = document.getElementById('root')
const root = createRoot(container)
buildClient().then((client) =>
  root.render(
    <ApolloProvider client={client}>
      <App />
    </ApolloProvider>
  )
)
