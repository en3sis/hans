import { MongoClient } from 'mongodb'

export const mongoClient = new MongoClient(process.env.MONGODB_CONNECTION!)

// TODO: Fix the issue with multiple connections https://stackoverflow.com/questions/10656574/how-do-i-manage-mongodb-connections-in-a-node-js-web-application
export const foo = {
  db: undefined,
  connect: (callback) => {
    MongoClient.connect(process.env.MONGODB_CONNECTION!, function (err, data) {
      console.log('data: ', data)
      if (err) {
        callback(err)
      }

      foo.db = data
      console.log('Connected to database')
      callback(null)
    })
  },
}
