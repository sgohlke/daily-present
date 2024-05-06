import { assertEquals, assertStringIncludes } from './dev_deps.ts'
import {
   createNewLuckyNumber,
   getCurrentLuckyNumber,
   getKv,
   LUCKY_NUMBER_TABLE,
   setCurrentLuckyNumber,
   startDailyPresentServer,
} from './webserver.ts'

Deno.test('Calling startDailyPresentServer should return expected result', async () => {
   const abortController = new AbortController()
   const kv = await getKv()

   // Start webserver
   const server = await startDailyPresentServer({
      port: 7035,
      signal: abortController.signal,
   })

   try {
      await deleteExistingLuckyNumberInDatabase()

      //Test currentLuckyNumber before ChangeListener is active
      const currentLuckyNumber = getCurrentLuckyNumber()
      assertEquals(currentLuckyNumber.length, 10)

      // Test page without available lucky number
      let response = await fetch('http://localhost:7035/')
      assertEquals(response.status, 200)
      let responseAsText = await response.text()
      assertStringIncludes(responseAsText, 'Polly Warmheart')
      assertStringIncludes(responseAsText, currentLuckyNumber)

      // Simulate cronjob by generating new lucky number

      const newLuckyNumber = await createNewLuckyNumber()
      setCurrentLuckyNumber(newLuckyNumber)
      assertEquals(newLuckyNumber, getCurrentLuckyNumber())

      // Test page with available lucky number
      response = await fetch('http://localhost:7035/')
      assertEquals(response.status, 200)
      responseAsText = await response.text()
      assertStringIncludes(responseAsText, 'Polly Warmheart')
      assertStringIncludes(responseAsText, getCurrentLuckyNumber())

      // Test OPTION request
      response = await fetch('http://localhost:7035/', {
         method: 'OPTIONS',
         headers: { 'Origin': 'test' },
      })
      assertEquals(response.status, 200)
      assertEquals(response.headers.get('Access-Control-Allow-Origin'), 'test')
      const responseText = await response.text()
      assertEquals(responseText, '')

      // Test non available route
      response = await fetch('http://localhost:7035/doesnotexist')
      assertEquals(response.status, 404)
      const responseAsJson = await response.json()
      assertEquals(responseAsJson.error, 'Not found: /doesnotexist')
   } catch (error) {
      console.log('Error in test', error)
      throw error
   } finally {
      abortController.abort()
      await server.finished
      await kv.close()
   }
})

Deno.test('CreateNewLuckyNumber should return empty string if new number cannot be stored in DB', async () => {
   const result = await createNewLuckyNumber(
      () => {
         throw new Error('A test error')
      },
   )
   assertEquals(result, '')
})

async function deleteExistingLuckyNumberInDatabase() {
   const kv = await getKv()
   kv.delete([LUCKY_NUMBER_TABLE])
}
