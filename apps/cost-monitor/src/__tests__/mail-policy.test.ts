import {it,expect} from "vitest";
import {selectMail,urgent,DIGEST_MS} from "../mail-policy";
import type {Notice} from "../engine";
const notice=(key:string,severity=2,kind:Notice['kind']='open'):Notice=>({key,severity,kind,id:key,text:'',delivered:[],attempts:0,expiresAt:1e15});
it('batches database, cache, reminders and recovery until the hourly digest',()=>{
 const rows=[notice('D1:db:read'),notice('KV:cache:write'),notice('Service:roast:errors',2,'reminder'),notice('D1:db:read',0,'recovery')];
 expect(selectMail(rows,0,DIGEST_MS)).toEqual([]);expect(selectMail(rows,DIGEST_MS,DIGEST_MS)).toEqual(rows);
});
it('sends severe business failures and billing risk immediately but not their repeated reminders',()=>{
 for(const key of ['Service:roast:errors','account:burn','Billing:account:daily']){
 expect(urgent(notice(key))).toBe(true);expect(urgent(notice(key,2,'reminder'))).toBe(false);expect(urgent(notice(key,1))).toBe(false);
 }
});
