export function requireFetchSecret(request: Request) {
  const fetchSecret = process.env.ADMIN_FETCH_SECRET

  if (!fetchSecret) {
    return Response.json(
      { success: false, error: 'ADMIN_FETCH_SECRET fehlt' },
      { status: 500 }
    )
  }

  const authHeader = request.headers.get('authorization')
  const expectedHeader = `Bearer ${fetchSecret}`

  if (authHeader !== expectedHeader) {
    return Response.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    )
  }

  return null
}
