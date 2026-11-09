import { ApolloClient, HttpLink, InMemoryCache, from } from '@apollo/client'
import { CombinedGraphQLErrors } from '@apollo/client/errors'
import { setContext } from '@apollo/client/link/context'
import { onError } from '@apollo/client/link/error'
import { Observable } from '@apollo/client/utilities'
import { getAccessToken } from './accessTokenStore'
import { refreshOnce } from './refreshSession'

const graphqlUrl =
  import.meta.env.VITE_GRAPHQL_URL ?? 'http://localhost:5000/graphql'

const authLink = setContext((_, { headers }) => {
  const token = getAccessToken()
  return {
    headers: {
      ...headers,
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
  }
})

const httpLink = new HttpLink({ uri: graphqlUrl, credentials: 'include' })

const errorLink = onError(({ error, operation, forward }) => {
  if (!CombinedGraphQLErrors.is(error)) {
    return
  }
  const unauthenticated = error.errors.some(
    (graphQLError) => graphQLError.extensions?.code === 'UNAUTHENTICATED',
  )
  if (!unauthenticated || operation.getContext().authRetried) {
    return
  }

  return new Observable((observer) => {
    void refreshOnce().then((ok) => {
      if (!ok) {
        observer.error(new Error('Sesión expirada'))
        return
      }
      operation.setContext({ ...operation.getContext(), authRetried: true })
      forward(operation).subscribe(observer)
    })
  })
})

export const apolloClient = new ApolloClient({
  link: from([errorLink, authLink, httpLink]),
  cache: new InMemoryCache(),
})
