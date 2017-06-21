'use strict'

import * as Hapi from 'hapi'
import * as pg from 'pg'
const SQL = require('sql-template-strings') // lacks types

// note: all config is optional and the environment variables
// will be read if the config is not present
const pgConfig = {
  // user: 'foo', // env var: PGUSER
  database: 'appdb', // env var: PGDATABASE
  // password: 'secret', // env var: PGPASSWORD
  host: 'localhost', // Server hosting the postgres database
  port: 5432, // env var: PGPORT
  max: 10, // max number of clients in the pool
  idleTimeoutMillis: 30000, // how long a client is allowed to remain idle before being closed
}

// this initializes a connection pool
// it will keep idle connections open for idleTimeoutMillis
// and set a limit of maximum 10 idle clients
const pool = new pg.Pool(pgConfig)

pool.on('error', function (err, client) {
  // if an error is encountered by a client while it sits idle in the pool
  // the pool itself will emit an error event with both the error and
  // the client which emitted the original error
  // this is a rare occurrence but can happen if there is a network partition
  // between your application and the database, the database restarts, etc.
  // and so you might want to handle it and at least log it out
  console.error('idle client error', err.message, err.stack);
})

// Create a server with a host and port
const server: Hapi.Server = new Hapi.Server()
server.connection({
  host: 'localhost',
  port: 8000,
})

// Add the routes
server.route({
  method: 'GET',
  path:'/tasks',
  handler: (request: Hapi.Request, reply: Hapi.ReplyNoContinue) =>
    pool.query(
      SQL`SELECT * FROM tasks WHERE is_completed = false`,
      (err, res) => {
        if (err) {
          return console.error('error running query', err)
        }
        reply(res.rows)
      }
    )
})


server.route({
  method: 'GET',
  path:'/',
  handler: (request: Hapi.Request, reply: Hapi.ReplyNoContinue) =>
    reply({ body: 'Hello, world' }),
})

server.route({
  method: 'GET',
  path: '/{name}',
  handler: (request: Hapi.Request, reply: Hapi.ReplyNoContinue) =>
    reply({ body: `Hello, ${encodeURIComponent(request.params.name)}!` }),
})

// Start the server
server.start((err) => {
  if (err) {
    throw err
  }

  console.log('Server running at:', server.info.uri)
})
