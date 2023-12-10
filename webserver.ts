import { JSON_CONTENT_TYPE_HEADER, logAndReturnErrorResponse } from './deps.ts'

export const LUCKY_NUMBER_TABLE = 'luckynumber'

let kvInstance: Deno.Kv
let currentLuckyNumber = ''

function generateRandomNumber() {
   const randomNumber = Math.random() * 10
   return Math.floor(randomNumber)
}

export async function createNewLuckyNumber() {
   let newLuckyNumber = ''
   for (let index = 0; index < 10; index++) {
      newLuckyNumber += generateRandomNumber()
   }
   const kv = await getKv()
   const result = await kv.set([LUCKY_NUMBER_TABLE], newLuckyNumber)
   if (result.ok) {
      console.log('Written new lucky number to database', newLuckyNumber)
   } else {
      console.error('Cannot write new lucky number to database', newLuckyNumber)
   }
}

Deno.cron("Create new lucky number", "0 0 * * *", async () => {
   await createNewLuckyNumber()
});

export async function getKv() {
   if (!kvInstance) {
      kvInstance = await Deno.openKv()
   }
   return kvInstance
}

export function getCurrentLuckyNumber() {
   return currentLuckyNumber
}

export function setCurrentLuckyNumber(luckyNumber: string) {
   currentLuckyNumber = luckyNumber
}

function handleRequest(request: Request): Response {
   const responseHeaders = new Headers(JSON_CONTENT_TYPE_HEADER)
   const origin = request.headers.get('origin')
   if (origin) {
      responseHeaders.set('Access-Control-Allow-Origin', origin)
   }

   const { pathname } = new URL(request.url)
   if (request.method === 'OPTIONS') {
      return new Response(undefined, { headers: responseHeaders })
   } else if (pathname === '/' || pathname === '') {
      // Serve webpage
      responseHeaders.set('content-type', 'text/html; charset=UTF-8')
      return new Response(
      `
      <!DOCTYPE html>
      <html lang="en">
      <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta name="description" content="Daily Present">
      </head>
      <body>
      <section>
      <h1>Ho, ho, ho!</h1>
      <p>I am Santa's little helper, Polly Warmheart. I made way to many presents. We don't have enough
      space so I will give away one present a day to the one with the correct lucky number.</p>
      </section>
      <section>
      <h1>Today's lucky number is:</h1>
      <span id='luckyNumber'><b>${currentLuckyNumber || 'Not yet selected!'}</b></span>
      </section>
      </body>
      </html>
      `,
         {
            headers: responseHeaders,
         },
      )
   }
   return logAndReturnErrorResponse(
      `Not found: ${pathname}`,
      responseHeaders,
      404,
   )
}

export function startDailyPresentServer(
   options: Deno.ServeOptions | Deno.ServeTlsOptions,
): Deno.HttpServer {
   return Deno.serve(options, handleRequest)
}

export async function listenToLuckyNumberChanges() {
   //Register watch to listen to value changes
   const kv = await getKv()
   const stream = kv.watch<Array<string>>([[LUCKY_NUMBER_TABLE]]);
   for await (const entries of stream) {
      console.log('luckynumber changed', entries)
      if (entries[0].value) {
         currentLuckyNumber = entries[0].value
      }
   }
}
