import {
   listenToLuckyNumberChanges,
   startDailyPresentServer,
} from './webserver.ts'

await startDailyPresentServer({ port: 3018 })
await listenToLuckyNumberChanges()
