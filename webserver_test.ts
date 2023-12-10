import { 
   assertEquals, 
   assertStringIncludes,
   fail
} from './deps.ts'
import { 
   LUCKY_NUMBER_TABLE, 
   createNewLuckyNumber,
   getCurrentLuckyNumber, 
   getKv,  
   setCurrentLuckyNumber,  
   startDailyPresentServer 
} from './webserver.ts'

Deno.test('Calling startDailyPresentServer should return expected result', async () => {
   await deleteExistingLuckyNumberInDatabase()
   const kv = await getKv()
   
   // Start webserver
   const abortController = new AbortController()
   const server = await startDailyPresentServer({
      port: 7035,
      signal: abortController.signal,
   })

   //Test currentLuckyNumber before ChangeListener is active 
   assertEquals(getCurrentLuckyNumber(), '' )

   // Test page without available lucky number
   let response = await fetch('http://localhost:7035/')
   assertEquals(response.status, 200)
   let responseAsText = await response.text()
   assertStringIncludes(responseAsText, 'Polly Warmheart')
   assertStringIncludes(responseAsText, 'Not yet selected!')

   // Simulate cronjob by generating new lucky number
   await createNewLuckyNumber()
   const newLuckyNumber = await kv.get<string>([LUCKY_NUMBER_TABLE])
   if (newLuckyNumber.value) {
      setCurrentLuckyNumber(newLuckyNumber.value)
      assertEquals(newLuckyNumber.value, getCurrentLuckyNumber() )
   } else {
      fail('Should find newly create lucky number in database but did not!')
   }
  
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

   abortController.abort()
   await server.finished
   
   await kv.close()
})

async function deleteExistingLuckyNumberInDatabase() {
   const kv = await getKv()
   kv.delete([LUCKY_NUMBER_TABLE])
}
