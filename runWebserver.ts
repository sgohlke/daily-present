import { listenToLuckyNumberChanges, startDailyPresentServer } from './webserver.ts'

startDailyPresentServer({ port: 3018 })
await listenToLuckyNumberChanges()