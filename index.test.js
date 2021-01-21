const errortrap = require('./index.js')

// https://github.com/facebook/jest/issues/5620
// not sure how to test this with jest...

test('doesnt crash', async () => {
  errortrap()
})

